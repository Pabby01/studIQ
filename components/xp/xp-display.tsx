/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Star, 
  Zap, 
  TrendingUp, 
  Calendar,
  Award,
  Target,
  Flame
} from 'lucide-react';
import { realtimeXPService, XPUpdateEvent, BadgeUnlockEvent } from '@/lib/realtime-xp';

interface XPData {
  total: number;
  campus: number;
  learning: number;
  finance: number;
  club: number;
  dailyStreak: number;
  lastLogin: string | null;
  lastUpdated: string | null;
}

interface XPDisplayProps {
  userId?: string;
  showDetails?: boolean;
  compact?: boolean;
  onXPUpdate?: (newXP: number, change: number) => void;
}

function XPDisplay({ 
  userId, 
  showDetails = true, 
  compact = false,
  onXPUpdate 
}: XPDisplayProps) {
  const [xpData, setXpData] = useState<XPData | null>(null);
  const [level, setLevel] = useState(1);
  const [badge, setBadge] = useState('Bronze');
  const [progress, setProgress] = useState({ current: 0, required: 100, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const supabase = createClientComponentClient();

  // Fetch XP data
  const fetchXPData = async () => {
    try {
      const response = await fetch(`/api/xp${userId ? `?user_id=${userId}` : ''}`);
      if (!response.ok) throw new Error('Failed to fetch XP data');
      
      const data = await response.json();
      setXpData(data.xp);
      setLevel(data.level);
      setBadge(data.badge);
      setProgress(data.progress);
      setRecentActivity(data.recentActivity);
    } catch (error) {
      console.error('Error fetching XP data:', error);
      toast({
        title: "Error",
        description: "Failed to load XP data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle daily login
  const handleDailyLogin = async () => {
    try {
      const response = await fetch('/api/xp/daily-login', {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to award daily login XP');
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Daily Login Bonus! 🎉",
          description: `+${data.xpAwarded} XP • ${data.message}`,
          duration: 5000
        });
        
        // Refresh XP data
        fetchXPData();
        
        if (onXPUpdate) {
          onXPUpdate(data.totalXp, data.xpAwarded);
        }
      }
    } catch (error) {
      console.error('Error awarding daily login XP:', error);
    }
  };

  // Set up real-time subscription
  useEffect(() => {
    fetchXPData();

    // Subscribe to XP changes
    const channel = supabase
      .channel('xp-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_xp',
          filter: userId ? `user_id=eq.${userId}` : undefined
        },
        (payload) => {
          console.log('XP update received:', payload);
          fetchXPData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Set up realtime subscriptions
  useEffect(() => {
    if (!userId) return;

    const unsubscribeXP = realtimeXPService.subscribeToUserXP(
      userId,
      (event: XPUpdateEvent) => {
        setXpData(prev => prev ? {
          ...prev,
          total: event.newXP,
        } : null);
        
        const newLevel = Math.floor(event.newXP / 100) + 1;
        setLevel(newLevel);
        
        const currentLevelXP = event.newXP % 100;
        const requiredXP = 100;
        setProgress({
          current: currentLevelXP,
          required: requiredXP,
          percentage: (currentLevelXP / requiredXP) * 100
        });
        
        if (onXPUpdate) {
          onXPUpdate(event.newXP, event.change);
        }
      }
    );

    const unsubscribeBadges = realtimeXPService.subscribeToUserBadges(
      userId,
      (event: BadgeUnlockEvent) => {
        setBadge(event.badgeName);
        
        toast({
          title: "New Badge Unlocked! 🏆",
          description: `You've earned the ${event.badgeName} badge!`,
          duration: 5000
        });
      }
    );

    return () => {
      unsubscribeXP();
      unsubscribeBadges();
    };
  }, [userId, onXPUpdate]);

  // Check for daily login opportunity
  useEffect(() => {
    if (xpData && !userId) { // Only for current user
      const today = new Date().toDateString();
      const lastLogin = xpData.lastLogin ? new Date(xpData.lastLogin).toDateString() : null;
      
      if (lastLogin !== today) {
        // Show daily login opportunity after a short delay
        setTimeout(() => {
          toast({
            title: "Daily Login Available! 🌟",
            description: "Click to claim your daily XP bonus",
            action: (
              <Button size="sm" onClick={handleDailyLogin}>
                Claim +5 XP
              </Button>
            ),
            duration: 10000
          });
        }, 2000);
      }
    }
  }, [xpData, userId]);

  if (loading) {
    return (
      <Card className={compact ? "p-4" : ""}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <motion.div 
        className="flex items-center space-x-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className="font-semibold text-lg">{xpData?.total || 0}</span>
          <span className="text-sm text-gray-600">XP</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Star className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium">Level {level}</span>
        </div>
        
        <Badge variant="secondary" className="text-xs">
          {badge}
        </Badge>
        
        {xpData?.dailyStreak && xpData.dailyStreak > 0 && (
          <div className="flex items-center space-x-1">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-medium">{xpData.dailyStreak}</span>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span>Experience Points</span>
          </div>
          <Badge variant="outline" className="text-sm">
            {badge}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main XP Display */}
        <motion.div 
          className="text-center space-y-2"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-4xl font-bold text-blue-600">
            {xpData?.total || 0}
          </div>
          <div className="text-sm text-gray-600">Total Experience Points</div>
          
          <div className="flex items-center justify-center space-x-4 mt-4">
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Level {level}</span>
            </div>
            
            {xpData?.dailyStreak && xpData.dailyStreak > 0 && (
              <div className="flex items-center space-x-2 text-orange-600">
                <Flame className="h-4 w-4" />
                <span className="text-sm">{xpData.dailyStreak} day streak</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Progress to Next Level */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress to Level {level + 1}</span>
            <span>{progress.current}/{progress.required} XP</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
        </div>

        {showDetails && (
          <>
            {/* XP Breakdown by Hub */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Campus</span>
                  <span className="font-medium">{xpData?.campus || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Learning</span>
                  <span className="font-medium">{xpData?.learning || 0}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Finance</span>
                  <span className="font-medium">{xpData?.finance || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Clubs</span>
                  <span className="font-medium">{xpData?.club || 0}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {recentActivity.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Recent Activity</span>
                </h4>
                
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  <AnimatePresence>
                    {recentActivity.slice(0, 5).map((activity, index) => (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                      >
                        <div className="flex items-center space-x-2">
                          <Zap className="h-3 w-3 text-yellow-500" />
                          <span className="capitalize">
                            {activity.action.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600 font-medium">
                            +{activity.xp_change}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {activity.hub_type}
                          </Badge>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Daily Login Button */}
            {!userId && xpData && (
              <Button 
                onClick={handleDailyLogin}
                className="w-full"
                variant="outline"
                size="sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Claim Daily Login Bonus
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export { XPDisplay };
export default XPDisplay;