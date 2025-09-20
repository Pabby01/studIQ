/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Trophy, 
  Medal, 
  Award, 
  Crown, 
  Star,
  Users,
  TrendingUp,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { realtimeXPService, LeaderboardUpdateEvent } from '@/lib/realtime-xp';

interface LeaderboardEntry {
  position: number;
  user_id: string;
  total_xp: number;
  level: number;
  username: string;
  full_name: string;
  avatar_url?: string;
  is_current_user: boolean;
  xp_breakdown?: {
    campus_xp: number;
    learning_xp: number;
    finance_xp: number;
    club_xp: number;
  };
  daily_streak?: number;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  currentUser: LeaderboardEntry | null;
  totalUsers: number;
  category: string;
}

interface Club {
  id: string;
  name: string;
  category: string;
}

const LeaderboardPage: React.FC = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedHub, setSelectedHub] = useState<string>('all');
  const [selectedClub, setSelectedClub] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('global');
  
  const supabase = createClientComponentClient();

  // Fetch leaderboard data
  const fetchLeaderboard = async (hubType?: string, clubId?: string) => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams();
      
      if (hubType && hubType !== 'all') {
        params.append('hubType', hubType);
      }
      
      if (clubId && clubId !== 'all') {
        params.append('clubId', clubId);
      }
      
      const response = await fetch(`/api/leaderboard?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      
      const data = await response.json();
      setLeaderboardData(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast({
        title: "Error",
        description: "Failed to load leaderboard",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch clubs for club-specific leaderboard
  const fetchClubs = async () => {
    try {
      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, category')
        .order('name');
      
      if (error) throw error;
      setClubs(data || []);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    fetchClubs();
  }, [fetchClubs]);

  useEffect(() => {
    if (activeTab === 'global') {
      fetchLeaderboard(selectedHub === 'all' ? undefined : selectedHub);
    } else {
      fetchLeaderboard(undefined, selectedClub === 'all' ? undefined : selectedClub);
    }
  }, [selectedHub, selectedClub, activeTab]);

  // Set up real-time subscriptions using the new service
  useEffect(() => {
    const unsubscribe = realtimeXPService.subscribeToLeaderboard(
      (event: LeaderboardUpdateEvent) => {
        // Update leaderboard data in real-time
        setLeaderboardData(prev => {
          if (!prev) return prev;
          
          const updatedLeaderboard = prev.leaderboard.map(entry => {
            if (entry.user_id === event.userId) {
              return {
                ...entry,
                total_xp: event.totalXP,
                position: event.newRank,
                level: Math.floor(event.totalXP / 100) + 1
              };
            }
            return entry;
          });

          // Re-sort the leaderboard
          updatedLeaderboard.sort((a, b) => b.total_xp - a.total_xp);
          
          // Update positions
          updatedLeaderboard.forEach((entry, index) => {
            entry.position = index + 1;
          });

          return {
            ...prev,
            leaderboard: updatedLeaderboard,
            currentUser: prev.currentUser?.user_id === event.userId 
              ? { ...prev.currentUser, total_xp: event.totalXP, position: event.newRank }
              : prev.currentUser
          };
        });

        // Show toast for rank changes
        if (event.newRank !== event.previousRank) {
          const rankChange = event.previousRank - event.newRank;
          if (rankChange > 0) {
            toast({
              title: "Rank Up! 🎉",
              description: `You moved up ${rankChange} position${rankChange > 1 ? 's' : ''} to rank #${event.newRank}!`,
              duration: 5000
            });
          }
        }
      }
    );

    return unsubscribe;
  }, []);

  // Filter leaderboard based on search
  const filteredLeaderboard = leaderboardData?.leaderboard.filter(entry =>
    entry.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Get position icon
  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-600">#{position}</span>;
    }
  };

  // Get level badge color
  const getLevelBadgeColor = (level: number) => {
    if (level >= 50) return 'bg-gradient-to-r from-purple-500 to-pink-500';
    if (level >= 25) return 'bg-gradient-to-r from-blue-500 to-cyan-500';
    if (level >= 10) return 'bg-gradient-to-r from-green-500 to-emerald-500';
    return 'bg-gradient-to-r from-gray-500 to-gray-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🏆 Leaderboard
          </h1>
          <p className="text-gray-600">
            Compete with fellow students and climb the ranks!
          </p>
        </div>

        {/* Current User Stats */}
        {leaderboardData?.currentUser && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={leaderboardData.currentUser.avatar_url} />
                      <AvatarFallback>
                        {leaderboardData.currentUser.username?.charAt(0)?.toUpperCase() || 
                         leaderboardData.currentUser.full_name?.charAt(0)?.toUpperCase() || 
                         'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Your Rank</h3>
                      <p className="text-gray-600">{leaderboardData.currentUser.full_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">
                          #{leaderboardData.currentUser.position}
                        </p>
                        <p className="text-sm text-gray-500">
                          of {leaderboardData.totalUsers}
                        </p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {leaderboardData.currentUser.total_xp.toLocaleString()} XP
                        </p>
                        <Badge className={`${getLevelBadgeColor(leaderboardData.currentUser.level)} text-white`}>
                          Level {leaderboardData.currentUser.level}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Controls */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex items-center space-x-4 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={() => fetchLeaderboard(
                    activeTab === 'global' ? (selectedHub === 'all' ? undefined : selectedHub) : undefined,
                    activeTab === 'club' ? (selectedClub === 'all' ? undefined : selectedClub) : undefined
                  )}
                  disabled={refreshing}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="global" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Global</span>
            </TabsTrigger>
            <TabsTrigger value="club" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Club</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="global">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span>Global Leaderboard</span>
                  </CardTitle>
                  <Select value={selectedHub} onValueChange={setSelectedHub}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by hub" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Hubs</SelectItem>
                      <SelectItem value="campus">Campus Hub</SelectItem>
                      <SelectItem value="learning">Learning Hub</SelectItem>
                      <SelectItem value="finance">Finance Hub</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <LeaderboardList entries={filteredLeaderboard} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="club">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span>Club Leaderboard</span>
                  </CardTitle>
                  <Select value={selectedClub} onValueChange={setSelectedClub}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select club" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clubs</SelectItem>
                      {clubs.map((club) => (
                        <SelectItem key={club.id} value={club.id}>
                          {club.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <LeaderboardList entries={filteredLeaderboard} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

// Leaderboard List Component
const LeaderboardList: React.FC<{ entries: LeaderboardEntry[] }> = ({ entries }) => {
  return (
    <div className="space-y-3">
      <AnimatePresence>
        {entries.map((entry, index) => (
          <motion.div
            key={entry.user_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.05 }}
            className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
              entry.is_current_user 
                ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' 
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12">
                  {getPositionIcon(entry.position)}
                </div>
                
                <Avatar className="h-12 w-12">
                  <AvatarImage src={entry.avatar_url} />
                  <AvatarFallback>
                    {entry.username?.charAt(0)?.toUpperCase() || 
                     entry.full_name?.charAt(0)?.toUpperCase() || 
                     'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-900">
                      {entry.full_name}
                    </h4>
                    {entry.is_current_user && (
                      <Badge variant="secondary" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">@{entry.username}</p>
                  {entry.daily_streak && entry.daily_streak > 0 && (
                    <div className="flex items-center space-x-1 mt-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span className="text-xs text-gray-600">
                        {entry.daily_streak} day streak
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="text-xl font-bold text-green-600">
                      {entry.total_xp.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500">XP</p>
                  </div>
                  <Badge className={`${getLevelBadgeColor(entry.level)} text-white`}>
                    Level {entry.level}
                  </Badge>
                </div>
                
                {entry.xp_breakdown && (
                  <div className="flex space-x-1 mt-2">
                    {entry.xp_breakdown.campus_xp > 0 && (
                      <Badge variant="outline" className="text-xs">
                        Campus: {entry.xp_breakdown.campus_xp}
                      </Badge>
                    )}
                    {entry.xp_breakdown.learning_xp > 0 && (
                      <Badge variant="outline" className="text-xs">
                        Learning: {entry.xp_breakdown.learning_xp}
                      </Badge>
                    )}
                    {entry.xp_breakdown.finance_xp > 0 && (
                      <Badge variant="outline" className="text-xs">
                        Finance: {entry.xp_breakdown.finance_xp}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {entries.length === 0 && (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No users found</p>
        </div>
      )}
    </div>
  );
};

// Helper function to get position icon
const getPositionIcon = (position: number) => {
  switch (position) {
    case 1:
      return <Crown className="h-6 w-6 text-yellow-500" />;
    case 2:
      return <Medal className="h-6 w-6 text-gray-400" />;
    case 3:
      return <Award className="h-6 w-6 text-amber-600" />;
    default:
      return <span className="text-lg font-bold text-gray-600">#{position}</span>;
  }
};

// Helper function to get level badge color
const getLevelBadgeColor = (level: number) => {
  if (level >= 50) return 'bg-gradient-to-r from-purple-500 to-pink-500';
  if (level >= 25) return 'bg-gradient-to-r from-blue-500 to-cyan-500';
  if (level >= 10) return 'bg-gradient-to-r from-green-500 to-emerald-500';
  return 'bg-gradient-to-r from-gray-500 to-gray-600';
};

export { LeaderboardPage };
export default LeaderboardPage;