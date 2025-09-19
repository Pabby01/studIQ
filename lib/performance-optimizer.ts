import { trackPerformance } from './monitoring';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface PerformanceConfig {
  enableCaching: boolean;
  defaultCacheTTL: number;
  maxCacheSize: number;
  enableDebouncing: boolean;
  defaultDebounceDelay: number;
  enableLazyLoading: boolean;
  enableResourceOptimization: boolean;
}

class PerformanceOptimizer {
  private cache = new Map<string, CacheEntry<any>>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private config: PerformanceConfig;
  private observers = new Map<string, IntersectionObserver>();

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      enableCaching: true,
      defaultCacheTTL: 300000, // 5 minutes
      maxCacheSize: 100,
      enableDebouncing: true,
      defaultDebounceDelay: 300,
      enableLazyLoading: true,
      enableResourceOptimization: true,
      ...config,
    };

    this.initializeCleanup();
  }

  private initializeCleanup(): void {
    // Clean up expired cache entries every minute
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000);
  }

  // Caching utilities
  set<T>(key: string, data: T, ttl?: number): void {
    if (!this.config.enableCaching) return;

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.config.maxCacheSize) {
      const oldestKey = this.getOldestCacheKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultCacheTTL,
      hits: 0,
    });

    trackPerformance('cache_set', 1, { key, dataSize: JSON.stringify(data).length });
  }

  get<T>(key: string): T | null {
    if (!this.config.enableCaching) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      trackPerformance('cache_miss_expired', 1, { key });
      return null;
    }

    entry.hits++;
    trackPerformance('cache_hit', 1, { key, hits: entry.hits });
    return entry.data;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    trackPerformance('cache_invalidate', 1, { key });
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
    trackPerformance('cache_invalidate_pattern', keysToDelete.length, { pattern });
  }

  private getOldestCacheKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    });

    return oldestKey;
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      trackPerformance('cache_cleanup', expiredKeys.length);
    }
  }

  // Debouncing utilities
  debounce<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay?: number
  ): (...args: Parameters<T>) => void {
    if (!this.config.enableDebouncing) {
      return func;
    }

    return (...args: Parameters<T>) => {
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        func(...args);
        this.debounceTimers.delete(key);
        trackPerformance('debounce_execute', 1, { key });
      }, delay || this.config.defaultDebounceDelay);

      this.debounceTimers.set(key, timer);
    };
  }

  // Throttling utilities
  throttle<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
        trackPerformance('throttle_execute', 1, { key });
      }
    };
  }

  // Lazy loading utilities
  createLazyLoader(
    selector: string,
    callback: (element: Element) => void,
    options?: IntersectionObserverInit
  ): void {
    if (!this.config.enableLazyLoading || typeof window === 'undefined') return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target);
          observer.unobserve(entry.target);
          trackPerformance('lazy_load_trigger', 1, { selector });
        }
      });
    }, {
      rootMargin: '50px',
      threshold: 0.1,
      ...options,
    });

    // Observe existing elements
    document.querySelectorAll(selector).forEach(element => {
      observer.observe(element);
    });

    this.observers.set(selector, observer);
  }

  // Memoization utilities
  memoize<T extends (...args: any[]) => any>(
    func: T,
    keyGenerator?: (...args: Parameters<T>) => string
  ): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        trackPerformance('memoize_hit', 1, { key });
        return cache.get(key);
      }

      const result = func(...args);
      cache.set(key, result);
      trackPerformance('memoize_miss', 1, { key });
      return result;
    }) as T;
  }

  // Resource optimization utilities
  preloadResource(url: string, type: 'script' | 'style' | 'image' | 'fetch' = 'fetch'): Promise<void> {
    if (!this.config.enableResourceOptimization) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      switch (type) {
        case 'script':
          const script = document.createElement('script');
          script.src = url;
          script.onload = () => {
            trackPerformance('preload_script', Date.now() - startTime, { url });
            resolve();
          };
          script.onerror = reject;
          document.head.appendChild(script);
          break;

        case 'style':
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = url;
          link.onload = () => {
            trackPerformance('preload_style', Date.now() - startTime, { url });
            resolve();
          };
          link.onerror = reject;
          document.head.appendChild(link);
          break;

        case 'image':
          const img = new Image();
          img.onload = () => {
            trackPerformance('preload_image', Date.now() - startTime, { url });
            resolve();
          };
          img.onerror = reject;
          img.src = url;
          break;

        case 'fetch':
        default:
          fetch(url)
            .then(() => {
              trackPerformance('preload_fetch', Date.now() - startTime, { url });
              resolve();
            })
            .catch(reject);
          break;
      }
    });
  }

  // Batch operations
  batchOperations<T>(
    operations: Array<() => Promise<T>>,
    batchSize: number = 5,
    delay: number = 100
  ): Promise<T[]> {
    return new Promise(async (resolve, reject) => {
      const results: T[] = [];
      const startTime = Date.now();

      try {
        for (let i = 0; i < operations.length; i += batchSize) {
          const batch = operations.slice(i, i + batchSize);
          const batchResults = await Promise.all(batch.map(op => op()));
          results.push(...batchResults);

          // Add delay between batches to prevent overwhelming the system
          if (i + batchSize < operations.length && delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        trackPerformance('batch_operations', Date.now() - startTime, {
          totalOperations: operations.length,
          batchSize,
          batches: Math.ceil(operations.length / batchSize),
        });

        resolve(results);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Performance monitoring
  measurePerformance<T>(
    name: string,
    operation: () => T | Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    return new Promise(async (resolve, reject) => {
      const startTime = Date.now();
      
      try {
        const result = await operation();
        const duration = Date.now() - startTime;
        
        trackPerformance(name, duration, context);
        resolve(result);
      } catch (error) {
        const duration = Date.now() - startTime;
        trackPerformance(`${name}_error`, duration, { ...context, error: (error as Error).message });
        reject(error);
      }
    });
  }

  // Cache statistics
  getCacheStats() {
    const stats = {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      hitRate: 0,
      totalHits: 0,
      entries: [] as Array<{ key: string; hits: number; age: number; size: number }>,
    };

    let totalHits = 0;
    let totalAccesses = 0;

    this.cache.forEach((entry, key) => {
      totalHits += entry.hits;
      totalAccesses += entry.hits + 1; // +1 for the initial set

      stats.entries.push({
        key,
        hits: entry.hits,
        age: Date.now() - entry.timestamp,
        size: JSON.stringify(entry.data).length,
      });
    });

    stats.totalHits = totalHits;
    stats.hitRate = totalAccesses > 0 ? totalHits / totalAccesses : 0;

    return stats;
  }

  // Cleanup
  destroy(): void {
    this.cache.clear();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

// Utility functions
export function cacheGet<T>(key: string): T | null {
  return performanceOptimizer.get<T>(key);
}

export function cacheSet<T>(key: string, data: T, ttl?: number): void {
  performanceOptimizer.set(key, data, ttl);
}

export function debounce<T extends (...args: any[]) => any>(
  key: string,
  func: T,
  delay?: number
): (...args: Parameters<T>) => void {
  return performanceOptimizer.debounce(key, func, delay);
}

export function throttle<T extends (...args: any[]) => any>(
  key: string,
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  return performanceOptimizer.throttle(key, func, limit);
}

export function memoize<T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T {
  return performanceOptimizer.memoize(func, keyGenerator);
}

export function measurePerformance<T>(
  name: string,
  operation: () => T | Promise<T>,
  context?: Record<string, any>
): Promise<T> {
  return performanceOptimizer.measurePerformance(name, operation, context);
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    performanceOptimizer.destroy();
  });
}