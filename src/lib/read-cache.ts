type ReadCacheEntry<T = unknown> = {
  key: string;
  data: T;
  timestamp: number;
  expiry: number;
  scopeKey?: string;
  version: number;
};

type GetOrComputeOptions = {
  scopeKey?: string;
};

const DEFAULT_SCOPE = 'global';
const READ_CACHE_DEBUG_FLAG = 'NEXT_PUBLIC_READ_CACHE_DEBUG';

const entries = new Map<string, ReadCacheEntry>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const scopeVersions = new Map<string, number>();

let listenersAttached = false;
let debugEnabled = process.env[READ_CACHE_DEBUG_FLAG] === 'true';

function logReadCache(event: string, details: string) {
  if (!debugEnabled) return;
  console.info(`[read-cache] ${event}: ${details}`);
}

function getScopeVersion(scopeKey?: string) {
  return scopeVersions.get(scopeKey || DEFAULT_SCOPE) || 0;
}

function bumpScopeVersion(scopeKey?: string) {
  const resolvedScope = scopeKey || DEFAULT_SCOPE;
  const nextVersion = getScopeVersion(resolvedScope) + 1;
  scopeVersions.set(resolvedScope, nextVersion);
  logReadCache('CACHE INVALIDATED', resolvedScope);
  return nextVersion;
}

function removeMatchingEntries(predicate: (entry: ReadCacheEntry) => boolean) {
  for (const [key, entry] of entries.entries()) {
    if (predicate(entry)) {
      entries.delete(key);
      inFlightRequests.delete(key);
    }
  }
}

function attachGlobalListeners() {
  if (listenersAttached || typeof window === 'undefined') return;
  listenersAttached = true;

  window.addEventListener('company-changed', () => {
    clearAllReadCache();
  });

  window.addEventListener('sync-complete', () => {
    clearAllReadCache();
  });

  window.addEventListener('storage', () => {
    clearAllReadCache();
  });
}

function isEntryValid(entry: ReadCacheEntry, scopeKey?: string) {
  return entry.expiry > Date.now() && entry.version === getScopeVersion(scopeKey);
}

export function setReadCacheDebug(enabled: boolean) {
  debugEnabled = enabled;
}

export function buildReadCacheScope(authMode: string, companyId?: string | null) {
  return `${authMode}:${companyId || 'no-company'}`;
}

export function buildReadCacheKey(scopeKey: string, ...parts: Array<string | number | undefined | null>) {
  return [scopeKey, ...parts.filter((part) => part !== undefined && part !== null && part !== '')].join(':');
}

export function getOrCompute<T>(
  key: string,
  ttlMs: number,
  compute: () => T,
  options: GetOrComputeOptions = {}
): T {
  attachGlobalListeners();

  const existing = entries.get(key);
  if (existing && isEntryValid(existing, options.scopeKey)) {
    logReadCache('CACHE HIT', key);
    return existing.data as T;
  }

  logReadCache(existing ? 'CACHE EXPIRED' : 'CACHE MISS', key);
  const data = compute();
  entries.set(key, {
    key,
    data,
    timestamp: Date.now(),
    expiry: Date.now() + ttlMs,
    scopeKey: options.scopeKey,
    version: getScopeVersion(options.scopeKey),
  });
  return data;
}

export function getOrComputeAsync<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>,
  options: GetOrComputeOptions = {}
): Promise<T> {
  attachGlobalListeners();

  const existing = entries.get(key);
  if (existing && isEntryValid(existing, options.scopeKey)) {
    logReadCache('CACHE HIT', key);
    return Promise.resolve(existing.data as T);
  }

  const pending = inFlightRequests.get(key) as Promise<T> | undefined;
  if (pending) {
    logReadCache('CACHE IN-FLIGHT', key);
    return pending;
  }

  logReadCache(existing ? 'CACHE EXPIRED' : 'CACHE MISS', key);

  const request = compute()
    .then((data) => {
      entries.set(key, {
        key,
        data,
        timestamp: Date.now(),
        expiry: Date.now() + ttlMs,
        scopeKey: options.scopeKey,
        version: getScopeVersion(options.scopeKey),
      });
      return data;
    })
    .finally(() => {
      inFlightRequests.delete(key);
    });

  inFlightRequests.set(key, request);
  return request;
}

export function invalidate(keyOrPrefix: string, options: { prefix?: boolean } = {}) {
  const removedExact = entries.delete(keyOrPrefix);
  inFlightRequests.delete(keyOrPrefix);

  if (options.prefix || !removedExact) {
    removeMatchingEntries((entry) => entry.key.startsWith(keyOrPrefix));
  }

  logReadCache('CACHE INVALIDATED', keyOrPrefix);
}

export function invalidateScope(scopeKey: string) {
  removeMatchingEntries((entry) => entry.scopeKey === scopeKey || entry.key.startsWith(`${scopeKey}:`));
  bumpScopeVersion(scopeKey);
}

export function clearAllReadCache() {
  entries.clear();
  inFlightRequests.clear();
  scopeVersions.clear();
  logReadCache('CACHE INVALIDATED', 'all');
}

export function invalidateTaskReadCache(scopeKey: string, taskId?: string) {
  invalidate(buildReadCacheKey(scopeKey, 'tasks'));
  invalidate(buildReadCacheKey(scopeKey, 'tasks-by-field'), { prefix: true });
  invalidate(buildReadCacheKey(scopeKey, 'duplicates'));
  invalidate(buildReadCacheKey(scopeKey, 'recent-tasks'), { prefix: true });
  invalidate(buildReadCacheKey(scopeKey, 'recent-imported-tasks'), { prefix: true });
  if (taskId) {
    invalidate(buildReadCacheKey(scopeKey, 'task', taskId));
  } else {
    invalidate(buildReadCacheKey(scopeKey, 'task'), { prefix: true });
  }
}

export function invalidateNoteReadCache(scopeKey: string, noteId?: string) {
  invalidate(buildReadCacheKey(scopeKey, 'notes'));
  if (noteId) {
    invalidate(buildReadCacheKey(scopeKey, 'note', noteId));
  } else {
    invalidate(buildReadCacheKey(scopeKey, 'note'), { prefix: true });
  }
}
