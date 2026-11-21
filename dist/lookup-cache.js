const lookupCache = (() => {
  const memory = new Map();
  const pending = new Map();

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch (_) { return fallback; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (_) { /* Keep the in-memory result when browser storage is unavailable. */ }
  }

  function get(kind, key, fetchResult) {
    const storageKey = `auto_lookup_cache_v1_${kind}`;
    const identifier = JSON.stringify([kind, key]);
    const hit = memory.get(identifier) || read(storageKey, []).find(([id]) => id === key)?.[1];
    if (hit?.expiresAt > Date.now()) return Promise.resolve(hit.value);
    memory.delete(identifier);
    if (pending.has(identifier)) return pending.get(identifier);

    const request = Promise.resolve().then(fetchResult).then(({ value, expiresAt }) => {
      const expiry = Date.parse(expiresAt);
      if (expiry > Date.now()) {
        const entry = { value, expiresAt: expiry };
        memory.set(identifier, entry);
        if (memory.size > 128) memory.delete(memory.keys().next().value);
        const entries = [[key, entry], ...read(storageKey, []).filter(([id, item]) => id !== key && item.expiresAt > Date.now())].slice(0, 32);
        while (entries.length > 1 && JSON.stringify(entries).length > 650000) entries.pop();
        write(storageKey, entries);
      }
      return value;
    }).finally(() => pending.delete(identifier));
    pending.set(identifier, request);
    return request;
  }

  return { get, read, write };
})();
