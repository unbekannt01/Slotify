import { apiClient } from './client';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'owner';
  shopId: string | null;
  shop?: {
    id: string;
    name: string;
    category: string;
    area: string;
    phone: string;
    workingHoursStart: string;
    workingHoursEnd: string;
    slotDurationMinutes: number;
  } | null;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export async function loginApi(email: string, password: string): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>('/auth/login', {
    email,
    password,
  });
  return response.data;
}

export async function getMeApi(): Promise<User> {
  const response = await apiClient.get<User>('/auth/me');
  return response.data;
}
