import { apiClient } from './client';
import { PublicShopItem } from './shopApi';

export interface AdminStats {
  totalShops: number;
  availableShops: number;
  busyShops: number;
  closedShops: number;
  totalSlotsToday: number;
  bookedSlotsToday: number;
  availableSlotsToday: number;
}

export interface CreateShopPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  area?: string;
  category?: string;
  workingHoursStart?: string;
  workingHoursEnd?: string;
  slotDurationMinutes?: number;
}

export async function getAdminShopsApi(): Promise<PublicShopItem[]> {
  const response = await apiClient.get<PublicShopItem[]>('/admin/shops');
  return response.data;
}

export async function createOwnerAndShopApi(payload: CreateShopPayload): Promise<any> {
  const response = await apiClient.post('/admin/shops', payload);
  return response.data;
}

export async function updateAdminShopApi(
  shopId: string,
  payload: Partial<CreateShopPayload>
): Promise<any> {
  const response = await apiClient.patch(`/admin/shops/${shopId}`, payload);
  return response.data;
}

export async function deleteShopApi(shopId: string): Promise<any> {
  const response = await apiClient.delete(`/admin/shops/${shopId}`);
  return response.data;
}

export async function getAdminStatsApi(): Promise<AdminStats> {
  const response = await apiClient.get<AdminStats>('/admin/stats');
  return response.data;
}
