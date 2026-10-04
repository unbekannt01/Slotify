import { Shop } from '../entities/Shop';
import { ShopDay, SlotItem, SlotStatus } from '../entities/ShopDay';
import { timeToMinutes, minutesToTime, getTodayDateString } from './slotService';

export interface VoiceCommandContext {
  pendingAction?: 'book_slot' | 'cancel_slot';
  slotId?: string;
  slotStart?: string;
  slotEnd?: string;
  customerName?: string;
  date?: string;
  step?: 'awaiting_confirmation' | 'awaiting_name' | 'awaiting_time_clarification';
  clarificationType?: 'am_pm' | 'missing_name' | 'slot_busy_alternative';
  alternativeSlotId?: string;
}

export interface VoiceAssistantResult {
  success: boolean;
  status: 'booked' | 'cancelled' | 'confirming' | 'need_info' | 'info' | 'error';
  intent: 'book_slot' | 'cancel_slot' | 'check_availability' | 'get_schedule' | 'confirm' | 'reject' | 'unknown';
  replyText: string;
  language: 'hi' | 'gu' | 'en';
  extracted?: {
    customerName?: string;
    time?: string;
    date?: string;
    slotId?: string;
  };
  bookedSlot?: SlotItem;
  cancelledSlot?: SlotItem;
  proposedSlot?: SlotItem;
  context?: VoiceCommandContext;
  updatedSlots?: SlotItem[];
}

/**
 * Detect primary language from keywords
 */
export function detectLanguage(text: string): 'hi' | 'gu' | 'en' {
  const lower = text.toLowerCase();
  
  // Gujarati indicators
  if (
    lower.includes('aaje') ||
    lower.includes('nu') ||
    lower.includes('mate') ||
    lower.includes('kari') ||
    lower.includes('aapo') ||
    lower.includes('chhe') ||
    lower.includes('nathi') ||
    lower.includes('savare') ||
    lower.includes('sanje') ||
    lower.includes('bapore') ||
    lower.includes('vagye') ||
    lower.includes('vage') ||
    lower.includes('radh') ||
    lower.includes('ketla') ||
    lower.includes('khali chhe')
  ) {
    return 'gu';
  }

  // Hindi indicators
  if (
    lower.includes('aaj') ||
    lower.includes('ka') ||
    lower.includes('ki') ||
    lower.includes('ke') ||
    lower.includes('liye') ||
    lower.includes('kar do') ||
    lower.includes('karo') ||
    lower.includes('hai') ||
    lower.includes('nahi') ||
    lower.includes('subah') ||
    lower.includes('shaam') ||
    lower.includes('sham') ||
    lower.includes('dopahar') ||
    lower.includes('baje') ||
    lower.includes('kitne') ||
    lower.includes('hata do')
  ) {
    return 'hi';
  }

  return 'en';
}

/**
 * Extract time string (HH:MM in 24hr format) from natural speech
 */
export function extractTime(text: string): { timeStr: string | null; isExplicitPeriod: boolean; period?: 'am' | 'pm' } {
  const lower = text.toLowerCase();
  let period: 'am' | 'pm' | undefined = undefined;

  // Period keywords in Hindi / Gujarati / English
  if (
    lower.includes('am') ||
    lower.includes('subah') ||
    lower.includes('savare') ||
    lower.includes('savaare') ||
    lower.includes('morning')
  ) {
    period = 'am';
  } else if (
    lower.includes('pm') ||
    lower.includes('sham') ||
    lower.includes('shaam') ||
    lower.includes('sanje') ||
    lower.includes('raat') ||
    lower.includes('dopahar') ||
    lower.includes('dopehr') ||
    lower.includes('bapore') ||
    lower.includes('evening') ||
    lower.includes('afternoon') ||
    lower.includes('night')
  ) {
    period = 'pm';
  }

  // 1. Match standard HH:MM (e.g., "8:15", "08:15", "8.15", "20:30")
  const standardMatch = lower.match(/\b(\d{1,2})[:.](\d{2})\b/);
  if (standardMatch) {
    let hour = parseInt(standardMatch[1], 10);
    const minute = standardMatch[2];

    if (period === 'pm' && hour < 12) {
      hour += 12;
    } else if (period === 'am' && hour === 12) {
      hour = 0;
    }

    const padH = hour < 10 ? `0${hour}` : `${hour}`;
    return {
      timeStr: `${padH}:${minute}`,
      isExplicitPeriod: !!period,
      period,
    };
  }

  // 2. Match single hour (e.g., "8 baje", "10 vagye", "8 pm", "2 o'clock")
  const hourMatch = lower.match(/\b(\d{1,2})\s*(?:baje|vagye|vage|o'clock|pm|am)?\b/);
  if (hourMatch && !['aaj', 'aaje', '2026', '2025'].includes(hourMatch[1])) {
    let hour = parseInt(hourMatch[1], 10);
    if (hour >= 1 && hour <= 23) {
      if (period === 'pm' && hour < 12) {
        hour += 12;
      } else if (period === 'am' && hour === 12) {
        hour = 0;
      }

      const padH = hour < 10 ? `0${hour}` : `${hour}`;
      return {
        timeStr: `${padH}:00`,
        isExplicitPeriod: !!period,
        period,
      };
    }
  }

  return { timeStr: null, isExplicitPeriod: false };
}

/**
 * Extract customer name from natural speech across English, Hindi, and Gujarati
 */
export function extractCustomerName(text: string): string | null {
  const clean = text.trim();

  // Stop words to reject if picked up as a name
  const stopWords = new Set([
    'aaj', 'aaje', 'today', 'tomorrow', 'kal', 'kaale', 'slot', 'booking', 'book',
    'karo', 'kar', 'do', 'kari', 'aapo', 'nu', 'ka', 'ki', 'ke', 'liye', 'mate',
    'am', 'pm', 'baje', 'vagye', 'vage', 'subah', 'sham', 'shaam', 'sanje', 'savare',
    'bapore', 'dopahar', 'hai', 'chhe', 'please', 'ek', 'one', 'naame', 'name', 'se',
    'appointment', 'schedule', 'cancel', 'check', 'ha', 'haan', 'yes', 'no', 'nahi',
    'available', 'open', 'close', 'karvu', 'karva', 'mate'
  ]);

  // Pattern 1: Gujarati "<Name> nu" or "<Name> mate" (e.g. "Raj nu 8:15 nu slot", "Amit mate")
  const gujMatch = clean.match(/([a-zA-Z\u0A80-\u0AFF]+)\s+(?:nu|mate|na\s+naame)/i);
  if (gujMatch && !stopWords.has(gujMatch[1].toLowerCase())) {
    return capitalize(gujMatch[1]);
  }

  // Pattern 2: Hindi "<Name> ka" or "<Name> ki" or "<Name> ke liye" or "<Name> name se"
  const hindiMatch = clean.match(/([a-zA-Z\u0900-\u097F]+)\s+(?:ka|ki|ke\s+liye|name\s+se|ke\s+naam\s+se)/i);
  if (hindiMatch && !stopWords.has(hindiMatch[1].toLowerCase())) {
    return capitalize(hindiMatch[1]);
  }

  // Pattern 3: English "for <Name>" or "<Name>'s" or "customer <Name>"
  const engMatch = clean.match(/(?:for|customer|named)\s+([a-zA-Z]+)|([a-zA-Z]+)(?:'s|\s+appointment)/i);
  if (engMatch) {
    const raw = engMatch[1] || engMatch[2];
    if (raw && !stopWords.has(raw.toLowerCase())) {
      return capitalize(raw);
    }
  }

  // Pattern 4: Standalone name if the user answers a follow-up like "Raj" or "Rahul Sharma"
  const tokens = clean.split(/\s+/);
  if (tokens.length <= 2 && tokens.every((t) => /^[a-zA-Z\u0900-\u097F\u0A80-\u0AFF]+$/.test(t))) {
    const candidate = tokens.join(' ');
    if (!stopWords.has(candidate.toLowerCase()) && isNaN(Number(candidate))) {
      return capitalize(candidate);
    }
  }

  return null;
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

/**
 * Match a target time against a shop's slot list with working hours awareness
 */
export function matchSlot(
  slots: SlotItem[],
  shop: Shop,
  extractedTime: string,
  isExplicitPeriod: boolean
): { matchedSlot: SlotItem | null; isAmbiguousAmPm: boolean; amSlot?: SlotItem; pmSlot?: SlotItem; nearestSlot?: SlotItem } {
  if (!extractedTime) {
    return { matchedSlot: null, isAmbiguousAmPm: false };
  }

  const [rawH, rawM] = extractedTime.split(':').map((v) => parseInt(v, 10));
  const startMin = timeToMinutes(shop.workingHoursStart);
  const endMin = timeToMinutes(shop.workingHoursEnd);

  // If period was not explicit (e.g. user just said "8:15" without AM or PM):
  if (!isExplicitPeriod && rawH < 12) {
    const amHour = rawH;
    const pmHour = rawH + 12;
    const amTimeStr = `${amHour < 10 ? `0${amHour}` : amHour}:${rawM < 10 ? `0${rawM}` : rawM}`;
    const pmTimeStr = `${pmHour}:${rawM < 10 ? `0${rawM}` : rawM}`;

    const amMin = timeToMinutes(amTimeStr);
    const pmMin = timeToMinutes(pmTimeStr);

    const amInRange = amMin >= startMin && amMin < endMin;
    const pmInRange = pmMin >= startMin && pmMin < endMin;

    const amSlot = slots.find((s) => s.start === amTimeStr);
    const pmSlot = slots.find((s) => s.start === pmTimeStr);

    // If both AM and PM fall within shop working hours, ask for clarification!
    if (amInRange && pmInRange && amSlot && pmSlot) {
      return {
        matchedSlot: null,
        isAmbiguousAmPm: true,
        amSlot,
        pmSlot,
      };
    }

    // If only PM is in working hours (e.g. 8:15 PM when shop is 10:00 to 22:00)
    if (pmInRange && !amInRange) {
      const slot = slots.find((s) => s.start === pmTimeStr);
      if (slot) return { matchedSlot: slot, isAmbiguousAmPm: false };
    }

    // If only AM is in working hours
    if (amInRange && !pmInRange) {
      const slot = slots.find((s) => s.start === amTimeStr);
      if (slot) return { matchedSlot: slot, isAmbiguousAmPm: false };
    }
  }

  // Exact direct match on formatted time
  const direct = slots.find((s) => s.start === extractedTime);
  if (direct) {
    return { matchedSlot: direct, isAmbiguousAmPm: false };
  }

  // Nearest slot fallback
  const targetMinutes = timeToMinutes(extractedTime);
  let nearestSlot: SlotItem | undefined = undefined;
  let minDiff = Infinity;

  slots.forEach((s) => {
    const sMin = timeToMinutes(s.start);
    const diff = Math.abs(sMin - targetMinutes);
    if (diff < minDiff && diff <= 60) {
      minDiff = diff;
      nearestSlot = s;
    }
  });

  return { matchedSlot: null, isAmbiguousAmPm: false, nearestSlot };
}

/**
 * Main AI Voice Assistant Pipeline for Shop Owners
 */
export async function processVoiceCommand(
  text: string,
  shop: Shop,
  shopDay: ShopDay,
  context?: VoiceCommandContext,
  explicitConfirm = false
): Promise<VoiceAssistantResult> {
  const cleanText = (text || '').trim();
  const lang = detectLanguage(cleanText);
  const lower = cleanText.toLowerCase();

  // 1. Check for Confirmation / Yes Response to a Pending Action
  const isAffirmative =
    lower === 'haan' ||
    lower === 'ha' ||
    lower === 'yes' ||
    lower === 'confirm' ||
    lower === 'book kar do' ||
    lower === 'kari do' ||
    lower === 'kari aapo' ||
    lower === 'book it' ||
    lower.startsWith('haan ') ||
    lower.startsWith('ha ') ||
    lower.startsWith('yes ');

  const isNegative =
    lower === 'nahi' ||
    lower === 'no' ||
    lower === 'cancel' ||
    lower === 'nathi' ||
    lower === 'reva do' ||
    lower === 'mat karo';

  if (isNegative && context?.pendingAction) {
    const replyText =
      lang === 'gu'
        ? 'Booking cancel kari didhi chhe. Biju kai kaam hoy toh kaho.'
        : lang === 'hi'
        ? 'Booking cancel kar di gayi hai. Koi aur kaam ho toh batayein.'
        : 'Action cancelled. Let me know if you need anything else.';
    return {
      success: true,
      status: 'info',
      intent: 'reject',
      replyText,
      language: lang,
    };
  }

  // 2. Resolve Context Follow-ups (e.g. user just answered with customer name or time)
  if (context && context.pendingAction === 'book_slot') {
    // If user confirmed the booking
    if (isAffirmative || explicitConfirm) {
      const targetSlot = shopDay.slots.find((s) => s.id === context.slotId);
      if (targetSlot) {
        if (targetSlot.status === 'booked') {
          const replyText =
            lang === 'gu'
              ? `Aah slot (${targetSlot.start}) already book thai gayu chhe.`
              : lang === 'hi'
              ? `Yeh slot (${targetSlot.start}) already kisi aur ke liye book ho chuka hai.`
              : `This slot (${targetSlot.start}) was just booked.`;
          return {
            success: false,
            status: 'error',
            intent: 'book_slot',
            replyText,
            language: lang,
          };
        }

        // Execute booking into database representation
        targetSlot.status = 'booked' as SlotStatus;
        targetSlot.customerName = context.customerName || 'Walk-in Client';

        const replyText =
          lang === 'gu'
            ? `✓ ${context.customerName} mate aaje ${targetSlot.start} nu slot book kari didhu chhe!`
            : lang === 'hi'
            ? `✓ ${context.customerName} ke liye aaj ${targetSlot.start} ka slot book ho gaya hai!`
            : `✓ Slot at ${targetSlot.start} successfully booked for ${context.customerName}!`;

        return {
          success: true,
          status: 'booked',
          intent: 'book_slot',
          replyText,
          language: lang,
          bookedSlot: targetSlot,
          updatedSlots: shopDay.slots,
        };
      }
    }

    // If we were waiting for customer name
    if (context.step === 'awaiting_name') {
      const name = extractCustomerName(cleanText) || capitalize(cleanText);
      if (name) {
        context.customerName = name;
        context.step = 'awaiting_confirmation';
        const slot = shopDay.slots.find((s) => s.id === context.slotId);
        const timeLabel = slot ? slot.start : context.slotStart;

        const replyText =
          lang === 'gu'
            ? `${name} mate aaje ${timeLabel} nu slot book karvu chhe? Confirm karo.`
            : lang === 'hi'
            ? `${name} ke liye aaj ${timeLabel} ka slot book karna hai? Confirm karein?`
            : `Book ${timeLabel} today for ${name}? Please confirm.`;

        return {
          success: true,
          status: 'confirming',
          intent: 'book_slot',
          replyText,
          language: lang,
          proposedSlot: slot,
          context,
        };
      }
    }

    // If we were waiting for AM / PM clarification
    if (context.clarificationType === 'am_pm') {
      const isPm = lower.includes('pm') || lower.includes('sham') || lower.includes('sanje') || lower.includes('evening');
      const isAm = lower.includes('am') || lower.includes('subah') || lower.includes('savare') || lower.includes('morning');

      let chosenSlotId = context.slotId;
      if (isPm && context.alternativeSlotId) {
        chosenSlotId = context.alternativeSlotId;
      }

      const slot = shopDay.slots.find((s) => s.id === chosenSlotId);
      if (slot) {
        context.slotId = slot.id;
        context.slotStart = slot.start;
        context.clarificationType = undefined;
        context.step = 'awaiting_confirmation';

        const replyText =
          lang === 'gu'
            ? `${context.customerName || 'Customer'} mate ${slot.start} nu slot book kari aapu? Confirm karo.`
            : lang === 'hi'
            ? `${context.customerName || 'Customer'} ke liye ${slot.start} ka slot book kar doon? Confirm karein?`
            : `Book ${slot.start} for ${context.customerName || 'Customer'}? Please confirm.`;

        return {
          success: true,
          status: 'confirming',
          intent: 'book_slot',
          replyText,
          language: lang,
          proposedSlot: slot,
          context,
        };
      }
    }
  }

  // 3. Detect Top-Level Intents
  const isCancelIntent =
    lower.includes('cancel') ||
    lower.includes('radh') ||
    lower.includes('hata do') ||
    lower.includes('delete');

  const isScheduleCheck =
    lower.includes('available') ||
    lower.includes('khali') ||
    lower.includes('openings') ||
    lower.includes('schedule') ||
    lower.includes('kitne slot') ||
    lower.includes('ketla slot') ||
    lower.includes('check');

  // Handle Cancel Intent
  if (isCancelIntent) {
    const targetName = extractCustomerName(cleanText);
    const { timeStr } = extractTime(cleanText);

    let bookedSlotToCancel: SlotItem | undefined = undefined;

    if (timeStr) {
      bookedSlotToCancel = shopDay.slots.find(
        (s) => s.start === timeStr && s.status === 'booked'
      );
    }

    if (!bookedSlotToCancel && targetName) {
      bookedSlotToCancel = shopDay.slots.find(
        (s) =>
          s.status === 'booked' &&
          s.customerName &&
          s.customerName.toLowerCase().includes(targetName.toLowerCase())
      );
    }

    if (bookedSlotToCancel) {
      bookedSlotToCancel.status = 'available' as SlotStatus;
      const client = bookedSlotToCancel.customerName || 'Customer';
      bookedSlotToCancel.customerName = undefined;

      const replyText =
        lang === 'gu'
          ? `✓ ${client} nu ${bookedSlotToCancel.start} nu slot cancel kari didhu chhe ane have slot open chhe.`
          : lang === 'hi'
          ? `✓ ${client} ka ${bookedSlotToCancel.start} ka slot cancel kar diya gaya hai aur slot ab open hai.`
          : `✓ Booking for ${client} at ${bookedSlotToCancel.start} has been cancelled and reopened.`;

      return {
        success: true,
        status: 'cancelled',
        intent: 'cancel_slot',
        replyText,
        language: lang,
        cancelledSlot: bookedSlotToCancel,
        updatedSlots: shopDay.slots,
      };
    } else {
      const replyText =
        lang === 'gu'
          ? 'Koi matching booked slot nathi malyu cancel karva mate.'
          : lang === 'hi'
          ? 'Cancel karne ke liye koi booked slot nahi mila. Kripya time ya customer ka naam batayein.'
          : 'Could not find a booked slot matching that description to cancel.';

      return {
        success: false,
        status: 'error',
        intent: 'cancel_slot',
        replyText,
        language: lang,
      };
    }
  }

  // Handle Availability / Schedule Query Intent
  if (isScheduleCheck && !lower.includes('book')) {
    const availableSlots = shopDay.slots.filter((s) => s.status === 'available');
    const bookedSlots = shopDay.slots.filter((s) => s.status === 'booked');
    const nextSlot = availableSlots[0];

    const replyText =
      lang === 'gu'
        ? `Aaje kul ${availableSlots.length} slots khali chhe ane ${bookedSlots.length} book thai chhe. Have pachi nu khali slot ${nextSlot ? nextSlot.start : 'nathi'}.`
        : lang === 'hi'
        ? `Aaj total ${availableSlots.length} slots khali hain aur ${bookedSlots.length} booked hain. Agla available slot ${nextSlot ? nextSlot.start : 'khatam ho chuke hain'}.`
        : `There are ${availableSlots.length} open slots and ${bookedSlots.length} booked slots today. Next opening is at ${nextSlot ? nextSlot.start : 'none left'}.`;

    return {
      success: true,
      status: 'info',
      intent: 'check_availability',
      replyText,
      language: lang,
      updatedSlots: shopDay.slots,
    };
  }

  // 4. Default Core Flow: Book Slot Intent
  const customerName = extractCustomerName(cleanText);
  const { timeStr, isExplicitPeriod } = extractTime(cleanText);

  // If time is missing entirely
  if (!timeStr) {
    const replyText =
      lang === 'gu'
        ? 'Kya samaye nu slot book karvu chhe? Samay janavo (jem ke 8:15 PM).'
        : lang === 'hi'
        ? 'Kis time ka slot book karna hai? Time batayein (jaise 8:15 PM).'
        : 'What time would you like to book? Please specify a time (e.g. 8:15 PM).';

    return {
      success: false,
      status: 'need_info',
      intent: 'book_slot',
      replyText,
      language: lang,
      context: {
        pendingAction: 'book_slot',
        customerName: customerName || undefined,
        step: 'awaiting_time_clarification',
      },
    };
  }

  // Match slot in shopDay
  const matchResult = matchSlot(shopDay.slots, shop, timeStr, isExplicitPeriod);

  // Ambiguous AM / PM (e.g. shop is open 8am to 10pm and user said "8 baje")
  if (matchResult.isAmbiguousAmPm && matchResult.amSlot && matchResult.pmSlot) {
    const replyText =
      lang === 'gu'
        ? `Savaare ${matchResult.amSlot.start} AM ya Sanje ${matchResult.pmSlot.start} PM?`
        : lang === 'hi'
        ? `Morning ${matchResult.amSlot.start} AM ya Evening ${matchResult.pmSlot.start} PM?`
        : `Morning ${matchResult.amSlot.start} AM or Evening ${matchResult.pmSlot.start} PM?`;

    return {
      success: true,
      status: 'need_info',
      intent: 'book_slot',
      replyText,
      language: lang,
      context: {
        pendingAction: 'book_slot',
        slotId: matchResult.amSlot.id,
        alternativeSlotId: matchResult.pmSlot.id,
        customerName: customerName || undefined,
        clarificationType: 'am_pm',
      },
    };
  }

  const slot = matchResult.matchedSlot;

  // No exact slot found
  if (!slot) {
    if (matchResult.nearestSlot) {
      const replyText =
        lang === 'gu'
          ? `${timeStr} par slot nathi. Najik nu slot ${matchResult.nearestSlot.start} chhe. Shu ae book karvu chhe?`
          : lang === 'hi'
          ? `${timeStr} par koi slot nahi hai. Nearest slot ${matchResult.nearestSlot.start} hai. Kya yeh book karein?`
          : `No slot at ${timeStr}. Nearest slot is at ${matchResult.nearestSlot.start}. Would you like to book that?`;

      return {
        success: true,
        status: 'need_info',
        intent: 'book_slot',
        replyText,
        language: lang,
        proposedSlot: matchResult.nearestSlot,
        context: {
          pendingAction: 'book_slot',
          slotId: matchResult.nearestSlot.id,
          customerName: customerName || undefined,
          step: 'awaiting_confirmation',
        },
      };
    }

    const replyText =
      lang === 'gu'
        ? `${timeStr} dukaan na working hours (${shop.workingHoursStart}–${shop.workingHoursEnd}) ni bahaar chhe.`
        : lang === 'hi'
        ? `${timeStr} shop ke working hours (${shop.workingHoursStart}–${shop.workingHoursEnd}) ke bahar hai.`
        : `${timeStr} is outside shop operating hours (${shop.workingHoursStart}–${shop.workingHoursEnd}).`;

    return {
      success: false,
      status: 'error',
      intent: 'book_slot',
      replyText,
      language: lang,
    };
  }

  // Slot already booked
  if (slot.status === 'booked') {
    const nextAvailable = shopDay.slots.find(
      (s) => s.status === 'available' && timeToMinutes(s.start) > timeToMinutes(slot.start)
    );

    const clientNote = slot.customerName ? ` (${slot.customerName})` : '';

    const replyText =
      lang === 'gu'
        ? `${slot.start} nu slot already book chhe${clientNote}. Have pachi nu khali slot ${nextAvailable ? nextAvailable.start : 'nathi'}. Shu ae book karvu chhe?`
        : lang === 'hi'
        ? `${slot.start} ka slot already booked hai${clientNote}. Agla available slot ${nextAvailable ? nextAvailable.start : 'available nahi hai'}. Kya wo book karein?`
        : `${slot.start} is already booked${clientNote}. Next available opening is ${nextAvailable ? nextAvailable.start : 'none'}. Would you like that instead?`;

    return {
      success: false,
      status: 'need_info',
      intent: 'book_slot',
      replyText,
      language: lang,
      proposedSlot: nextAvailable,
      context: nextAvailable
        ? {
            pendingAction: 'book_slot',
            slotId: nextAvailable.id,
            customerName: customerName || undefined,
            step: 'awaiting_confirmation',
          }
        : undefined,
    };
  }

  // Slot is marked closed
  if (slot.status === 'closed') {
    const replyText =
      lang === 'gu'
        ? `${slot.start} nu slot closed mark karelu chhe.`
        : lang === 'hi'
        ? `${slot.start} ka slot closed mark kiya hua hai.`
        : `The slot at ${slot.start} is currently closed.`;

    return {
      success: false,
      status: 'error',
      intent: 'book_slot',
      replyText,
      language: lang,
    };
  }

  // Missing Customer Name
  if (!customerName) {
    const replyText =
      lang === 'gu'
        ? `${slot.start} nu slot khali chhe! Kis customer na naame book karvu chhe? Naam kaho.`
        : lang === 'hi'
        ? `${slot.start} ka slot available hai! Kis customer ke naam se book karna hai? Naam batayein.`
        : `${slot.start} is available! What is the customer's name?`;

    return {
      success: true,
      status: 'need_info',
      intent: 'book_slot',
      replyText,
      language: lang,
      proposedSlot: slot,
      context: {
        pendingAction: 'book_slot',
        slotId: slot.id,
        slotStart: slot.start,
        step: 'awaiting_name',
      },
    };
  }

  // If explicitConfirm was sent (or 1-tap book requested)
  if (explicitConfirm) {
    slot.status = 'booked' as SlotStatus;
    slot.customerName = customerName;

    const replyText =
      lang === 'gu'
        ? `✓ ${customerName} mate aaje ${slot.start} nu slot book kari didhu chhe!`
        : lang === 'hi'
        ? `✓ ${customerName} ke liye aaj ${slot.start} ka slot book ho gaya hai!`
        : `✓ Slot at ${slot.start} successfully booked for ${customerName}!`;

    return {
      success: true,
      status: 'booked',
      intent: 'book_slot',
      replyText,
      language: lang,
      bookedSlot: slot,
      updatedSlots: shopDay.slots,
    };
  }

  // Slot is available and all details are present -> Ask Confirmation
  const replyText =
    lang === 'gu'
      ? `${customerName} mate aaje ${slot.start} nu slot book karvu chhe? Confirm karo.`
      : lang === 'hi'
      ? `${customerName} ke liye aaj ${slot.start} ka slot book karna hai? Confirm karein?`
      : `Book ${slot.start} today for ${customerName}? Please confirm.`;

  return {
    success: true,
    status: 'confirming',
    intent: 'book_slot',
    replyText,
    language: lang,
    proposedSlot: slot,
    extracted: {
      customerName,
      time: slot.start,
      slotId: slot.id,
      date: shopDay.date,
    },
    context: {
      pendingAction: 'book_slot',
      slotId: slot.id,
      slotStart: slot.start,
      slotEnd: slot.end,
      customerName,
      date: shopDay.date,
      step: 'awaiting_confirmation',
    },
  };
}
