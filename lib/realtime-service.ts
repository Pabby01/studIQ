import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RealtimeChannel, type RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { errorHandler, ErrorType, ErrorSeverity } from './error-handler';
import { trackError, trackPerformance } from './monitoring';

export interface RealtimeSubscription {
  id: string;
  channel: RealtimeChannel;
  table: string;
  filter?: string;
  callback: (payload: RealtimePostgresChangesPayload<any>) => void;
  onError?: (error: Error) => void;
  retryCount: number;
  maxRetries: number;
  isActive: boolean;
}

export interface RealtimeConfig {
  enableHeartbeat: boolean;
  heartbeatInterval: number;
  reconnectDelay: number;
  maxReconnectAttempts: number;
  enableBatching: boolean;
  batchDelay: number;
  enableCompression: boolean;
}

class RealtimeService {
  private supabase = createClientComponentClient();
  private subscriptions = new Map<string, RealtimeSubscription>();
  private config: RealtimeConfig;
  private isConnected = false;
  private reconnectAttempts = 0;
  private heartbeatTimer?: NodeJS.Timeout;
  private batchTimer?: NodeJS.Timeout;
  private pendingUpdates: Array<{ id: string; payload: any; timestamp: number }> = [];

  constructor(config?: Partial<RealtimeConfig>) {
    this.config = {
      enableHeartbeat: true,
      heartbeatInterval: 30000, // 30 seconds
      reconnectDelay: 1000,
      maxReconnectAttempts: 5,
      enableBatching: true,
      batchDelay: 100, // 100ms
      enableCompression: false,
      ...config,
    };

    this.initializeConnection();
  }

  private initializeConnection(): void {
    try {
      // Connection status is managed by individual channels
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('Realtime service initialized');
    } catch (error) {
      this.handleConnectionError(error as Error);
    }
  }

  private startHeartbeat(): void {
    if (!this.config.enableHeartbeat) return;

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        // Heartbeat is handled automatically by Supabase channels
        console.log('Heartbeat check - connection active');
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private handleConnectionError(error: Error): void {
    const appError = errorHandler.parseError(error, 'realtime_connection');
    trackError(appError, { context: 'realtime_connection' });
    
    console.error('Realtime connection error:', error);
    this.handleReconnect();
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      const error = errorHandler.parseError(
        new Error('Max reconnection attempts reached'),
        'realtime_reconnect_failed'
      );
      trackError(error, { context: 'realtime_reconnect_failed' });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
      this.resubscribeAll();
    }, delay);
  }

  private resubscribeAll(): void {
    const subscriptions = Array.from(this.subscriptions.values());
    
    subscriptions.forEach(subscription => {
      if (subscription.isActive) {
        this.unsubscribe(subscription.id);
        this.subscribe(
          subscription.id,
          subscription.table,
          subscription.callback,
          subscription.filter,
          subscription.onError
        );
      }
    });
  }

  subscribe(
    id: string,
    table: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void,
    filter?: string,
    onError?: (error: Error) => void,
    events: string[] = ['*']
  ): string {
    try {
      // Unsubscribe existing subscription with same ID
      if (this.subscriptions.has(id)) {
        this.unsubscribe(id);
      }

      const startTime = Date.now();
      const channelName = `${table}_${id}_${Date.now()}`;
      
      const channel = this.supabase.channel(channelName);

      // Add postgres changes listener
      events.forEach(event => {
        const config: any = {
          event,
          schema: 'public',
          table,
        };

        if (filter) {
          config.filter = filter;
        }

        channel.on('postgres_changes', config, (payload: RealtimePostgresChangesPayload<any>) => {
          this.handleRealtimeUpdate(id, payload, callback);
        });
      });

      // Subscribe to the channel
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          trackPerformance('realtime_subscription_success', Date.now() - startTime, {
            table,
            filter,
            subscriptionId: id,
          });
        } else if (status === 'CHANNEL_ERROR') {
          const error = new Error(`Subscription failed for ${table}`);
          this.handleSubscriptionError(id, error, onError);
        }
      });

      const subscription: RealtimeSubscription = {
        id,
        channel,
        table,
        filter,
        callback,
        onError,
        retryCount: 0,
        maxRetries: 3,
        isActive: true,
      };

      this.subscriptions.set(id, subscription);
      return id;

    } catch (error) {
      this.handleSubscriptionError(id, error as Error, onError);
      throw error;
    }
  }

  private handleRealtimeUpdate(
    subscriptionId: string,
    payload: RealtimePostgresChangesPayload<any>,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ): void {
    try {
      if (this.config.enableBatching) {
        this.addToBatch(subscriptionId, payload, callback);
      } else {
        callback(payload);
      }

      trackPerformance('realtime_update_processed', 1, {
        subscriptionId,
        eventType: payload.eventType,
        table: payload.table,
      });

    } catch (error) {
      const subscription = this.subscriptions.get(subscriptionId);
      this.handleSubscriptionError(subscriptionId, error as Error, subscription?.onError);
    }
  }

  private addToBatch(
    subscriptionId: string,
    payload: RealtimePostgresChangesPayload<any>,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void
  ): void {
    this.pendingUpdates.push({
      id: subscriptionId,
      payload: { ...payload, callback },
      timestamp: Date.now(),
    });

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, this.config.batchDelay);
    }
  }

  private processBatch(): void {
    if (this.pendingUpdates.length === 0) return;

    const updates = [...this.pendingUpdates];
    this.pendingUpdates = [];
    this.batchTimer = undefined;

    // Group updates by subscription ID
    const groupedUpdates = updates.reduce((acc, update) => {
      if (!acc[update.id]) {
        acc[update.id] = [];
      }
      acc[update.id].push(update);
      return acc;
    }, {} as Record<string, typeof updates>);

    // Process each group
    Object.entries(groupedUpdates).forEach(([subscriptionId, subscriptionUpdates]) => {
      try {
        // For now, process each update individually
        // In the future, we could implement smart batching logic
        subscriptionUpdates.forEach(update => {
          const { callback, ...payload } = update.payload;
          callback(payload);
        });
      } catch (error) {
        const subscription = this.subscriptions.get(subscriptionId);
        this.handleSubscriptionError(subscriptionId, error as Error, subscription?.onError);
      }
    });
  }

  private handleSubscriptionError(
    subscriptionId: string,
    error: Error,
    onError?: (error: Error) => void
  ): void {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (subscription && subscription.retryCount < subscription.maxRetries) {
      subscription.retryCount++;
      
      setTimeout(() => {
        if (subscription.isActive) {
          this.subscribe(
            subscription.id,
            subscription.table,
            subscription.callback,
            subscription.filter,
            subscription.onError
          );
        }
      }, 1000 * subscription.retryCount);
    } else {
      const appError = errorHandler.parseError(error, 'realtime_subscription_error');
      trackError(appError, { 
        context: 'realtime_subscription_error',
        subscriptionId,
        table: subscription?.table,
      });

      if (onError) {
        onError(error);
      }
    }
  }

  unsubscribe(id: string): void {
    const subscription = this.subscriptions.get(id);
    
    if (subscription) {
      subscription.isActive = false;
      
      try {
        this.supabase.removeChannel(subscription.channel);
      } catch (error) {
        console.warn('Error removing channel:', error);
      }
      
      this.subscriptions.delete(id);
    }
  }

  unsubscribeAll(): void {
    const subscriptionIds = Array.from(this.subscriptions.keys());
    subscriptionIds.forEach(id => this.unsubscribe(id));
  }

  getActiveSubscriptions(): RealtimeSubscription[] {
    return Array.from(this.subscriptions.values()).filter(sub => sub.isActive);
  }

  getConnectionStatus(): {
    isConnected: boolean;
    activeSubscriptions: number;
    reconnectAttempts: number;
    pendingUpdates: number;
  } {
    return {
      isConnected: this.isConnected,
      activeSubscriptions: this.getActiveSubscriptions().length,
      reconnectAttempts: this.reconnectAttempts,
      pendingUpdates: this.pendingUpdates.length,
    };
  }

  // Utility methods for common subscription patterns
  subscribeToUserData(
    userId: string,
    table: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void,
    onError?: (error: Error) => void
  ): string {
    return this.subscribe(
      `user_${table}_${userId}`,
      table,
      callback,
      `user_id=eq.${userId}`,
      onError
    );
  }

  subscribeToRecord(
    recordId: string,
    table: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void,
    onError?: (error: Error) => void
  ): string {
    return this.subscribe(
      `record_${table}_${recordId}`,
      table,
      callback,
      `id=eq.${recordId}`,
      onError
    );
  }

  subscribeToTable(
    table: string,
    callback: (payload: RealtimePostgresChangesPayload<any>) => void,
    onError?: (error: Error) => void
  ): string {
    return this.subscribe(
      `table_${table}`,
      table,
      callback,
      undefined,
      onError
    );
  }

  // Cleanup method
  destroy(): void {
    this.stopHeartbeat();
    this.unsubscribeAll();
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
  }
}

// Singleton instance
export const realtimeService = new RealtimeService();

// Utility functions
export function subscribeToUserData(
  userId: string,
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<any>) => void,
  onError?: (error: Error) => void
): string {
  return realtimeService.subscribeToUserData(userId, table, callback, onError);
}

export function subscribeToRecord(
  recordId: string,
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<any>) => void,
  onError?: (error: Error) => void
): string {
  return realtimeService.subscribeToRecord(recordId, table, callback, onError);
}

export function unsubscribe(subscriptionId: string): void {
  realtimeService.unsubscribe(subscriptionId);
}

export function getRealtimeStatus() {
  return realtimeService.getConnectionStatus();
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    realtimeService.destroy();
  });
}