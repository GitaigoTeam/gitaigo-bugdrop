import { beforeAll, beforeEach } from 'vitest';

function createMemoryLocalStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

beforeAll(() => {
  // Setup global test environment
  process.env.NODE_ENV = 'test';
});

beforeEach(() => {
  const storage =
    typeof globalThis.localStorage?.clear === 'function'
      ? globalThis.localStorage
      : createMemoryLocalStorage();

  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
});
