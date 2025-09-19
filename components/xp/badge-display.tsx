/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Star, 
  Award,
  Target,
  Flame,
  BookOpen,
  DollarSign,
  Users,
  Calendar,
  Zap
} from 'lucide-react';

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xp_requirement: number;
  hub_type: string | null;
  unlocked_at?: string;
}

interface BadgeDisplayProps {
  userId: string;
  compact?: boolean;
  showUnlocked?: boolean;
  showLocked?: boolean;
}

const getBadgeIcon = (iconName: string) => {
  const iconMap: { [key: string]: React.ComponentType<any> } = {
    '🎯': Target,
    '📚': BookOpen,
    '💰': DollarSign,
    '🦋': Users,
    '🏆': Trophy,
    '🔥': Flame,
    '🧠': Star,
    '₿': DollarSign,
    '⭐': Star,
    '🎖️': Award,
    '📅': Calendar,
    '⚡': Zap
  };
  
  return iconMap[iconName] || Award;
};

function BadgeDisplay({ 
  userId, 
  compact = false,
  showUnlocked = true,
  showLocked = true 
}: BadgeDisplayProps) {
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchBadges();
  }, [userId]);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all badges
      const { data: allBadges, error: badgesError } = await supabase
        .from('badges')
        .select('*')
        .order('xp_requirement', { ascending: true });

      if (badgesError) throw badgesError;

      // Fetch user's unlocked badges
      const { data: unlockedBadges, error: userBadgesError } = await supabase
        .from('user_badges')
        .select('badge_id, unlocked_at')
        .eq('user_id', userId);

      if (userBadgesError) throw userBadgesError;

      const unlockedBadgeIds = unlockedBadges?.map(ub => ub.badge_id) || [];
      
      // Merge badge data with unlock status
      const badgesWithStatus = allBadges?.map(badge => ({
        ...badge,
        unlocked_at: unlockedBadges?.find(ub => ub.badge_id === badge.id)?.unlocked_at
      })) || [];

      setBadges(badgesWithStatus);
      setUserBadges(unlockedBadgeIds);
    } catch (err) {
      console.error('Error fetching badges:', err);
      setError(err instanceof Error ? err.message : 'Failed to load badges');
    } finally {
      setLoading(false);
    }
  };

  const filteredBadges = badges.filter(badge => {
    const isUnlocked = userBadges.includes(badge.id);
    if (!showUnlocked && isUnlocked) return false;
    if (!showLocked && !isUnlocked) return false;
    return true;
  });

  const unlockedCount = userBadges.length;
  const totalCount = badges.length;

  if (loading) {
    return (
      <Card className={compact ? "p-4" : ""}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className={compact ? "text-lg" : ""}>Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={compact ? "p-4" : ""}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className={compact ? "text-lg" : ""}>Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Failed to load badges</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchBadges}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Badges</h3>
          <Badge variant="secondary">
            {unlockedCount}/{totalCount}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {filteredBadges.slice(0, 6).map((badge) => {
            const isUnlocked = userBadges.includes(badge.id);
            const IconComponent = getBadgeIcon(badge.icon);
            
            return (
              <motion.div
                key={badge.id}
                whileHover={{ scale: 1.05 }}
                className={`p-2 rounded-lg border ${
                  isUnlocked 
                    ? 'bg-primary/10 border-primary/20' 
                    : 'bg-muted/50 border-muted opacity-50'
                }`}
              >
                <IconComponent className={`h-6 w-6 ${
                  isUnlocked ? 'text-primary' : 'text-muted-foreground'
                }`} />
              </motion.div>
            );
          })}
          {filteredBadges.length > 6 && (
            <div className="p-2 rounded-lg border bg-muted/50 border-muted flex items-center justify-center">
              <span className="text-sm text-muted-foreground">
                +{filteredBadges.length - 6}
              </span>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Badge Collection</CardTitle>
          <Badge variant="secondary">
            {unlockedCount}/{totalCount} Unlocked
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredBadges.map((badge) => {
                const isUnlocked = userBadges.includes(badge.id);
                const IconComponent = getBadgeIcon(badge.icon);
                
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 rounded-lg border transition-all ${
                      isUnlocked 
                        ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 shadow-sm' 
                        : 'bg-muted/50 border-muted opacity-60'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        isUnlocked 
                          ? 'bg-primary/20 text-primary' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold text-sm ${
                          isUnlocked ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {badge.name}
                        </h4>
                        <p className={`text-xs mt-1 ${
                          isUnlocked ? 'text-muted-foreground' : 'text-muted-foreground/70'
                        }`}>
                          {badge.description}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <Badge 
                            variant={isUnlocked ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {badge.category}
                          </Badge>
                          {isUnlocked && badge.unlocked_at && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(badge.unlocked_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {!isUnlocked && (
                          <div className="mt-2">
                            <span className="text-xs text-muted-foreground">
                              Requires {badge.xp_requirement} XP
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export { BadgeDisplay };
export default BadgeDisplay;