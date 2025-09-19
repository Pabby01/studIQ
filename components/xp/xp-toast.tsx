'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { 
  Trophy, 
  Star, 
  Zap, 
  Award,
  Target,
  Users,
  BookOpen,
  DollarSign,
  MessageSquare,
  Upload,
  Calendar
} from 'lucide-react';

interface XPToastProps {
  action: string;
  xpAmount: number;
  hubType: string;
  levelUp?: boolean;
  newLevel?: number;
}

// Map actions to icons and colors
const actionConfig: Record<string, { icon: React.ComponentType<any>, color: string, emoji: string }> = {
  'club_message_post': { icon: MessageSquare, color: 'text-blue-500', emoji: '💬' },
  'club_resource_upload': { icon: Upload, color: 'text-green-500', emoji: '📁' },
  'event_rsvp': { icon: Calendar, color: 'text-purple-500', emoji: '📅' },
  'quiz_complete': { icon: Target, color: 'text-orange-500', emoji: '🎯' },
  'course_material_upload': { icon: BookOpen, color: 'text-indigo-500', emoji: '📚' },
  'daily_login': { icon: Star, color: 'text-yellow-500', emoji: '⭐' },
  'helpful_vote': { icon: Award, color: 'text-pink-500', emoji: '👍' },
  'club_join': { icon: Users, color: 'text-cyan-500', emoji: '🤝' },
  'transaction_complete': { icon: DollarSign, color: 'text-emerald-500', emoji: '💰' }
};

// Hub type colors
const hubColors: Record<string, string> = {
  'campus': 'bg-blue-100 text-blue-800',
  'learning': 'bg-indigo-100 text-indigo-800',
  'finance': 'bg-green-100 text-green-800',
  'club': 'bg-purple-100 text-purple-800',
  'general': 'bg-gray-100 text-gray-800'
};

export function showXPToast({ action, xpAmount, hubType, levelUp, newLevel }: XPToastProps) {
  const config = actionConfig[action] || { icon: Zap, color: 'text-yellow-500', emoji: '⚡' };
  const Icon = config.icon;
  
  // Format action name for display
  const actionName = action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  const toastContent = (
    <motion.div 
      className="flex items-center space-x-3"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
    >
      <motion.div
        className={`p-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500`}
        animate={{ 
          rotate: [0, 10, -10, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 0.6 }}
      >
        <Icon className="h-5 w-5 text-white" />
      </motion.div>
      
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <motion.span 
            className="text-lg font-bold text-green-600"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
          >
            +{xpAmount} XP
          </motion.span>
          <span className="text-2xl">{config.emoji}</span>
        </div>
        
        <div className="text-sm text-gray-600">
          {actionName}
        </div>
        
        <div className="flex items-center space-x-2 mt-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${hubColors[hubType]}`}>
            {hubType.charAt(0).toUpperCase() + hubType.slice(1)}
          </span>
          
          {levelUp && newLevel && (
            <motion.span 
              className="px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
            >
              🎉 Level {newLevel}!
            </motion.span>
          )}
        </div>
      </div>
    </motion.div>
  );

  toast({
    title: levelUp ? `Level Up! 🎉` : `XP Earned! ${config.emoji}`,
    description: toastContent,
    duration: levelUp ? 8000 : 5000,
    className: levelUp ? "border-l-4 border-l-purple-500" : "border-l-4 border-l-green-500"
  });
}

// Utility function to award XP and show toast
export async function awardXP(
  action: string, 
  xpAmount: number, 
  hubType: string = 'general',
  referenceId?: string,
  referenceType?: string,
  metadata?: any
) {
  try {
    const response = await fetch('/api/xp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action,
        xpAmount,
        hubType,
        referenceId,
        referenceType,
        metadata
      })
    });

    if (!response.ok) {
      throw new Error('Failed to award XP');
    }

    const data = await response.json();
    
    if (data.success) {
      showXPToast({
        action,
        xpAmount: data.xpAwarded,
        hubType,
        levelUp: data.leveledUp,
        newLevel: data.newLevel
      });
      
      return data;
    }
  } catch (error) {
    console.error('Error awarding XP:', error);
    toast({
      title: "Error",
      description: "Failed to award XP",
      variant: "destructive"
    });
  }
}

// XP Rules Configuration (for easy reference)
export const XP_RULES = {
  // Club Activities
  CLUB_MESSAGE_POST: { action: 'club_message_post', xp: 2, hub: 'club' },
  CLUB_RESOURCE_UPLOAD: { action: 'club_resource_upload', xp: 15, hub: 'club' },
  CLUB_JOIN: { action: 'club_join', xp: 10, hub: 'campus' },
  
  // Events
  EVENT_RSVP: { action: 'event_rsvp', xp: 25, hub: 'campus' },
  EVENT_ATTEND: { action: 'event_attend', xp: 30, hub: 'campus' },
  
  // Learning
  QUIZ_COMPLETE: { action: 'quiz_complete', xp: 10, hub: 'learning' },
  COURSE_MATERIAL_UPLOAD: { action: 'course_material_upload', xp: 20, hub: 'learning' },
  HELPFUL_VOTE: { action: 'helpful_vote', xp: 30, hub: 'learning' },
  
  // Finance
  TRANSACTION_COMPLETE: { action: 'transaction_complete', xp: 5, hub: 'finance' },
  SAVINGS_GOAL_COMPLETE: { action: 'savings_goal_complete', xp: 50, hub: 'finance' },
  
  // General
  DAILY_LOGIN: { action: 'daily_login', xp: 5, hub: 'general' },
  PROFILE_COMPLETE: { action: 'profile_complete', xp: 25, hub: 'general' }
};

export default showXPToast;