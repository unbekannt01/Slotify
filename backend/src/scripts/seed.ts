import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../dataSource';
import { User } from '../entities/User';
import { Shop } from '../entities/Shop';
import { ShopDay, SlotItem } from '../entities/ShopDay';
import { generateSlots, getTodayDateString } from '../services/slotService';

const isProd = process.env.NODE_ENV === 'production';

// Admin credentials:
//  - Production: SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are REQUIRED (nothing hardcoded)
//  - Local dev: falls back to admin@slotify.com / admin123 if env vars are not set
const adminEmail = (process.env.SEED_ADMIN_EMAIL || (isProd ? '' : 'admin@slotify.com')).trim().toLowerCase();
const adminPassword = process.env.SEED_ADMIN_PASSWORD || (isProd ? '' : 'admin123');

// Demo shops: created by default only in local dev.
// In production they are created only if SEED_DEMO_SHOPS=true
const seedDemoShops = process.env.SEED_DEMO_SHOPS === 'true' || (!isProd && process.env.SEED_DEMO_SHOPS !== 'false');

async function seed() {
  if (!adminEmail || !adminPassword) {
    console.error('[Seed] SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set when NODE_ENV=production.');
    process.exit(1);
  }
  if (isProd && adminPassword.length < 8) {
    console.error('[Seed] SEED_ADMIN_PASSWORD must be at least 8 characters in production.');
    process.exit(1);
  }

  console.log('[Seed] Connecting to database...');
  await AppDataSource.initialize();
  console.log('[Seed] Connected.');

  const userRepo = AppDataSource.getRepository(User);
  const shopRepo = AppDataSource.getRepository(Shop);
  const shopDayRepo = AppDataSource.getRepository(ShopDay);

  // 1. Create or update Admin User
  let admin = await userRepo.findOne({ where: { email: adminEmail } });
  const adminHash = await bcrypt.hash(adminPassword, 10);

  if (!admin) {
    admin = userRepo.create({
      email: adminEmail,
      passwordHash: adminHash,
      role: 'admin',
    });
    admin = await userRepo.save(admin);
    console.log(`[Seed] Admin created: ${adminEmail}${isProd ? '' : ` (password: ${adminPassword})`}`);
  } else {
    admin.passwordHash = adminHash;
    admin.role = 'admin';
    await userRepo.save(admin);
    console.log(`[Seed] Admin updated: ${adminEmail}`);
  }

  // 2. Demo Shops (optional)
  if (!seedDemoShops) {
    console.log('[Seed] Skipping demo shops (set SEED_DEMO_SHOPS=true to create them).');
    console.log('[Seed] Database seeding completed successfully! ✨');
    await AppDataSource.destroy();
    return;
  }

  const demoShops = [
    {
      name: 'Luxe Salon & Studio',
      email: 'owner@luxe.com',
      password: 'owner123',
      phone: '+1 (555) 234-5678',
      area: 'Downtown / Arts District',
      category: 'Hair & Styling',
      workingHoursStart: '09:00',
      workingHoursEnd: '19:00',
      slotDurationMinutes: 30,
    },
    {
      name: 'Apex Barbershop & Grooming',
      email: 'barber@apex.com',
      password: 'barber123',
      phone: '+1 (555) 876-5432',
      area: 'Uptown Boulevard',
      category: 'Barbershop',
      workingHoursStart: '10:00',
      workingHoursEnd: '20:00',
      slotDurationMinutes: 45,
    },
    {
      name: 'Glow Aesthetics Lounge',
      email: 'glow@lounge.com',
      password: 'glow123',
      phone: '+1 (555) 345-9988',
      area: 'Westside Marina',
      category: 'Spa & Wellness',
      workingHoursStart: '09:00',
      workingHoursEnd: '18:00',
      slotDurationMinutes: 60,
    },
  ];

  const todayStr = getTodayDateString();

  for (const shopData of demoShops) {
    let owner = await userRepo.findOne({ where: { email: shopData.email } });
    const ownerHash = await bcrypt.hash(shopData.password, 10);

    if (!owner) {
      owner = userRepo.create({
        email: shopData.email,
        passwordHash: ownerHash,
        role: 'owner',
      });
      owner = await userRepo.save(owner);
    } else {
      owner.passwordHash = ownerHash;
      await userRepo.save(owner);
    }

    let shop = await shopRepo.findOne({ where: { ownerId: owner.id } });
    if (!shop) {
      shop = shopRepo.create({
        name: shopData.name,
        phone: shopData.phone,
        area: shopData.area,
        category: shopData.category,
        ownerId: owner.id,
        workingHoursStart: shopData.workingHoursStart,
        workingHoursEnd: shopData.workingHoursEnd,
        slotDurationMinutes: shopData.slotDurationMinutes,
      });
      shop = await shopRepo.save(shop);
    } else {
      shop.name = shopData.name;
      shop.phone = shopData.phone;
      shop.area = shopData.area;
      shop.category = shopData.category;
      shop.workingHoursStart = shopData.workingHoursStart;
      shop.workingHoursEnd = shopData.workingHoursEnd;
      shop.slotDurationMinutes = shopData.slotDurationMinutes;
      await shopRepo.save(shop);
    }

    // Link shopId to owner
    owner.shopId = shop.id;
    await userRepo.save(owner);

    // Create or reset today's schedule with realistic initial distribution
    let shopDay = await shopDayRepo.findOne({
      where: { shopId: shop.id, date: todayStr },
    });

    const slots: SlotItem[] = generateSlots(
      shop.workingHoursStart,
      shop.workingHoursEnd,
      shop.slotDurationMinutes
    );

    // Make 2nd and 4th slots 'booked' for realism
    if (slots.length > 2) slots[1].status = 'booked';
    if (slots.length > 4) slots[3].status = 'booked';

    if (!shopDay) {
      shopDay = shopDayRepo.create({
        shopId: shop.id,
        date: todayStr,
        slots,
      });
    } else {
      shopDay.slots = slots;
    }
    await shopDayRepo.save(shopDay);

    console.log(
      `[Seed] Created/Updated Shop: "${shop.name}" | Owner: ${owner.email}${isProd ? '' : ` (password: ${shopData.password})`} | ${slots.length} slots`
    );
  }

  console.log('[Seed] Database seeding completed successfully! ✨');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('[Seed] Error during seeding:', err);
  process.exit(1);
});