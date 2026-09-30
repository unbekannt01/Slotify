import { SlotItem, SlotStatus, ShopDay } from '../entities/ShopDay';
import { Shop } from '../entities/Shop';
import { AppDataSource } from '../dataSource';

export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map((v) => parseInt(v, 10));
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(hours)}:${pad(minutes)}`;
}

export function generateSlots(
  workingHoursStart: string,
  workingHoursEnd: string,
  slotDurationMinutes: number
): SlotItem[] {
  const startMin = timeToMinutes(workingHoursStart);
  const endMin = timeToMinutes(workingHoursEnd);
  const slots: SlotItem[] = [];

  let current = startMin;
  while (current + slotDurationMinutes <= endMin) {
    const next = current + slotDurationMinutes;
    const startStr = minutesToTime(current);
    const endStr = minutesToTime(next);
    slots.push({
      id: `slot_${startStr.replace(':', '')}_${endStr.replace(':', '')}`,
      start: startStr,
      end: endStr,
      status: 'available',
    });
    current = next;
  }

  return slots;
}

/**
 * Reconcile new slot partition with existing slots,
 * preserving already-booked slots so existing appointments are not lost.
 */
export function reconcileSlots(
  workingHoursStart: string,
  workingHoursEnd: string,
  slotDurationMinutes: number,
  existingSlots: SlotItem[] = []
): SlotItem[] {
  const newSlots = generateSlots(workingHoursStart, workingHoursEnd, slotDurationMinutes);

  // Map existing booked intervals
  const bookedIntervals = existingSlots
    .filter((s) => s.status === 'booked')
    .map((s) => ({
      start: timeToMinutes(s.start),
      end: timeToMinutes(s.end),
    }));

  // Reconcile each new slot: if it overlaps with any booked interval, mark booked
  return newSlots.map((newSlot) => {
    const nStart = timeToMinutes(newSlot.start);
    const nEnd = timeToMinutes(newSlot.end);

    const isBooked = bookedIntervals.some(
      (b) => Math.max(nStart, b.start) < Math.min(nEnd, b.end)
    );

    if (isBooked) {
      return { ...newSlot, status: 'booked' as SlotStatus };
    }

    return newSlot;
  });
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computeLiveStatus(
  shop: Shop,
  slots: SlotItem[]
): {
  status: 'available' | 'busy' | 'closed';
  currentSlot: SlotItem | null;
  nextAvailableSlot: SlotItem | null;
  availableCount: number;
  bookedCount: number;
  closedCount: number;
} {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = timeToMinutes(shop.workingHoursStart);
  const endMinutes = timeToMinutes(shop.workingHoursEnd);

  let availableCount = 0;
  let bookedCount = 0;
  let closedCount = 0;
  let currentSlot: SlotItem | null = null;
  let nextAvailableSlot: SlotItem | null = null;

  slots.forEach((s) => {
    if (s.status === 'available') availableCount++;
    else if (s.status === 'booked') bookedCount++;
    else if (s.status === 'closed') closedCount++;

    const sStart = timeToMinutes(s.start);
    const sEnd = timeToMinutes(s.end);

    if (currentMinutes >= sStart && currentMinutes < sEnd) {
      currentSlot = s;
    }

    if (sStart >= currentMinutes && s.status === 'available' && !nextAvailableSlot) {
      nextAvailableSlot = s;
    }
  });

  // If outside working hours:
  if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
    return {
      status: 'closed',
      currentSlot,
      nextAvailableSlot,
      availableCount,
      bookedCount,
      closedCount,
    };
  }

  // If current slot is closed:
  if (currentSlot && (currentSlot as SlotItem).status === 'closed') {
    return {
      status: 'closed',
      currentSlot,
      nextAvailableSlot,
      availableCount,
      bookedCount,
      closedCount,
    };
  }

  // If current slot is booked or no available slots left:
  if (currentSlot && (currentSlot as SlotItem).status === 'booked') {
    return {
      status: 'busy',
      currentSlot,
      nextAvailableSlot,
      availableCount,
      bookedCount,
      closedCount,
    };
  }

  // If there are available slots right now:
  if (currentSlot && (currentSlot as SlotItem).status === 'available') {
    return {
      status: 'available',
      currentSlot,
      nextAvailableSlot,
      availableCount,
      bookedCount,
      closedCount,
    };
  }

  return {
    status: availableCount > 0 ? 'available' : 'busy',
    currentSlot,
    nextAvailableSlot,
    availableCount,
    bookedCount,
    closedCount,
  };
}

export async function getOrCreateTodayShopDay(shop: Shop): Promise<ShopDay> {
  const shopDayRepo = AppDataSource.getRepository(ShopDay);
  const dateStr = getTodayDateString();

  let shopDay = await shopDayRepo.findOne({
    where: { shopId: shop.id, date: dateStr },
  });

  if (!shopDay) {
    const slots = generateSlots(
      shop.workingHoursStart,
      shop.workingHoursEnd,
      shop.slotDurationMinutes
    );
    shopDay = shopDayRepo.create({
      shopId: shop.id,
      date: dateStr,
      slots,
    });
    await shopDayRepo.save(shopDay);
  }

  return shopDay;
}
