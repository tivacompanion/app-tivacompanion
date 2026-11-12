/**
 * LRU (Least Recently Used) Cache Implementation with optional TTL (Time-To-Live).
 * 
 * Uses ES6 Map for O(1) key lookups and insertion-order eviction.
 * Thread-safe for single-threaded JavaScript execution environments.
 */

export class LRUCache {
  /**
   * @param {Object} options
   * @param {number} [options.capacity=100] Maximum number of entries before eviction
   * @param {number} [options.ttlMs=0] Default time-to-live in milliseconds (0 = no expiration)
   */
  constructor({ capacity = 100, ttlMs = 0 } = {}) {
    if (capacity <= 0) throw new Error('LRUCache capacity must be greater than 0');
    this.capacity = capacity;
    this.defaultTtlMs = ttlMs;
    this.cache = new Map(); // key -> { value, expiresAt }
  }

  /**
   * Retrieves a value from the cache and marks it as Most Recently Used.
   * Evicts the entry if it has expired.
   * @param {string|any} key
   * @returns {any|undefined} The cached value, or undefined if missing/expired
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // Refresh recency: Delete and re-set to move to end of iteration order
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /**
   * Sets or updates a value in the cache.
   * If capacity is exceeded, evicts the Least Recently Used item.
   * @param {string|any} key
   * @param {any} value
   * @param {number} [ttlMs] Optional per-item TTL override in milliseconds
   * @returns {LRUCache} this instance for chaining
   */
  set(key, value, ttlMs = this.defaultTtlMs) {
    // If key exists, delete first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict the least recently used entry (first entry in Map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : null;
    this.cache.set(key, { value, expiresAt });
    return this;
  }

  /**
   * Checks if an unexpired key exists in the cache without altering its recency.
   * @param {string|any} key
   * @returns {boolean}
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Returns a value without altering its recency position in the cache.
   * @param {string|any} key
   * @returns {any|undefined}
   */
  peek(key) {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  /**
   * Removes a specific key from the cache.
   * @param {string|any} key
   * @returns {boolean} True if removed, false if not found
   */
  delete(key) {
    return this.cache.delete(key);
  }

  /**
   * Purges all entries from the cache.
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Current number of unexpired entries in the cache.
   * @returns {number}
   */
  get size() {
    this.purgeExpired();
    return this.cache.size;
  }

  /**
   * Evicts any expired entries from the cache.
   */
  purgeExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Wraps an async or sync function with an LRU cache.
   * @param {Function} fn The function to memoize
   * @param {Function} [keyFn] Key generation function (defaults to JSON.stringify)
   * @returns {Function} Memoized function
   */
  memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
    return async (...args) => {
      const key = keyFn(...args);
      if (this.has(key)) {
        return this.get(key);
      }
      const result = await fn(...args);
      this.set(key, result);
      return result;
    };
  }
}

/**
 * Creates an LRUCache instance.
 * @param {Object} options
 * @returns {LRUCache}
 */
export function createLRU(options) {
  return new LRUCache(options);
}

// ------------------------------------------------------------------------------
// Application-Level LRU Singletons for Hot Subsystems
// ------------------------------------------------------------------------------

/**
 * LRU Cache for Text-to-Speech audio URLs / blobs.
 * Avoids redundant network roundtrips for repeated voice reminders and prompts.
 * Capacity: 60 phrases | TTL: 1 hour (3,600,000 ms)
 */
export const ttsLRUCache = new LRUCache({
  capacity: 60,
  ttlMs: 60 * 60 * 1000,
});

/**
 * LRU Cache for AI Companion / LLM static queries and explanations.
 * Capacity: 100 responses | TTL: 30 minutes (1,800,000 ms)
 */
export const llmLRUCache = new LRUCache({
  capacity: 100,
  ttlMs: 30 * 60 * 1000,
});

/**
 * LRU Cache for First Responder Public Emergency Snapshot lookups.
 * Capacity: 30 cards | TTL: 3 minutes (180,000 ms)
 */
export const emergencySnapshotLRUCache = new LRUCache({
  capacity: 30,
  ttlMs: 3 * 60 * 1000,
});

/**
 * LRU Cache for Medical Vault Document Previews & AI Summaries.
 * Capacity: 50 documents | TTL: 15 minutes (900,000 ms)
 */
export const documentAnalysisLRUCache = new LRUCache({
  capacity: 50,
  ttlMs: 15 * 60 * 1000,
});

export default LRUCache;
