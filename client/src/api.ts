export interface User {
  id: string;
  phone: string | null;
  name: string | null;
  points: number;
  total_redeemed: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'add' | 'redeem';
  points: number;
  note: string;
  created_at: string;
}

export interface Stats {
  totalUsers: number;
  totalPoints: number;
  totalRedeemed: number;
  todayAdded: number;
}

export interface PointSaver extends User {
  last_stamp_at: string;
}

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export const api = {
  register: (body: { phone?: string; name?: string }) =>
    request<{ user: User; isNew: boolean }>('/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),

  getUser: (id: string) =>
    request<{ user: User }>(`/users/${encodeURIComponent(id)}`),

  getTransactions: (id: string) =>
    request<{ transactions: Transaction[] }>(`/users/${encodeURIComponent(id)}/transactions`),

  addPoint: (userId: string, staffToken: string) =>
    request<{ user: User; message: string }>('/points/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-staff-token': staffToken },
      body: JSON.stringify({ userId }),
    }),

  redeem: (userId: string, staffToken: string) =>
    request<{ user: User; message: string }>('/points/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-staff-token': staffToken },
      body: JSON.stringify({ userId }),
    }),

  adminAuth: (password: string) =>
    request<{ ok: boolean }>('/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    }),

  staffAuth: (token: string) =>
    request<{ ok: boolean }>('/staff/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    }),

  adminStats: (password: string) =>
    request<Stats>('/admin/stats', {
      headers: { 'x-admin-password': password },
    }),

  adminUsers: (password: string) =>
    request<{ users: User[] }>('/admin/users', {
      headers: { 'x-admin-password': password },
    }),

  adminRecentPointSavers: (password: string) =>
    request<{ users: PointSaver[] }>('/admin/recent-point-savers', {
      headers: { 'x-admin-password': password },
    }),

  adminUpdateUserPoints: (userId: string, password: string, points: number) =>
    request<{ user: User }>(`/admin/users/${encodeURIComponent(userId)}/points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': password,
      },
      body: JSON.stringify({ points }),
    }),

  adminDeleteUser: (userId: string, password: string) =>
    request<{ ok: boolean }>(`/admin/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: { 'x-admin-password': password },
    }),
};
