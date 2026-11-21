'use client';

import { getFirebaseAuth } from './firebase';

export class ApiError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

/** Call our own /api routes with the current user's Firebase ID token. */
export async function apiFetch<T = unknown>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.auth !== false) {
    const user = getFirebaseAuth().currentUser;
    if (!user) throw new ApiError(401, 'unauthenticated');
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(path, {
    method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? `http_${res.status}`);
  return data as T;
}
