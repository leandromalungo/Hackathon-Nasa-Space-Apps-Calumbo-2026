import type { IntegrationLogItem } from '../../types/mbongo';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();
const integrationLogs: IntegrationLogItem[] = [];

export function getCached<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function addIntegrationLog(log: Omit<IntegrationLogItem, 'id' | 'timestamp'>): void {
  integrationLogs.unshift({
    ...log,
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  });
  if (integrationLogs.length > 100) {
    integrationLogs.length = 100;
  }
}

export function getIntegrationLogs(): IntegrationLogItem[] {
  return integrationLogs;
}
