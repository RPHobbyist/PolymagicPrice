/*
 * Minimal browser shims so storage-backed modules can be imported in Node.
 * The tests themselves exercise pure functions; this only keeps module-level
 * `window`/`localStorage` access from throwing on import.
 */

class MemoryStorage {
    private store = new Map<string, string>();
    getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
    setItem(key: string, value: string) { this.store.set(key, String(value)); }
    removeItem(key: string) { this.store.delete(key); }
    clear() { this.store.clear(); }
    key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
    get length() { return this.store.size; }
}

if (typeof globalThis.localStorage === "undefined") {
    Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), writable: true });
}

/**
 * A `window` that can carry events, so storage functions which announce a change (`saveQuote`,
 * `saveMachine`) can be exercised directly.
 *
 * `location.hostname` is deliberately not "localhost": several modules derive `isLocalhost` and
 * `isAIAllowed` from it at import time, and tests should keep seeing the same values they saw when
 * there was no window at all.
 */
if (typeof globalThis.window === "undefined") {
    const eventBus = new EventTarget();
    Object.defineProperty(globalThis, "window", {
        value: Object.assign(eventBus, {
            location: { hostname: "test.invalid", href: "https://test.invalid/" },
            localStorage: globalThis.localStorage,
        }),
        writable: true,
    });
}
