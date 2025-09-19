'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Medal, 
  Award, 
  Star, 
  Crown, 
  Shield, 
  Zap, 
  Target,
  BookOpen,
  Users,
  Calendar,
  TrendingUp,
  Flame,
  Diamond,
  Gem
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Badge definitions with XP thresholds
export const BADGE_TIERS = {
  BRONZE: { min: 0, max: 99, color: 'from-amber-600 to-amber-800', icon: Medal },
  SILVER: { min: 100, max: 499, color: 'from-gray-400 to-gray-600', icon: Award },
  GOLD: { min: 500, max: 999, color: 'from-yellow-400 to-yellow-600', icon: Trophy },
  PLATINUM: { min: 1000, max: 2499, color: 'from-blue-400 to-blue-600', icon: Shield },
  DIAMOND: { min: 2500, max: 4999, color: 'from-purple-400 to-purple-600', icon: Diamond },
  LEGENDARY: { min: 5000, max: Infinity, color: 'from-pink-500 to-red-500', icon: Crown }
};

export const ACHIEVEMENT_BADGES = {
  // XP Milestones
  FIRST_STEPS: { 
    id: 'first_steps', 
    name: 'First Steps', 
    description: 'Earn your first 10 XP', 
    threshold: 10, 
    icon: Star,
    color: 'from-green-400 to-green-600',
    category: 'milestone'
  },
  GETTING_STARTED: { 
    id: 'getting_started', 
    name: 'Getting Started', 
    description: 'Reach 50 XP', 
    threshold: 50, 
    icon: Target,
    color: 'from-blue-400 to-blue-600',
    category: 'milestone'
  },
  RISING_STAR: { 
    id: 'rising_star', 
    name: 'Rising Star', 
    description: 'Reach 250 XP', 
    threshold: 250, 
    icon: TrendingUp,
    color: 'from-indigo-400 to-indigo-600',
    category: 'milestone'
  },
  POWER_USER: { 
    id: 'power_user', 
    name: 'Power User', 
    description: 'Reach 1000 XP', 
    threshold: 1000, 
    icon: Zap,
    color: 'from-yellow-400 to-orange-500',
    category: 'milestone'
  },
  ELITE_MEMBER: { 
    id: 'elite_member', 
    name: 'Elite Member', 
    description: 'Reach 5000 XP', 
    threshold: 5000, 
    icon: Crown,
    color: 'from-purple-500 to-pink-500',
    category: 'milestone'
  },
  
  // Activity-based badges
  SCHOLAR: { 
    id: 'scholar', 
    name: 'Scholar', 
    description: 'Complete 10 quizzes', 
    threshold: 10, 
    icon: BookOpen,
    color: 'from-emerald-400 to-emerald-600',
    category: 'learning',
    action: 'quiz_complete'
  },
  SOCIAL_BUTTERFLY: { 
    id: 'social_butterfly', 
    name: 'Social Butterfly', 
    description: 'Post 50 club messages', 
    threshold: 50, 
    icon: Users,
    color: 'from-pink-400 to-pink-600',
    category: 'social',
    action: 'club_message_post'
  },
  EVENT_ENTHUSIAST: { 
    id: 'event_enthusiast', 
    name: 'Event Enthusiast', 
    description: 'RSVP to 5 events', 
    threshold: 5, 
    icon: Calendar,
    color: 'from-cyan-400 to-cyan-600',
    category: 'events',
    action: 'event_rsvp'
  },
  STREAK_MASTER: { 
    id: 'streak_master', 
    name: 'Streak Master', 
    description: 'Maintain a 7-day login streak', 
    threshold: 7, 
    icon: Flame,
    color: 'from-red-400 to-red-600',
    category: 'engagement',
    action: 'daily_login'
  },
  KNOWLEDGE_SHARER: { 
    id: 'knowledge_sharer', 
    name: 'Knowledge Sharer', 
    description: 'Upload 10 resources', 
    threshold: 10, 
    icon: Gem,
    color: 'from-teal-400 to-teal-600',
    category: 'contribution',
    action: 'club_resource_upload'
  }
};

interface BadgeSystemProps {
  totalXP: number;
  userBadges?: string[];
  actionCounts?: Record<string, number>;
  dailyStreak?: number;
  showProgress?: boolean;
  compact?: boolean;
}

export const BadgeSystem: React.FC<BadgeSystemProps> = ({
  totalXP,
  userBadges = [],
  actionCounts = {},
  dailyStreak = 0,
  showProgress = true,
  compact = false
}) => {
  // Get current tier based on XP
  const getCurrentTier = () => {
    for (const [tierName, tier] of Object.entries(BADGE_TIERS)) {
      if (totalXP >= tier.min && totalXP <= tier.max) {
        return { name: tierName, ...tier };
      }
    }
    return { name: 'BRONZE', ...BADGE_TIERS.BRONZE };
  };

  // Get next tier
  const getNextTier = () => {
    const currentTier = getCurrentTier();
    const tierNames = Object.keys(BADGE_TIERS);
    const currentIndex = tierNames.indexOf(currentTier.name);
    
    if (currentIndex < tierNames.length - 1) {
      const nextTierName = tierNames[currentIndex + 1];
      return { name: nextTierName, ...BADGE_TIERS[nextTierName as keyof typeof BADGE_TIERS] };
    }
    return null;
  };

  // Calculate progress to next tier
  const getProgressToNextTier = () => {
    const currentTier = getCurrentTier();
    const nextTier = getNextTier();
    
    if (!nextTier) return 100;
    
    const progress = ((totalXP - currentTier.min) / (nextTier.min - currentTier.min)) * 100;
    return Math.min(progress, 100);
  };

  // Check which achievement badges user has earned
  const getEarnedAchievements = () => {
    const earned: typeof ACHIEVEMENT_BADGES[keyof typeof ACHIEVEMENT_BADGES][] = [];
    
    Object.values(ACHIEVEMENT_BADGES).forEach(badge => {
      let hasEarned = false;
      
      if (badge.category === 'milestone') {
        hasEarned = totalXP >= badge.threshold;
      } else if ('action' in badge && badge.action) {
        const count = actionCounts[badge.action] || 0;
        hasEarned = count >= badge.threshold;
      } else if (badge.id === 'streak_master') {
        hasEarned = dailyStreak >= badge.threshold;
      }
      
      if (hasEarned) {
        earned.push(badge);
      }
    });
    
    return earned;
  };

  // Get next achievement to unlock
  const getNextAchievement = () => {
    const earnedIds = getEarnedAchievements().map(b => b.id);
    
    return Object.values(ACHIEVEMENT_BADGES).find(badge => {
      if (earnedIds.includes(badge.id)) return false;
      
      if (badge.category === 'milestone') {
        return totalXP < badge.threshold;
      } else if ('action' in badge && badge.action) {
        const count = actionCounts[badge.action] || 0;
        return count < badge.threshold;
      } else if (badge.id === 'streak_master') {
        return dailyStreak < badge.threshold;
      }
      
      return false;
    });
  };

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();
  const progress = getProgressToNextTier();
  const earnedAchievements = getEarnedAchievements();
  const nextAchievement = getNextAchievement();

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        <TierBadge tier={currentTier} size="sm" />
        <span className="text-sm font-medium text-gray-700">
          {totalXP.toLocaleString()} XP
        </span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Current Tier */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <span>Current Tier</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <TierBadge tier={currentTier} size="lg" />
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {totalXP.toLocaleString()} XP
                </p>
                <p className="text-sm text-gray-500">
                  {currentTier.name} Tier
                </p>
              </div>
            </div>
            
            {showProgress && nextTier && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress to {nextTier.name}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-gray-500">
                  {(nextTier.min - totalXP).toLocaleString()} XP to next tier
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Achievement Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-blue-500" />
              <span>Achievements</span>
              <Badge variant="secondary">
                {earnedAchievements.length}/{Object.keys(ACHIEVEMENT_BADGES).length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.values(ACHIEVEMENT_BADGES).map(badge => {
                const isEarned = earnedAchievements.some(earned => earned.id === badge.id);
                return (
                  <AchievementBadge
                    key={badge.id}
                    badge={badge}
                    earned={isEarned}
                    progress={getAchievementProgress(badge, totalXP, actionCounts, dailyStreak)}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Next Achievement */}
        {nextAchievement && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-green-500" />
                <span>Next Achievement</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AchievementBadge
                badge={nextAchievement}
                earned={false}
                progress={getAchievementProgress(nextAchievement, totalXP, actionCounts, dailyStreak)}
                showProgress={true}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
};

// Tier Badge Component
const TierBadge: React.FC<{ 
  tier: { name: string; color: string; icon: React.ComponentType<any> }; 
  size?: 'sm' | 'md' | 'lg' 
}> = ({ tier, size = 'md' }) => {
  const Icon = tier.icon;
  const sizeClasses = {
    sm: 'h-8 w-8 p-1',
    md: 'h-12 w-12 p-2',
    lg: 'h-16 w-16 p-3'
  };
  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <Tooltip>
      <TooltipTrigger>
        <motion.div
          className={`rounded-full bg-gradient-to-br ${tier.color} ${sizeClasses[size]} flex items-center justify-center shadow-lg`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Icon className={`${iconSizes[size]} text-white`} />
        </motion.div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-semibold">{tier.name} Tier</p>
      </TooltipContent>
    </Tooltip>
  );
};

// Achievement Badge Component
const AchievementBadge: React.FC<{
  badge: typeof ACHIEVEMENT_BADGES[keyof typeof ACHIEVEMENT_BADGES];
  earned: boolean;
  progress: number;
  showProgress?: boolean;
}> = ({ badge, earned, progress, showProgress = false }) => {
  const Icon = badge.icon;

  return (
    <Tooltip>
      <TooltipTrigger>
        <motion.div
          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
            earned 
              ? `bg-gradient-to-br ${badge.color} border-transparent text-white shadow-lg` 
              : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300'
          }`}
          whileHover={{ scale: earned ? 1.05 : 1.02 }}
          whileTap={{ scale: 0.98 }}
          animate={earned ? { 
            boxShadow: ['0 0 0 0 rgba(59, 130, 246, 0.4)', '0 0 0 10px rgba(59, 130, 246, 0)', '0 0 0 0 rgba(59, 130, 246, 0)']
          } : {}}
          transition={{ duration: earned ? 2 : 0.2, repeat: earned ? Infinity : 0, repeatDelay: 3 }}
        >
          <div className="text-center">
            <Icon className={`h-8 w-8 mx-auto mb-2 ${earned ? 'text-white' : 'text-gray-400'}`} />
            <h4 className={`font-semibold text-sm ${earned ? 'text-white' : 'text-gray-600'}`}>
              {badge.name}
            </h4>
            {showProgress && !earned && (
              <div className="mt-2">
                <Progress value={progress} className="h-1" />
                <p className="text-xs mt-1">{Math.round(progress)}%</p>
              </div>
            )}
          </div>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-center">
          <p className="font-semibold">{badge.name}</p>
          <p className="text-sm text-gray-600">{badge.description}</p>
          {!earned && (
            <p className="text-xs text-gray-500 mt-1">
              Progress: {Math.round(progress)}%
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

// Helper function to calculate achievement progress
const getAchievementProgress = (
  badge: typeof ACHIEVEMENT_BADGES[keyof typeof ACHIEVEMENT_BADGES],
  totalXP: number,
  actionCounts: Record<string, number>,
  dailyStreak: number
): number => {
  if (badge.category === 'milestone') {
    return Math.min((totalXP / badge.threshold) * 100, 100);
  } else if ('action' in badge && badge.action) {
    const count = actionCounts[badge.action] || 0;
    return Math.min((count / badge.threshold) * 100, 100);
  } else if (badge.id === 'streak_master') {
    return Math.min((dailyStreak / badge.threshold) * 100, 100);
  }
  return 0;
};

export default BadgeSystem;