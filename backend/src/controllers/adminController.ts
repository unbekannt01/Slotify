import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../dataSource';
import { User } from '../entities/User';
import { Shop } from '../entities/Shop';
import { ShopDay } from '../entities/ShopDay';
import {
  getOrCreateTodayShopDay,
  computeLiveStatus,
  generateSlots,
  getTodayDateString,
} from '../services/slotService';

export async function getAdminShops(req: Request, res: Response): Promise<void> {
  try {
    const shopRepo = AppDataSource.getRepository(Shop);
    const shops = await shopRepo.find({
      relations: { owner: true },
      order: { createdAt: 'DESC' },
    });

    const enriched = await Promise.all(
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
          currentSlot: live.currentSlot,
          nextAvailableSlot: live.nextAvailableSlot,
          counts: {
            available: live.availableCount,
            booked: live.bookedCount,
            closed: live.closedCount,
            total: todayDay.slots.length,
          },
          owner: shop.owner
            ? {
                id: shop.owner.id,
                email: shop.owner.email,
                role: shop.owner.role,
              }
            : null,
          createdAt: shop.createdAt,
        };
      })
    );

    res.json(enriched);
  } catch (error: any) {
    console.error('Error fetching admin shops:', error);
    res.status(500).json({ error: 'Failed to fetch admin shops' });
  }
}

export async function createOwnerAndShop(req: Request, res: Response): Promise<void> {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const {
      email,
      password,
      name,
      phone,
      area,
      category,
      workingHoursStart = '09:00',
      workingHoursEnd = '19:00',
      slotDurationMinutes = 30,
    } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: 'email, password, and shop name are required' });
      await queryRunner.rollbackTransaction();
      return;
    }

    const userRepo = queryRunner.manager.getRepository(User);
    const existingUser = await userRepo.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists' });
      await queryRunner.rollbackTransaction();
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create User first
    const newUser = userRepo.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'owner',
    });
    const savedUser = await userRepo.save(newUser);

    // Create Shop
    const shopRepo = queryRunner.manager.getRepository(Shop);
    const newShop = shopRepo.create({
      name,
      phone: phone || '',
      area: area || '',
      category: category || 'Salon & Spa',
      ownerId: savedUser.id,
      workingHoursStart,
      workingHoursEnd,
      slotDurationMinutes: parseInt(String(slotDurationMinutes), 10),
    });
    const savedShop = await shopRepo.save(newShop);

    // Link shopId to user
    savedUser.shopId = savedShop.id;
    await userRepo.save(savedUser);

    // Generate today's initial ShopDay
    const shopDayRepo = queryRunner.manager.getRepository(ShopDay);
    const initialSlots = generateSlots(
      savedShop.workingHoursStart,
      savedShop.workingHoursEnd,
      savedShop.slotDurationMinutes
    );
    const todayShopDay = shopDayRepo.create({
      shopId: savedShop.id,
      date: getTodayDateString(),
      slots: initialSlots,
    });
    await shopDayRepo.save(todayShopDay);

    await queryRunner.commitTransaction();

    res.status(201).json({
      message: 'Owner and shop successfully created',
      user: {
        id: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
        shopId: savedShop.id,
      },
      shop: {
        id: savedShop.id,
        name: savedShop.name,
        phone: savedShop.phone,
        area: savedShop.area,
        category: savedShop.category,
        workingHoursStart: savedShop.workingHoursStart,
        workingHoursEnd: savedShop.workingHoursEnd,
        slotDurationMinutes: savedShop.slotDurationMinutes,
      },
    });
  } catch (error: any) {
    await queryRunner.rollbackTransaction();
    console.error('Error creating owner and shop:', error);
    res.status(500).json({ error: 'Failed to create owner and shop' });
  } finally {
    await queryRunner.release();
  }
}

export async function updateAdminShop(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const {
      name,
      phone,
      area,
      category,
      workingHoursStart,
      workingHoursEnd,
      slotDurationMinutes,
    } = req.body;

    const shopRepo = AppDataSource.getRepository(Shop);
    const shop = await shopRepo.findOne({ where: { id } });

    if (!shop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    if (name !== undefined) shop.name = name;
    if (phone !== undefined) shop.phone = phone;
    if (area !== undefined) shop.area = area;
    if (category !== undefined) shop.category = category;
    if (workingHoursStart !== undefined) shop.workingHoursStart = workingHoursStart;
    if (workingHoursEnd !== undefined) shop.workingHoursEnd = workingHoursEnd;
    if (slotDurationMinutes !== undefined) shop.slotDurationMinutes = parseInt(slotDurationMinutes, 10);

    await shopRepo.save(shop);

    res.json({
      message: 'Shop updated successfully',
      shop,
    });
  } catch (error: any) {
    console.error('Error updating shop by admin:', error);
    res.status(500).json({ error: 'Failed to update shop' });
  }
}

export async function getAdminStats(req: Request, res: Response): Promise<void> {
  try {
    const shopRepo = AppDataSource.getRepository(Shop);
    const shops = await shopRepo.find();

    let availableShops = 0;
    let busyShops = 0;
    let closedShops = 0;
    let totalSlotsToday = 0;
    let bookedSlotsToday = 0;
    let availableSlotsToday = 0;

    await Promise.all(
      shops.map(async (shop) => {
        const todayDay = await getOrCreateTodayShopDay(shop);
        const live = computeLiveStatus(shop, todayDay.slots);

        if (live.status === 'available') availableShops++;
        else if (live.status === 'busy') busyShops++;
        else closedShops++;

        totalSlotsToday += todayDay.slots.length;
        bookedSlotsToday += live.bookedCount;
        availableSlotsToday += live.availableCount;
      })
    );

    res.json({
      totalShops: shops.length,
      availableShops,
      busyShops,
      closedShops,
      totalSlotsToday,
      bookedSlotsToday,
      availableSlotsToday,
    });
  } catch (error: any) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ error: 'Failed to get platform stats' });
  }
}

export async function deleteShop(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const shopRepo = AppDataSource.getRepository(Shop);
    const shop = await shopRepo.findOne({ where: { id } });

    if (!shop) {
      res.status(404).json({ error: 'Shop not found' });
      return;
    }

    await shopRepo.remove(shop);
    res.json({ message: 'Shop deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting shop:', error);
    res.status(500).json({ error: 'Failed to delete shop' });
  }
}
