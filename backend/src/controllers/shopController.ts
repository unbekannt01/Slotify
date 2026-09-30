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
    broadcastToShop(shop.id, 'slot_changed', { slots, status: live.status });

    res.json(responsePayload);
  } catch (error: any) {
    console.error('Error updating shop slots:', error);
    res.status(500).json({ error: 'Failed to update slots' });
  }
}
