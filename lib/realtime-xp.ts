import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface XPUpdateEvent {
  userId: string;
  newXP: number;
  change: number;
  hubType: 'campus' | 'learning' | 'finance';
  action: string;
  timestamp: string;
}

export interface BadgeUnlockEvent {
  userId: string;
  badgeId: string;
  badgeName: string;
  badgeDescription: string;
  timestamp: string;
}

export interface LeaderboardUpdateEvent {
  userId: string;
  newRank: number;
  previousRank: number;
  totalXP: number;
  timestamp: string;
}

class RealtimeXPService {
  private supabase = createClientComponentClient();
  private channels: Map<string, RealtimeChannel> = new Map();
  private listeners: Map<string, Set<Function>> = new Map();

  // Subscribe to XP updates for a specific user
  subscribeToUserXP(userId: string, callback: (event: XPUpdateEvent) => void): () => void {
    const channelName = `user_xp_${userId}`;
    
    if (!this.channels.has(channelName)) {
      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_xp',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            const event: XPUpdateEvent = {
              userId: payload.new.user_id,
              newXP: payload.new.total_xp,
              change: payload.new.total_xp - (payload.old?.total_xp || 0),
              hubType: payload.new.hub_type || 'campus',
              action: 'xp_update',
              timestamp: new Date().toISOString()
            };
            this.notifyListeners(channelName, event);
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
      this.listeners.set(channelName, new Set());
    }

    const listeners = this.listeners.get(channelName)!;
    listeners.add(callback);

    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        const channel = this.channels.get(channelName);
        if (channel) {
          this.supabase.removeChannel(channel);
          this.channels.delete(channelName);
          this.listeners.delete(channelName);
        }
      }
    };
  }

  // Subscribe to badge unlocks for a specific user
  subscribeToUserBadges(userId: string, callback: (event: BadgeUnlockEvent) => void): () => void {
    const channelName = `user_badges_${userId}`;
    
    if (!this.channels.has(channelName)) {
      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_badges',
            filter: `user_id=eq.${userId}`
          },
          async (payload) => {
            // Fetch badge details
            const { data: badge } = await this.supabase
              .from('badges')
              .select('*')
              .eq('id', payload.new.badge_id)
              .single();

            if (badge) {
              const event: BadgeUnlockEvent = {
                userId: payload.new.user_id,
                badgeId: badge.id,
                badgeName: badge.name,
                badgeDescription: badge.description,
                timestamp: payload.new.unlocked_at
              };
              this.notifyListeners(channelName, event);
            }
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
      this.listeners.set(channelName, new Set());
    }

    const listeners = this.listeners.get(channelName)!;
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        const channel = this.channels.get(channelName);
        if (channel) {
          this.supabase.removeChannel(channel);
          this.channels.delete(channelName);
          this.listeners.delete(channelName);
        }
      }
    };
  }

  // Subscribe to global leaderboard updates
  subscribeToLeaderboard(callback: (event: LeaderboardUpdateEvent) => void): () => void {
    const channelName = 'global_leaderboard';
    
    if (!this.channels.has(channelName)) {
      const channel = this.supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'user_xp'
          },
          async (payload) => {
            // Calculate new rank for the updated user
            const { data: rankData } = await this.supabase
              .rpc('get_user_rank', { user_id: payload.new.user_id });

            if (rankData) {
              const event: LeaderboardUpdateEvent = {
                userId: payload.new.user_id,
                newRank: rankData.rank,
                previousRank: rankData.previous_rank || rankData.rank,
                totalXP: payload.new.total_xp,
                timestamp: new Date().toISOString()
              };
              this.notifyListeners(channelName, event);
            }
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
      this.listeners.set(channelName, new Set());
    }

    const listeners = this.listeners.get(channelName)!;
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        const channel = this.channels.get(channelName);
        if (channel) {
          this.supabase.removeChannel(channel);
          this.channels.delete(channelName);
          this.listeners.delete(channelName);
        }
      }
    };
  }

  private notifyListeners(channelName: string, event: any) {
    const listeners = this.listeners.get(channelName);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in realtime listener:', error);
        }
      });
    }
  }

  // Clean up all subscriptions
  cleanup() {
    this.channels.forEach(channel => {
      this.supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.listeners.clear();
  }
}

// Export singleton instance
export const realtimeXPService = new RealtimeXPService();