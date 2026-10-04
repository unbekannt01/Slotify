import { apiClient } from './client';

export type SlotStatus = 'available' | 'booked' | 'closed';

export interface SlotItem {
  id: string;
  start: string;
  end: string;
  status: SlotStatus;
  customerName?: string;
}


export interface ShopDetails {
  id: string;
  name: string;
  category: string;
  area: string;
  phone: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  slotDurationMinutes: number;
}

export interface ShopCounts {
  available: number;
  booked: number;
  closed: number;
  total: number;
}

export interface ShopStatusResponse {
  shop: ShopDetails;
  status: 'available' | 'busy' | 'closed';
  currentSlot: SlotItem | null;
  nextAvailableSlot: SlotItem | null;
  counts: ShopCounts;
  todayDate: string;
  slots: SlotItem[];
}

export interface PublicShopItem extends ShopDetails {
  status: 'available' | 'busy' | 'closed';
  nextAvailableSlot: SlotItem | null;
  availableCount: number;
  bookedCount: number;
  closedCount: number;
  totalSlots: number;
  owner?: { id: string; email: string } | null;
}

export async function getPublicShopsApi(): Promise<PublicShopItem[]> {
  const response = await apiClient.get<PublicShopItem[]>('/shops');
  return response.data;
}

export async function getShopStatusApi(shopId: string): Promise<ShopStatusResponse> {
  const response = await apiClient.get<ShopStatusResponse>(`/shops/${shopId}/status`);
  return response.data;
}

export async function updateShopSettingsApi(
  shopId: string,
  settings: {
    workingHoursStart?: string;
    workingHoursEnd?: string;
    slotDurationMinutes?: number;
  }
): Promise<ShopStatusResponse> {
  const response = await apiClient.patch<ShopStatusResponse>(
    `/shops/${shopId}/settings`,
    settings
  );
  return response.data;
}

export async function updateShopSlotsApi(
  shopId: string,
  payload: {
    slotIds?: string[];
    slotIndices?: number[];
    status?: SlotStatus;
    customerName?: string;
    action?: 'close_break' | 'close_rest_of_today' | 'open_all';
  }
): Promise<ShopStatusResponse> {
  const response = await apiClient.patch<ShopStatusResponse>(
    `/shops/${shopId}/slots`,
    payload
  );
  return response.data;
}

export interface VoiceAssistantResponse {
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
  context?: any;
  updatedSlots?: SlotItem[];
}

export async function sendVoiceCommandApi(
  shopId: string,
  payload: {
    text: string;
    context?: any;
    confirm?: boolean;
  }
): Promise<VoiceAssistantResponse> {
  const response = await apiClient.post<VoiceAssistantResponse>(
    `/shops/${shopId}/voice-assistant`,
    payload
  );
  return response.data;
}
