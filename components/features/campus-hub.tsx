'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/components/providers/providers';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  Users, 
  Calendar, 
  BookOpen, 
  Trophy, 
  Plus, 
  Search, 
  MessageCircle, 
  Star,
  Settings,
  Crown,
  Shield,
  UserPlus,
  Filter,
  TrendingUp,
  Clock,
  MapPin,
  Heart,
  Share2,
  Bookmark,
  Bell,
  Zap,
  Target,
  Award,
  Activity,
  ChevronRight,
  Eye,
  Edit,
  Send,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';

interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  is_private: boolean;
  max_members: number;
  created_at: string;
  created_by_user: {
    username: string;
    avatar_url: string;
  };
  member_count: number;
  is_member: boolean;
}

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  max_attendees: number;
  is_virtual: boolean;
  club_id?: string;
  created_by: string;
  attendee_count: number;
  is_attending: boolean;
  club?: {
    name: string;
  };
}

interface CollaborationTool {
  id: string;
  title: string;
  type: 'notes' | 'flashcards' | 'study_pack';
  content: any;
  is_public: boolean;
  created_by: string;
  created_at: string;
  likes_count: number;
  is_liked: boolean;
  creator: {
    username: string;
    avatar_url: string;
  };
}

interface UserReputation {
  user_id: string;
  total_xp: number;
  level: number;
  current_level_xp: number;
  next_level_xp: number;
  xp_to_next_level: number;
  rank: number;
  weekly_xp: number;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: any;
}

interface LeaderboardEntry {
  position: number;
  user_id: string;
  userId: string;
  totalXp: number;
  total_xp: number;
  level: number;
  full_name: string;
  weekly_xp: number;
  profile: {
    fullName: string;
    avatarUrl: string;
    username: string;
  };
  isCurrentUser: boolean;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  current_user?: LeaderboardEntry & { rank: number };
  total_users: number;
}

const CLUB_CATEGORIES = [
  { value: 'academic', label: 'Academic', icon: '📚' },
  { value: 'sports', label: 'Sports', icon: '⚽' },
  { value: 'arts', label: 'Arts', icon: '🎨' },
  { value: 'technology', label: 'Technology', icon: '💻' },
  { value: 'social', label: 'Social', icon: '🤝' },
  { value: 'other', label: 'Other', icon: '🌟' },
];

export default function CampusHub() {
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  
  // State management
  const [activeTab, setActiveTab] = useState('clubs');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [collaborationTools, setCollaborationTools] = useState<CollaborationTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showMyClubs, setShowMyClubs] = useState(false);
  
  // Reputation and notifications
  const [userReputation, setUserReputation] = useState<UserReputation | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse>({ entries: [], total_users: 0 });
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Dialog states
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateTool, setShowCreateTool] = useState(false);
  
  // Form states
  const [clubForm, setClubForm] = useState({
    name: '',
    description: '',
    category: 'academic',
    is_private: false,
    max_members: 500,
  });
  
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    max_attendees: 100,
    is_virtual: false,
    club_id: '',
  });

  const [toolForm, setToolForm] = useState({
    title: '',
    type: 'notes' as 'notes' | 'flashcards' | 'study_pack',
    content: '',
    is_public: true,
  });

  // Fetch data functions
  const fetchClubs = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);
      if (showMyClubs) params.append('my_clubs', 'true');

      const response = await fetch(`/api/clubs?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setClubs(data.clubs || []);
      } else {
        toast.error(data.error || 'Failed to fetch clubs');
      }
    } catch (error) {
      console.error('Error fetching clubs:', error);
      toast.error('Failed to fetch clubs');
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      
      if (response.ok) {
        setEvents(data.events || []);
      } else {
        toast.error(data.error || 'Failed to fetch events');
      }
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to fetch events');
    }
  };

  const fetchCollaborationTools = async () => {
    try {
      const response = await fetch('/api/collaboration-tools');
      const data = await response.json();
      
      if (response.ok) {
        setCollaborationTools(data.tools || []);
      } else {
        toast.error(data.error || 'Failed to fetch collaboration tools');
      }
    } catch (error) {
      console.error('Error fetching collaboration tools:', error);
      toast.error('Failed to fetch collaboration tools');
    }
  };

  const fetchReputation = async () => {
    try {
      const response = await fetch('/api/reputation');
      const data = await response.json();
      
      if (response.ok) {
        setUserReputation(data.reputation);
      } else {
        console.error('Failed to fetch reputation:', data.error);
      }
    } catch (error) {
      console.error('Error fetching reputation:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=10');
      const data = await response.json();
      
      if (response.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        console.error('Failed to fetch notifications:', data.error);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard?limit=10');
      const data = await response.json();
      
      if (response.ok) {
        setLeaderboard(data || { entries: [], total_users: 0 });
      } else {
        console.error('Failed to fetch leaderboard:', data.error);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const markNotificationsRead = async (notificationIds?: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationIds,
          markAll: !notificationIds
        })
      });
      
      if (response.ok) {
        await fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notifications read:', error);
    }
  };

  // Create functions
  const createClub = async () => {
    try {
      const response = await fetch('/api/clubs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clubForm),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success('Club created successfully!');
        setShowCreateClub(false);
        setClubForm({
          name: '',
          description: '',
          category: 'academic',
          is_private: false,
          max_members: 500,
        });
        fetchClubs();
      } else {
        toast.error(data.error || 'Failed to create club');
      }
    } catch (error) {
      console.error('Error creating club:', error);
      toast.error('Failed to create club');
    }
  };

  const joinClub = async (clubId: string) => {
    try {
      const response = await fetch(`/api/clubs/${clubId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(data.message);
        fetchClubs();
      } else {
        toast.error(data.error || 'Failed to join club');
      }
    } catch (error) {
      console.error('Error joining club:', error);
      toast.error('Failed to join club');
    }
  };

  // Effects
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        fetchClubs(),
        fetchEvents(),
        fetchCollaborationTools(),
        fetchReputation(),
        fetchNotifications(),
        fetchLeaderboard(),
      ]).finally(() => setLoading(false));
    }
  }, [user, selectedCategory, searchQuery, showMyClubs]);

  // Real-time updates for notifications
  useEffect(() => {
    if (user) {
      const channel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchNotifications();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showNotifications && !(event.target as Element).closest('.notifications-dropdown')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please sign in to access Campus Hub</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Campus Hub</h1>
            <p className="text-muted-foreground">Connect, collaborate, and grow with your campus community</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <div className="relative notifications-dropdown">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Badge>
                )}
              </Button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <Card className="absolute right-0 top-full mt-2 w-80 z-50 shadow-lg notifications-dropdown">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Notifications</CardTitle>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markNotificationsRead()}
                          className="text-xs"
                        >
                          Mark all read
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-64">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 border-b last:border-b-0 ${
                              !notification.read ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium">{notification.title}</p>
                                <p className="text-xs text-muted-foreground">{notification.message}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(notification.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* User Reputation */}
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Trophy className="h-3 w-3" />
                <span>XP: {userReputation?.total_xp || 0}</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1">
                <Award className="h-3 w-3" />
                <span>Level {userReputation?.level || 1}</span>
              </Badge>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clubs, events, or tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CLUB_CATEGORIES.map((category) => (
                <SelectItem key={category.value} value={category.value}>
                  {category.icon} {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clubs" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Clubs</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Events</span>
          </TabsTrigger>
          <TabsTrigger value="collaboration" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>Study Tools</span>
          </TabsTrigger>
          <TabsTrigger value="reputation" className="flex items-center space-x-2">
            <Trophy className="h-4 w-4" />
            <span>Reputation</span>
          </TabsTrigger>
        </TabsList>

        {/* Clubs Tab */}
        <TabsContent value="clubs" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold">Clubs & Communities</h2>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={showMyClubs}
                  onCheckedChange={setShowMyClubs}
                  id="my-clubs"
                />
                <Label htmlFor="my-clubs">My Clubs</Label>
              </div>
            </div>
            <Dialog open={showCreateClub} onOpenChange={setShowCreateClub}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Club
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Create New Club</DialogTitle>
                  <DialogDescription>
                    Start a new community around your interests
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="club-name">Club Name</Label>
                    <Input
                      id="club-name"
                      value={clubForm.name}
                      onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })}
                      placeholder="Enter club name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="club-description">Description</Label>
                    <Textarea
                      id="club-description"
                      value={clubForm.description}
                      onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })}
                      placeholder="Describe your club"
                    />
                  </div>
                  <div>
                    <Label htmlFor="club-category">Category</Label>
                    <Select value={clubForm.category} onValueChange={(value) => setClubForm({ ...clubForm, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLUB_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.icon} {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={clubForm.is_private}
                      onCheckedChange={(checked) => setClubForm({ ...clubForm, is_private: checked })}
                      id="private-club"
                    />
                    <Label htmlFor="private-club">Private Club (requires approval)</Label>
                  </div>
                  <div>
                    <Label htmlFor="max-members">Maximum Members</Label>
                    <Input
                      id="max-members"
                      type="number"
                      value={clubForm.max_members}
                      onChange={(e) => setClubForm({ ...clubForm, max_members: parseInt(e.target.value) })}
                      min="1"
                      max="1000"
                    />
                  </div>
                  <Button onClick={createClub} className="w-full">
                    Create Club
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded"></div>
                      <div className="h-3 bg-muted rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {clubs.map((club) => (
                <Card key={club.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{club.name}</CardTitle>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">
                            {CLUB_CATEGORIES.find(c => c.value === club.category)?.icon}
                            {CLUB_CATEGORIES.find(c => c.value === club.category)?.label}
                          </Badge>
                          {club.is_private && (
                            <Badge variant="secondary">
                              <Shield className="h-3 w-3 mr-1" />
                              Private
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={club.created_by_user.avatar_url} />
                        <AvatarFallback>{club.created_by_user.username[0]}</AvatarFallback>
                      </Avatar>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-4">
                      {club.description || 'No description available'}
                    </CardDescription>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {club.member_count}/{club.max_members}
                        </span>
                      </div>
                      {club.is_member ? (
                        <Button variant="outline" size="sm">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Chat
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => joinClub(club.id)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Join
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Events & Meetups</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          </div>
          
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Events Coming Soon</h3>
            <p className="text-muted-foreground">Event management features are being developed</p>
          </div>
        </TabsContent>

        {/* Collaboration Tab */}
        <TabsContent value="collaboration" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Study & Collaboration Tools</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Tool
            </Button>
          </div>
          
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Collaboration Tools Coming Soon</h3>
            <p className="text-muted-foreground">Study tools and collaboration features are being developed</p>
          </div>
        </TabsContent>

        {/* Reputation Tab */}
        <TabsContent value="reputation" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Campus Reputation & Rewards</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span>Campus XP</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{userReputation?.total_xp || 0}</div>
                <p className="text-sm text-muted-foreground">Total points earned</p>
                <div className="mt-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Level {userReputation?.level || 1}</span>
                    <span>{userReputation?.xp_to_next_level || 0} XP to next level</span>
                  </div>
                  <Progress 
                    value={userReputation ? ((userReputation.total_xp % 1000) / 1000) * 100 : 0} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-purple-500" />
                  <span>Campus Rank</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">#{userReputation?.rank || 'N/A'}</div>
                <p className="text-sm text-muted-foreground">Out of {leaderboard.total_users || 0} students</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                  <span>Weekly Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">{userReputation?.weekly_xp || 0}</div>
                <p className="text-sm text-muted-foreground">XP earned this week</p>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Campus Leaderboard</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {leaderboard.entries?.map((entry: LeaderboardEntry, index: number) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      entry.user_id === user?.id ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-amber-600 text-white' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{entry.full_name || 'Anonymous'}</p>
                        <p className="text-sm text-muted-foreground">Level {entry.level}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{entry.total_xp} XP</p>
                      <p className="text-sm text-muted-foreground">+{entry.weekly_xp} this week</p>
                    </div>
                  </div>
                ))}
                
                {leaderboard.current_user && leaderboard.current_user.rank > 10 && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                          {leaderboard.current_user.rank}
                        </div>
                        <div>
                          <p className="font-medium">You</p>
                          <p className="text-sm text-muted-foreground">Level {leaderboard.current_user.level}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{leaderboard.current_user.total_xp} XP</p>
                        <p className="text-sm text-muted-foreground">+{leaderboard.current_user.weekly_xp} this week</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}