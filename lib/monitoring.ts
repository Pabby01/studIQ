import { ErrorType, ErrorSeverity, AppError } from './error-handler';
import { getErrorConfig } from './error-config';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  context?: Record<string, any>;
}

export interface ErrorMetric {
  error: AppError;
  timestamp: number;
  userAgent?: string;
  url?: string;
  userId?: string;
  sessionId?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: number;
  metrics: {
    errorRate: number;
    responseTime: number;
    uptime: number;
    activeUsers: number;
  };
}

class MonitoringService {
  private errorMetrics: ErrorMetric[] = [];
  private performanceMetrics: PerformanceMetric[] = [];
  private config = getErrorConfig();
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializePerformanceObserver();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializePerformanceObserver(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.trackPerformance({
              name: entry.name,
              value: entry.duration || entry.startTime,
              timestamp: Date.now(),
              context: {
                entryType: entry.entryType,
                startTime: entry.startTime,
              },
            });
          }
        });

        observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
      } catch (error) {
        console.warn('Performance observer not supported:', error);
      }
    }
  }

  trackError(error: AppError, context?: Record<string, any>): void {
    const errorMetric: ErrorMetric = {
      error,
      timestamp: Date.now(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      sessionId: this.sessionId,
      ...context,
    };

    this.errorMetrics.push(errorMetric);
    this.pruneOldMetrics();

    if (this.config.enableReporting) {
      this.reportError(errorMetric);
    }

    // Log critical errors immediately
    if (error.severity === ErrorSeverity.CRITICAL) {
      console.error('Critical error tracked:', errorMetric);
    }
  }

  trackPerformance(metric: PerformanceMetric): void {
    this.performanceMetrics.push(metric);
    this.pruneOldMetrics();

    // Alert on poor performance
    if (metric.name.includes('navigation') && metric.value > 5000) {
      console.warn('Slow page load detected:', metric);
    }
  }

  trackUserAction(action: string, context?: Record<string, any>): void {
    this.trackPerformance({
      name: `user_action_${action}`,
      value: Date.now(),
      timestamp: Date.now(),
      context: {
        action,
        sessionId: this.sessionId,
        ...context,
      },
    });
  }

  getErrorRate(timeWindow: number = 300000): number {
    const cutoff = Date.now() - timeWindow;
    const recentErrors = this.errorMetrics.filter(m => m.timestamp > cutoff);
    const totalActions = this.performanceMetrics.filter(m => 
      m.timestamp > cutoff && m.name.startsWith('user_action_')
    ).length;

    return totalActions > 0 ? recentErrors.length / totalActions : 0;
  }

  getSystemHealth(): SystemHealth {
    const now = Date.now();
    const fiveMinutesAgo = now - 300000;
    
    const recentErrors = this.errorMetrics.filter(m => m.timestamp > fiveMinutesAgo);
    const recentPerformance = this.performanceMetrics.filter(m => m.timestamp > fiveMinutesAgo);
    
    const errorRate = this.getErrorRate();
    const avgResponseTime = this.getAverageResponseTime();
    const activeUsers = this.getActiveUserCount();

    let status: SystemHealth['status'] = 'healthy';
    if (errorRate > 0.1 || avgResponseTime > 3000) {
      status = 'degraded';
    }
    if (errorRate > 0.2 || avgResponseTime > 5000) {
      status = 'critical';
    }

    return {
      status,
      timestamp: now,
      metrics: {
        errorRate,
        responseTime: avgResponseTime,
        uptime: this.getUptime(),
        activeUsers,
      },
    };
  }

  private getAverageResponseTime(): number {
    const navigationMetrics = this.performanceMetrics.filter(m => 
      m.name.includes('navigation') && m.timestamp > Date.now() - 300000
    );
    
    if (navigationMetrics.length === 0) return 0;
    
    const total = navigationMetrics.reduce((sum, m) => sum + m.value, 0);
    return total / navigationMetrics.length;
  }

  private getActiveUserCount(): number {
    // In a real implementation, this would track unique users
    // For now, return 1 if there's recent activity
    const recentActivity = this.performanceMetrics.filter(m => 
      m.timestamp > Date.now() - 300000
    );
    return recentActivity.length > 0 ? 1 : 0;
  }

  private getUptime(): number {
    // Simple uptime calculation based on session start
    return Date.now() - parseInt(this.sessionId.split('_')[1]);
  }

  private async reportError(errorMetric: ErrorMetric): Promise<void> {
    if (!this.config.reportingEndpoint) return;

    try {
      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'error',
          data: errorMetric,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.warn('Failed to report error:', error);
    }
  }

  private pruneOldMetrics(): void {
    const cutoff = Date.now() - 3600000; // Keep 1 hour of metrics
    this.errorMetrics = this.errorMetrics.filter(m => m.timestamp > cutoff);
    this.performanceMetrics = this.performanceMetrics.filter(m => m.timestamp > cutoff);
  }

  getMetricsSummary() {
    return {
      totalErrors: this.errorMetrics.length,
      totalPerformanceMetrics: this.performanceMetrics.length,
      errorsByType: this.getErrorsByType(),
      errorsBySeverity: this.getErrorsBySeverity(),
      systemHealth: this.getSystemHealth(),
    };
  }

  private getErrorsByType(): Record<ErrorType, number> {
    const counts = {} as Record<ErrorType, number>;
    
    Object.values(ErrorType).forEach(type => {
      counts[type] = 0;
    });

    this.errorMetrics.forEach(metric => {
      counts[metric.error.type]++;
    });

    return counts;
  }

  private getErrorsBySeverity(): Record<ErrorSeverity, number> {
    const counts = {} as Record<ErrorSeverity, number>;
    
    Object.values(ErrorSeverity).forEach(severity => {
      counts[severity] = 0;
    });

    this.errorMetrics.forEach(metric => {
      counts[metric.error.severity]++;
    });

    return counts;
  }

  // Real-time monitoring methods
  startHealthCheck(interval: number = 60000): void {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      const health = this.getSystemHealth();
      
      if (health.status === 'critical') {
        console.error('System health critical:', health);
      } else if (health.status === 'degraded') {
        console.warn('System health degraded:', health);
      }
    }, interval);
  }

  exportMetrics(): string {
    return JSON.stringify({
      session: this.sessionId,
      timestamp: Date.now(),
      errors: this.errorMetrics,
      performance: this.performanceMetrics,
      summary: this.getMetricsSummary(),
    }, null, 2);
  }
}

// Singleton instance
export const monitoring = new MonitoringService();

// Utility functions
export function trackError(error: AppError, context?: Record<string, any>): void {
  monitoring.trackError(error, context);
}

export function trackPerformance(name: string, value: number, context?: Record<string, any>): void {
  monitoring.trackPerformance({ name, value, timestamp: Date.now(), context });
}

export function trackUserAction(action: string, context?: Record<string, any>): void {
  monitoring.trackUserAction(action, context);
}

export function getSystemHealth(): SystemHealth {
  return monitoring.getSystemHealth();
}

export function startMonitoring(): void {
  monitoring.startHealthCheck();
}

// Initialize monitoring in browser environment
if (typeof window !== 'undefined') {
  startMonitoring();
}