import { Request, Response } from 'express';
import { AppDataSource } from '../dataSource';
import { Shop } from '../entities/Shop';
import { ShopDay, SlotItem, SlotStatus } from '../entities/ShopDay';
import {
  getOrCreateTodayShopDay,
  computeLiveStatus,
  reconcileSlots,
  timeToMinutes,
  getTodayDateString,
} from '../services/slotService';
import { processVoiceCommand } from '../services/voiceAssistantService';
import { broadcastToShop } from '../sockets';

export async function getPublicShops(req: Request, res: Response): Promise<void> {
  try {
    const shopRepo = AppDataSource.getRepository(Shop);
    const shops = await shopRepo.find({
      relations: { owner: true },
      order: { name: 'ASC' },
    });

    const results = await Promise.all(
      shops.map(async (shop) => {
        const todayDay = await getOrCreateTodayShopDay(shop);
        const live = computeLiveStatus(shop, todayDay.slots);
        return {
          id: shop.id,
          name: shop.name,
          category: shop.category,
          area: shop.area,
          phone: shop.phone,
          workingHoursStart: shop.workingHoursStart,
          workingHoursEnd: shop.workingHoursEnd,
          slotDurationMinutes: shop.slotDurationMinutes,
          status: live.status,
          nextAvailableSlot: live.nextAvailableSlot,
          availableCount: live.availableCount,
          bookedCount: live.bookedCount,
          closedCount: live.closedCount,
          totalSlots: todayDay.slots.length,
          owner: shop.owner
            ? {
                id: shop.owner.id,
                email: shop.owner.email,
              }
            : null,
        };
      })
    );

    res.json(results);
  } catch (error: any) {
    console.error('Error fetching public shops:', error);
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
}

export async function getPublicShopStatus(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const shopRepo = AppDataSource.getRepository(Shop);
    const shop = await shopRepo.findOne({
      where: { id },
      relations: { owner: true },
    });

    if (!shop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    const todayDay = await getOrCreateTodayShopDay(shop);
    const live = computeLiveStatus(shop, todayDay.slots);

    res.json({
      shop: {
        id: shop.id,
        name: shop.name,
        category: shop.category,
        area: shop.area,
        phone: shop.phone,
        workingHoursStart: shop.workingHoursStart,
        workingHoursEnd: shop.workingHoursEnd,
        slotDurationMinutes: shop.slotDurationMinutes,
      },
      status: live.status,
      currentSlot: live.currentSlot,
      nextAvailableSlot: live.nextAvailableSlot,
      counts: {
        available: live.availableCount,
        booked: live.bookedCount,
        closed: live.closedCount,
        total: todayDay.slots.length,
      },
      todayDate: todayDay.date,
      slots: todayDay.slots,
    });
  } catch (error: any) {
    console.error('Error fetching shop status:', error);
    res.status(500).json({ error: 'Failed to fetch shop status' });
  }
}

export async function updateShopSettings(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { workingHoursStart, workingHoursEnd, slotDurationMinutes } = req.body;

    // Check authorization: admin or owner of this shop
    if (req.user?.role !== 'admin' && req.user?.shopId !== id) {
      res.status(403).json({ error: 'Forbidden: You do not manage this shop' });
      return;
    }

    const shopRepo = AppDataSource.getRepository(Shop);
    const shop = await shopRepo.findOne({ where: { id } });

    if (!shop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    if (workingHoursStart) shop.workingHoursStart = workingHoursStart;
    if (workingHoursEnd) shop.workingHoursEnd = workingHoursEnd;
    if (slotDurationMinutes) shop.slotDurationMinutes = parseInt(slotDurationMinutes, 10);

    await shopRepo.save(shop);

    // Reconcile today's schedule without clobbering booked slots
    const shopDayRepo = AppDataSource.getRepository(ShopDay);
    const todayDay = await getOrCreateTodayShopDay(shop);

    const reconciledSlots = reconcileSlots(
      shop.workingHoursStart,
      shop.workingHoursEnd,
      shop.slotDurationMinutes,
      todayDay.slots
    );

    todayDay.slots = reconciledSlots;
    await shopDayRepo.save(todayDay);

    const live = computeLiveStatus(shop, reconciledSlots);

    const responsePayload = {
      shop: {
        id: shop.id,
        name: shop.name,
        category: shop.category,
        area: shop.area,
        phone: shop.phone,
        workingHoursStart: shop.workingHoursStart,
        workingHoursEnd: shop.workingHoursEnd,
        slotDurationMinutes: shop.slotDurationMinutes,
      },
      status: live.status,
      currentSlot: live.currentSlot,
      nextAvailableSlot: live.nextAvailableSlot,
      counts: {
        available: live.availableCount,
        booked: live.bookedCount,
        closed: live.closedCount,
        total: reconciledSlots.length,
      },
      todayDate: todayDay.date,
      slots: reconciledSlots,
    };

    // Broadcast real-time update to any listening clients (owner preview, customer site)
    broadcastToShop(shop.id, 'shop_updated', responsePayload);

    res.json(responsePayload);
  } catch (error: any) {
    console.error('Error updating shop settings:', error);
    res.status(500).json({ error: 'Failed to update shop settings' });
  }
}

export async function updateShopSlots(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { slotIds, slotIndices, status, action } = req.body;

    if (req.user?.role !== 'admin' && req.user?.shopId !== id) {
      res.status(403).json({ error: 'Forbidden: You do not manage this shop' });
      return;
    }

    const shopRepo = AppDataSource.getRepository(Shop);
    const shop = await shopRepo.findOne({ where: { id } });

    if (!shop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    const shopDayRepo = AppDataSource.getRepository(ShopDay);
    const todayDay = await getOrCreateTodayShopDay(shop);
    let slots = [...todayDay.slots];

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Quick Action: Close for a break (closes current slot and next slot)
    if (action === 'close_break') {
      slots = slots.map((s) => {
        const sStart = timeToMinutes(s.start);
        const sEnd = timeToMinutes(s.end);
        // If current or within next 60 minutes
        if (sEnd > currentMinutes && sStart <= currentMinutes + 60 && s.status !== 'booked') {
          return { ...s, status: 'closed' as SlotStatus };
        }
        return s;
      });
    }
    // Quick Action: Close rest of today
    else if (action === 'close_rest_of_today') {
      slots = slots.map((s) => {
        const sEnd = timeToMinutes(s.end);
        if (sEnd > currentMinutes && s.status !== 'booked') {
          return { ...s, status: 'closed' as SlotStatus };
        }
        return s;
      });
    }
    // Quick Action: Open all non-booked slots
    else if (action === 'open_all') {
      slots = slots.map((s) => {
        if (s.status !== 'booked') {
          return { ...s, status: 'available' as SlotStatus };
        }
        return s;
      });
    }
    // Single or bulk update by slotIds
    else if (Array.isArray(slotIds) && slotIds.length > 0 && status) {
      const idSet = new Set(slotIds);
      slots = slots.map((s) => {
        if (idSet.has(s.id)) {
          return { ...s, status: status as SlotStatus };
        }
        return s;
      });
    }
    // Single or bulk update by slotIndices
    else if (Array.isArray(slotIndices) && slotIndices.length > 0 && status) {
      const indexSet = new Set(slotIndices);
      slots = slots.map((s, idx) => {
        if (indexSet.has(idx)) {
          return { ...s, status: status as SlotStatus };
        }
        return s;
      });
    } else {
      res.status(400).json({ error: 'Invalid update payload: provide slotIds, slotIndices, or action' });
      return;
    }

    todayDay.slots = slots;
    await shopDayRepo.save(todayDay);

    const live = computeLiveStatus(shop, slots);

    const responsePayload = {
      shop: {
        id: shop.id,
        name: shop.name,
        category: shop.category,
        area: shop.area,
        phone: shop.phone,
        workingHoursStart: shop.workingHoursStart,
        workingHoursEnd: shop.workingHoursEnd,
        slotDurationMinutes: shop.slotDurationMinutes,
      },
      status: live.status,
      currentSlot: live.currentSlot,
      nextAvailableSlot: live.nextAvailableSlot,
      counts: {
        available: live.availableCount,
        booked: live.bookedCount,
        closed: live.closedCount,
        total: slots.length,
      },
      todayDate: todayDay.date,
      slots,
    };

    // Broadcast over Socket.io channel
    broadcastToShop(shop.id, 'shop_updated', responsePayload);
    broadcastToShop(shop.id, 'slot_changed', { shopId: shop.id, slots, status: live.status });

    res.json(responsePayload);
  } catch (error: any) {
    console.error('Error updating shop slots:', error);
    res.status(500).json({ error: 'Failed to update slots' });
  }
}

/**
 * Public customer slot booking endpoint (No auth required for walk-in/online customers)
 */
export async function bookShopSlot(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { slotId, slotIds, customerName, customerPhone } = req.body;

    const targetSlotId = slotId || (Array.isArray(slotIds) && slotIds.length > 0 ? slotIds[0] : null);
    if (!targetSlotId) {
      res.status(400).json({ error: 'slotId is required to reserve an opening' });
      return;
    }

    const shopRepo = AppDataSource.getRepository(Shop);
    const shop = await shopRepo.findOne({ where: { id } });

    if (!shop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    const shopDayRepo = AppDataSource.getRepository(ShopDay);
    const todayDay = await getOrCreateTodayShopDay(shop);
    let slots = [...todayDay.slots];

    const slotIndex = slots.findIndex((s) => s.id === targetSlotId);
    if (slotIndex === -1) {
      res.status(404).json({ error: 'Selected slot does not exist' });
      return;
    }

    if (slots[slotIndex].status === 'booked') {
      res.status(409).json({ error: 'This slot is already booked. Please choose another opening.' });
      return;
    }

    if (slots[slotIndex].status === 'closed') {
      res.status(400).json({ error: 'This slot is currently marked closed by the studio.' });
      return;
    }

    const name = (customerName || 'Customer').trim();
    const phone = (customerPhone || '').trim();
    const formattedCustomer = phone ? `${name} (${phone})` : name;

    slots[slotIndex] = {
      ...slots[slotIndex],
      status: 'booked' as SlotStatus,
      customerName: formattedCustomer,
    };

    todayDay.slots = slots;
    await shopDayRepo.save(todayDay);

    const live = computeLiveStatus(shop, slots);

    const responsePayload = {
      success: true,
      message: 'Slot reserved successfully! Broadcasted live to studio.',
      bookedSlot: slots[slotIndex],
      shop: {
        id: shop.id,
        name: shop.name,
        category: shop.category,
        area: shop.area,
        phone: shop.phone,
        workingHoursStart: shop.workingHoursStart,
        workingHoursEnd: shop.workingHoursEnd,
        slotDurationMinutes: shop.slotDurationMinutes,
      },
      status: live.status,
      currentSlot: live.currentSlot,
      nextAvailableSlot: live.nextAvailableSlot,
      counts: {
        available: live.availableCount,
        booked: live.bookedCount,
        closed: live.closedCount,
        total: slots.length,
      },
      todayDate: todayDay.date,
      slots,
    };

    // Broadcast live over Socket.io to shop channel
    broadcastToShop(shop.id, 'shop_updated', responsePayload);
    broadcastToShop(shop.id, 'slot_changed', { shopId: shop.id, slots, status: live.status });

    res.json(responsePayload);
  } catch (error: any) {
    console.error('Error reserving slot:', error);
    res.status(500).json({ error: 'Failed to reserve slot' });
  }
}

/**
 * Public customer booking cancellation endpoint
 */
export async function cancelShopBooking(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { slotId } = req.body;

    if (!slotId) {
      res.status(400).json({ error: 'slotId is required' });
      return;
    }

    const shopRepo = AppDataSource.getRepository(Shop);
    const shop = await shopRepo.findOne({ where: { id } });

    if (!shop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    const shopDayRepo = AppDataSource.getRepository(ShopDay);
    const todayDay = await getOrCreateTodayShopDay(shop);
    let slots = [...todayDay.slots];

    const slotIndex = slots.findIndex((s) => s.id === slotId);
    if (slotIndex === -1) {
      res.status(404).json({ error: 'Slot not found' });
      return;
    }

    slots[slotIndex] = {
      ...slots[slotIndex],
      status: 'available' as SlotStatus,
      customerName: undefined,
    };

    todayDay.slots = slots;
    await shopDayRepo.save(todayDay);

    const live = computeLiveStatus(shop, slots);

    const responsePayload = {
      success: true,
      message: 'Booking cancelled successfully. Slot is available again.',
      shop: {
        id: shop.id,
        name: shop.name,
        category: shop.category,
        area: shop.area,
      },
      status: live.status,
      currentSlot: live.currentSlot,
      nextAvailableSlot: live.nextAvailableSlot,
      counts: {
        available: live.availableCount,
        booked: live.bookedCount,
        closed: live.closedCount,
        total: slots.length,
      },
      todayDate: todayDay.date,
      slots,
    };

    broadcastToShop(shop.id, 'shop_updated', responsePayload);
    broadcastToShop(shop.id, 'slot_changed', { shopId: shop.id, slots, status: live.status });

    res.json(responsePayload);
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
}

/**
 * Intelligent Voice Assistant Command Handler
 * Understands Hindi, Gujarati, English, Hinglish, Gujlish voice requests
 * and books/cancels/checks slots directly in the PostgreSQL database.
 */
export async function handleVoiceAssistantCommand(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { text, context, confirm } = req.body;

    if (!text && !confirm) {
      res.status(400).json({ error: 'Voice command text is required' });
      return;
    }

    if (req.user && req.user.role !== 'admin' && req.user.shopId !== id) {
      res.status(403).json({ error: 'Forbidden: You do not manage this shop' });
      return;
    }

    const shopRepo = AppDataSource.getRepository(Shop);
    const shop = await shopRepo.findOne({ where: { id } });

    if (!shop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    const shopDayRepo = AppDataSource.getRepository(ShopDay);
    const todayDay = await getOrCreateTodayShopDay(shop);

    const result = await processVoiceCommand(
      text || '',
      shop,
      todayDay,
      context,
      confirm === true
    );

    // If an action was executed (booked or cancelled), persist to database & broadcast live
    if ((result.status === 'booked' || result.status === 'cancelled') && result.updatedSlots) {
      todayDay.slots = result.updatedSlots;
      await shopDayRepo.save(todayDay);

      const live = computeLiveStatus(shop, todayDay.slots);
      const broadcastPayload = {
        shop: {
          id: shop.id,
          name: shop.name,
          category: shop.category,
          area: shop.area,
          phone: shop.phone,
          workingHoursStart: shop.workingHoursStart,
          workingHoursEnd: shop.workingHoursEnd,
          slotDurationMinutes: shop.slotDurationMinutes,
        },
        status: live.status,
        currentSlot: live.currentSlot,
        nextAvailableSlot: live.nextAvailableSlot,
        counts: {
          available: live.availableCount,
          booked: live.bookedCount,
          closed: live.closedCount,
          total: todayDay.slots.length,
        },
        todayDate: todayDay.date,
        slots: todayDay.slots,
      };

      broadcastToShop(shop.id, 'shop_updated', broadcastPayload);
      broadcastToShop(shop.id, 'slot_changed', {
        shopId: shop.id,
        slots: todayDay.slots,
        status: live.status,
      });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error handling voice command:', error);
    res.status(500).json({ error: 'Failed to process voice command', details: error.message });
  }
}


