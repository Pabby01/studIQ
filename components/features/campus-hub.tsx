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
  MoreHorizontal,
  CreditCard,
  QrCode,
  Store,
  Lock,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { DialogFooter } from '@/components/ui/dialog';

import { subscribeToUserData, unsubscribe } from '@/lib/realtime-service';
import { cacheGet, cacheSet, debounce, measurePerformance } from '@/lib/performance-optimizer';
import { ClubSpace } from './club-space';

interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  is_private: boolean;
  max_members: number;
  created_at: string;
  created_by: string;
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

// Add new interfaces for campus services
interface CampusService {
  id: string;
  name: string;
  category: string;
  location: string;
  hours: string;
  rating: number;
  accepts: string[];
  featured?: boolean;
}

interface PaymentHistory {
  id: string;
  merchant: string;
  amount: string;
  token: string;
  time: string;
}

// Add campus services data
const CAMPUS_SERVICES: CampusService[] = [
  {
    id: '1',
    name: 'Campus Cafeteria',
    category: 'Food',
    location: 'Student Center',
    hours: '7:00 AM - 9:00 PM',
    rating: 4.5,
    accepts: ['SOL', 'USDC', 'Credits'],
    featured: true,
  },
  {
    id: '2',
    name: 'Library Coffee Shop',
    category: 'Food',
    location: 'Main Library',
    hours: '6:00 AM - 11:00 PM',
    rating: 4.2,
    accepts: ['SOL', 'USDC'],
  },
  {
    id: '3',
    name: 'Campus Shuttle',
    category: 'Transport',
    location: 'Various Stops',
    hours: '6:00 AM - 10:00 PM',
    rating: 4.0,
    accepts: ['SOL', 'Credits'],
  },
  {
    id: '4',
    name: 'Gym & Fitness',
    category: 'Sports',
    location: 'Recreation Center',
    hours: '5:00 AM - 11:00 PM',
    rating: 4.7,
    accepts: ['SOL', 'USDC', 'Credits'],
    featured: true,
  },
];

const RECENT_PAYMENTS: PaymentHistory[] = [
  { id: '1', merchant: 'Campus Cafeteria', amount: '12.50', token: 'USDC', time: '2 hours ago' },
  { id: '2', merchant: 'Library Coffee', amount: '4.25', token: 'SOL', time: '1 day ago' },
  { id: '3', merchant: 'Campus Shuttle', amount: '2.00', token: 'Credits', time: '2 days ago' },
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

  // Services tab state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [serviceCategory, setServiceCategory] = useState('all');
  const [campusServices, setCampusServices] = useState<CampusService[]>(CAMPUS_SERVICES);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>(RECENT_PAYMENTS);
  const [campusCredits, setCampusCredits] = useState(125.50);
  const [selectedService, setSelectedService] = useState<CampusService | null>(null);
  
  // Add missing state variables for Clubs tab
  const [isLoadingClubs, setIsLoadingClubs] = useState(false);
  const [isCreatingClub, setIsCreatingClub] = useState(false);
  const [isJoiningClub, setIsJoiningClub] = useState<string | null>(null);
  const [userClubs, setUserClubs] = useState<Club[]>([]);
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);

  // Fetch data functions with performance optimization
  const fetchClubs = useCallback(async () => {
    setIsLoadingClubs(true);
    const cacheKey = `clubs_${selectedCategory}_${searchQuery}_${showMyClubs}`;
    const cached = cacheGet(cacheKey) as Club[] | null;
    if (cached) {
      setClubs(cached);
      setIsLoadingClubs(false);
      return;
    }

    try {
      const result = await measurePerformance('fetchClubs', async () => {
        const params = new URLSearchParams();
        if (selectedCategory !== 'all') params.append('category', selectedCategory);
        if (searchQuery) params.append('search', searchQuery);
        if (showMyClubs) params.append('my_clubs', 'true');

        const response = await fetch(`/api/clubs?${params}`);
        const data = await response.json();
        
        if (response.ok) {
          const clubs = data.clubs || [];
          setClubs(clubs);
          cacheSet(cacheKey, clubs, 5 * 60 * 1000); // Cache for 5 minutes
          return clubs;
        } else {
          toast.error(data.error || 'Failed to fetch clubs');
          throw new Error(data.error || 'Failed to fetch clubs');
        }
      });
    } catch (error) {
      console.error('Error fetching clubs:', error);
      toast.error('Failed to fetch clubs');
    } finally {
      setIsLoadingClubs(false);
    }
  }, [selectedCategory, searchQuery, showMyClubs]);

  const fetchEvents = useCallback(async () => {
    const cacheKey = `events_${selectedCategory}_${searchQuery}`;
    const cached = cacheGet(cacheKey) as Event[] | null;
    if (cached) {
      setEvents(cached);
      return;
    }

    try {
      const result = await measurePerformance('fetchEvents', async () => {
        const params = new URLSearchParams();
        if (selectedCategory !== 'all') params.append('category', selectedCategory);
        if (searchQuery) params.append('search', searchQuery);

        const response = await fetch(`/api/events?${params}`);
        const data = await response.json();
        
        if (response.ok) {
          const events = data.events || [];
          setEvents(events);
          cacheSet(cacheKey, events, 5 * 60 * 1000); // Cache for 5 minutes
          return events;
        } else {
          toast.error(data.error || 'Failed to fetch events');
          throw new Error(data.error || 'Failed to fetch events');
        }
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to fetch events');
    }
  }, [selectedCategory, searchQuery]);

  const fetchCollaborationTools = useCallback(async () => {
    const cacheKey = `collaboration_tools_${searchQuery}`;
    const cached = cacheGet(cacheKey) as CollaborationTool[] | null;
    if (cached) {
      setCollaborationTools(cached);
      return;
    }

    try {
      const result = await measurePerformance('fetchCollaborationTools', async () => {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);

        const response = await fetch(`/api/collaboration-tools?${params}`);
        const data = await response.json();
        
        if (response.ok) {
          const tools = data.tools || [];
          setCollaborationTools(tools);
          cacheSet(cacheKey, tools, 5 * 60 * 1000); // Cache for 5 minutes
          return tools;
        } else {
          toast.error(data.error || 'Failed to fetch collaboration tools');
          throw new Error(data.error || 'Failed to fetch collaboration tools');
        }
      });
    } catch (error) {
      console.error('Error fetching collaboration tools:', error);
      toast.error('Failed to fetch collaboration tools');
    }
  }, [searchQuery]);

  const fetchUserReputation = useCallback(async () => {
    const cacheKey = 'user_reputation';
    const cached = cacheGet(cacheKey) as UserReputation | null;
    if (cached) {
      setUserReputation(cached);
      return;
    }

    try {
      const result = await measurePerformance('fetchReputation', async () => {
        const response = await fetch('/api/reputation');
        const data = await response.json();
        
        if (response.ok) {
          setUserReputation(data);
          cacheSet(cacheKey, data, 5 * 60 * 1000); // Cache for 5 minutes
          return data;
        } else {
          toast.error(data.error || 'Failed to fetch reputation');
          throw new Error(data.error || 'Failed to fetch reputation');
        }
      });
    } catch (error) {
      console.error('Error fetching reputation:', error);
      toast.error('Failed to fetch reputation');
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    const cacheKey = 'notifications';
    const cached = cacheGet(cacheKey) as { notifications: Notification[]; unreadCount: number } | null;
    if (cached) {
      setNotifications(cached.notifications || []);
      setUnreadCount(cached.unreadCount || 0);
      return;
    }

    try {
      const result = await measurePerformance('fetchNotifications', async () => {
        const response = await fetch('/api/notifications');
        const data = await response.json();
        
        if (response.ok) {
          const notificationData = {
            notifications: data.notifications || [],
            unreadCount: data.unreadCount || 0
          };
          setNotifications(notificationData.notifications);
          setUnreadCount(notificationData.unreadCount);
          cacheSet(cacheKey, notificationData, 2 * 60 * 1000); // Cache for 2 minutes
          return notificationData;
        } else {
          toast.error(data.error || 'Failed to fetch notifications');
          throw new Error(data.error || 'Failed to fetch notifications');
        }
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    const cacheKey = 'leaderboard';
    const cached = cacheGet(cacheKey) as LeaderboardResponse | null;
    if (cached) {
      setLeaderboard(cached);
      return;
    }

    try {
      const result = await measurePerformance('fetchLeaderboard', async () => {
        const response = await fetch('/api/leaderboard');
        const data = await response.json();
        
        if (response.ok) {
          setLeaderboard(data);
          cacheSet(cacheKey, data, 10 * 60 * 1000); // Cache for 10 minutes
          return data;
        } else {
          toast.error(data.error || 'Failed to fetch leaderboard');
          throw new Error(data.error || 'Failed to fetch leaderboard');
        }
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      toast.error('Failed to fetch leaderboard');
    }
  }, []);

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
        fetchUserClubs(); // Update user clubs to reflect the new membership
      } else {
        toast.error(data.error || 'Failed to create club');
      }
    } catch (error) {
      console.error('Error creating club:', error);
      toast.error('Failed to create club');
    }
  };

  const fetchUserClubs = useCallback(async () => {
    try {
      const response = await fetch('/api/clubs?my_clubs=true');
      const data = await response.json();
      
      if (response.ok) {
        setUserClubs(data.clubs || []);
      } else {
        console.error('Failed to fetch user clubs:', data.error);
      }
    } catch (error) {
      console.error('Error fetching user clubs:', error);
    }
  }, []);

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
        fetchUserClubs(); // Refresh user clubs after joining
      } else {
        // Handle "Already a member" case gracefully
        if (data.error === 'Already a member of this club') {
          toast.info('You are already a member of this club');
          // Refresh user clubs to ensure UI state is correct
          fetchUserClubs();
        } else {
          toast.error(data.error || 'Failed to join club');
        }
      }
    } catch (error) {
      console.error('Error joining club:', error);
      toast.error('Failed to join club');
    }
  };

  // Add missing handler functions
  const handleCreateClub = async () => {
    setIsCreatingClub(true);
    try {
      await createClub();
    } finally {
      setIsCreatingClub(false);
    }
  };

  const handleJoinClub = async (clubId: string) => {
    setIsJoiningClub(clubId);
    try {
      await joinClub(clubId);
    } finally {
      setIsJoiningClub(null);
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
        fetchUserReputation(),
        fetchNotifications(),
        fetchLeaderboard(),
        fetchUserClubs(),
      ]).finally(() => setLoading(false));
    }
  }, [user, fetchClubs, fetchEvents, fetchCollaborationTools, fetchUserReputation, fetchNotifications, fetchLeaderboard, fetchUserClubs]);

  // Real-time updates for notifications using optimized service
  useEffect(() => {
    if (user) {
      // Subscribe to real-time updates for notifications
      const subscriptionId = subscribeToUserData(
        user.id,
        'notifications',
        (payload) => {
          console.log('Notification update received:', payload);
          fetchNotifications(); // Refresh notifications when new ones arrive
        },
        (error: Error) => {
          console.error('Real-time subscription error:', error);
          toast.error('Connection lost. Please refresh the page.');
        }
      );

      return () => {
        unsubscribe(subscriptionId);
      };
    }
  }, [fetchNotifications, user]);

  // Real-time updates for club membership changes
  useEffect(() => {
    if (user) {
      const channel = supabase
        .channel('club-membership-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'club_members',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Club membership update received:', payload);
            // Refresh user clubs when membership changes
            fetchUserClubs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchUserClubs, supabase]);

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

  // Show ClubSpace when a club is selected
  if (selectedClub) {
    return (
      <ClubSpace 
        club={selectedClub} 
        onBack={() => setSelectedClub(null)}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-600 to-orange-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Campus Hub</h1>
        <p className="text-rose-100">
          Connect, collaborate, and grow with your campus community
        </p>
      </div>

      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3">
            <Badge variant="secondary" className="flex items-center space-x-1 bg-rose-100 text-rose-700 border-rose-200">
              <Trophy className="h-3 w-3" />
              <span>XP: {userReputation?.total_xp || 0}</span>
            </Badge>
            <Badge variant="outline" className="flex items-center space-x-1">
              <Award className="h-3 w-3" />
              <span>Level {userReputation?.level || 1}</span>
            </Badge>
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
                            className={`p-3 border-b last:border-b-0 hover:bg-rose-50 transition-colors ${
                              !notification.read ? 'bg-rose-50 border-l-4 border-l-rose-500' : ''
                            }`}
                          >
                            <div className="flex items-start space-x-2">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-rose-900">{notification.title}</p>
                                <p className="text-xs text-rose-700">{notification.message}</p>
                                <p className="text-xs text-rose-600 mt-1">
                                  {new Date(notification.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-rose-500 rounded-full mt-1" />
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
            <SelectTrigger className="w-full sm:w-[180px]">
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
        <div className="w-full overflow-x-auto">
          <TabsList className="grid w-full grid-cols-5 min-w-[400px] sm:min-w-[500px] md:min-w-0">
            <TabsTrigger value="services" className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
              <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Services</span>
              <span className="sm:hidden">Pay</span>
            </TabsTrigger>
            <TabsTrigger value="clubs" className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
              <Users className="h-3 w-3 md:h-4 md:w-4" />
              <span>Clubs</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
              <Calendar className="h-3 w-3 md:h-4 md:w-4" />
              <span>Events</span>
            </TabsTrigger>
            <TabsTrigger value="collaboration" className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
              <BookOpen className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Study Tools</span>
              <span className="sm:hidden">Study</span>
            </TabsTrigger>
            <TabsTrigger value="reputation" className="flex items-center space-x-1 md:space-x-2 text-xs md:text-sm">
              <Trophy className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Reputation</span>
              <span className="sm:hidden">XP</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Services Tab - New integrated campus tools functionality */}
        <TabsContent value="services" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Pay Section */}
              <Card className="p-4 md:p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <h2 className="text-lg font-semibold">Quick Pay</h2>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  <div className="order-2 lg:order-1">
                    <h3 className="font-medium mb-3 text-sm md:text-base">Scan QR Code</h3>
                    <div className="aspect-square max-w-[200px] md:max-w-none bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 mx-auto lg:mx-0">
                      <div className="text-center">
                        <QrCode className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs md:text-sm text-gray-600">Point camera at QR code</p>
                      </div>
                    </div>
                  </div>

                  <div className="order-1 lg:order-2">
                    <h3 className="font-medium mb-3 text-sm md:text-base">Manual Payment</h3>
                    <div className="space-y-3">
                      <Input placeholder="Merchant ID or name" className="text-sm" />
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <Input
                          placeholder="Amount"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="text-sm flex-1"
                        />
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">SOL</Button>
                          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">USDC</Button>
                        </div>
                      </div>
                      <Button className="w-full" size="sm">
                        <CreditCard className="w-4 h-4 mr-2" />
                        Pay Now
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Campus Services Directory */}
              <Card className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
                  <h2 className="text-lg font-semibold">Campus Services</h2>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      variant={serviceCategory === 'all' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setServiceCategory('all')}
                      className="text-xs"
                    >
                      All
                    </Button>
                    <Button 
                      variant={serviceCategory === 'Food' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setServiceCategory('Food')}
                      className="text-xs"
                    >
                      Food
                    </Button>
                    <Button 
                      variant={serviceCategory === 'Transport' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setServiceCategory('Transport')}
                      className="text-xs"
                    >
                      Transport
                    </Button>
                    <Button 
                      variant={serviceCategory === 'Sports' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setServiceCategory('Sports')}
                      className="text-xs"
                    >
                      Sports
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 md:gap-4">
                  {campusServices
                    .filter(service => serviceCategory === 'all' || service.category === serviceCategory)
                    .map((service) => (
                    <div key={service.id} className="border border-rose-100 rounded-lg p-3 md:p-4 hover:shadow-lg hover:border-rose-200 transition-all duration-200 bg-gradient-to-br from-white to-rose-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-rose-500 to-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Store className="w-4 h-4 md:w-5 md:h-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-sm md:text-base truncate text-gray-800">{service.name}</h3>
                            <div className="flex items-center space-x-1 md:space-x-2 mt-1">
                              <Badge variant="secondary" className="text-xs bg-rose-100 text-rose-700 border-rose-200">
                                {service.category}
                              </Badge>
                              {service.featured && (
                                <Badge className="text-xs bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-200 hidden sm:inline-flex">
                                  ⭐ Featured
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <Star className="w-3 h-3 md:w-4 md:h-4 text-amber-500 fill-current" />
                          <span className="text-xs md:text-sm font-medium text-gray-700">{service.rating}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-1 md:space-y-2 text-xs md:text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0 text-rose-500" />
                          <span className="truncate">{service.location}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0 text-rose-500" />
                          <span className="truncate">{service.hours}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-rose-100">
                        <p className="text-xs md:text-sm text-gray-600 mb-1 md:mb-2">Accepts:</p>
                        <div className="flex flex-wrap gap-1">
                          {service.accepts.map((token) => (
                            <Badge key={token} variant="outline" className="text-xs border-rose-200 text-rose-700 hover:bg-rose-50">
                              {token}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <Button 
                        className="w-full mt-2 md:mt-3 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white border-0" 
                        size="sm"
                        onClick={() => setSelectedService(service)}
                      >
                        <CreditCard className="w-3 h-3 md:w-4 md:h-4 mr-2" />
                        <span className="text-xs md:text-sm">Quick Pay</span>
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Recent Payments */}
              <Card className="p-4 md:p-6 border-rose-100 bg-gradient-to-br from-white to-rose-50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800">Recent Campus Payments</h2>
                  <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50">View All</Button>
                </div>
                
                <div className="space-y-3">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border border-rose-100 rounded-lg bg-white hover:shadow-md transition-shadow">
                      <div>
                        <p className="font-medium text-gray-800">{payment.merchant}</p>
                        <p className="text-sm text-gray-600">{payment.time}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-800">${payment.amount}</p>
                        <Badge variant="outline" className="text-xs border-rose-200 text-rose-700">
                          {payment.token}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4 md:space-y-6">
              {/* Campus Credits Balance */}
              <Card className="p-4 md:p-6 bg-gradient-to-br from-rose-50 to-amber-50 border-rose-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-rose-600 to-amber-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">C</span>
                  </div>
                  <h3 className="font-semibold text-gray-800">Campus Credits</h3>
                </div>
                
                <div className="text-center">
                  <p className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent mb-1">
                    {campusCredits.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Credits available
                  </p>
                  <Button size="sm" className="w-full bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white border-0">
                    Top Up Credits
                  </Button>
                </div>
              </Card>

              {/* Quick Access to Events */}
              <Card className="p-4 md:p-6 border-rose-100 bg-gradient-to-br from-white to-rose-50">
                <div className="flex items-center space-x-3 mb-4">
                  <Calendar className="w-5 h-5 text-rose-600" />
                  <h3 className="font-semibold text-gray-800">Upcoming Events</h3>
                </div>
                
                <div className="space-y-3">
                  {events.slice(0, 3).map((event) => (
                    <div key={event.id} className="p-3 border border-rose-100 rounded-lg bg-white hover:shadow-md transition-shadow">
                      <h4 className="font-medium mb-1 text-gray-800">{event.title}</h4>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3 h-3 text-rose-500" />
                          <span>{new Date(event.event_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-3 h-3 text-rose-500" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="w-full mt-3 border-rose-200 text-rose-700 hover:bg-rose-50"
                        onClick={() => setActiveTab('events')}
                      >
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  onClick={() => setActiveTab('events')}
                >
                  View All Events
                </Button>
              </Card>

              {/* Quick Access to Clubs */}
              <Card className="p-4 md:p-6 border-rose-100 bg-gradient-to-br from-white to-rose-50">
                <div className="flex items-center space-x-3 mb-4">
                  <Users className="w-5 h-5 text-rose-600" />
                  <h3 className="font-semibold text-gray-800">My Clubs</h3>
                </div>
                
                <div className="space-y-3">
                  {clubs.filter(club => club.is_member).slice(0, 2).map((club) => (
                    <div key={club.id} className="p-3 border border-rose-100 rounded-lg bg-white hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-800">{club.name}</h4>
                        <Badge className="text-xs bg-gradient-to-r from-rose-100 to-amber-100 text-rose-700 border-rose-200">
                          Member
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {club.member_count} members
                      </p>
                    </div>
                  ))}
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full mt-3"
                  onClick={() => setActiveTab('clubs')}
                >
                  View All Clubs
                </Button>
              </Card>
            </div>
          </div>
        </TabsContent>

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
                    <Label htmlFor="club-name" className="text-gray-700">Club Name</Label>
                    <Input
                      id="club-name"
                      value={clubForm.name}
                      onChange={(e) => setClubForm({ ...clubForm, name: e.target.value })}
                      placeholder="Enter club name"
                      className="border-rose-200 focus:border-rose-500 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="club-description" className="text-gray-700">Description</Label>
                    <Textarea
                      id="club-description"
                      value={clubForm.description}
                      onChange={(e) => setClubForm({ ...clubForm, description: e.target.value })}
                      placeholder="Describe your club"
                      className="border-rose-200 focus:border-rose-500 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="club-category" className="text-gray-700">Category</Label>
                    <Select value={clubForm.category} onValueChange={(value) => setClubForm({ ...clubForm, category: value })}>
                      <SelectTrigger className="border-rose-200 focus:border-rose-500 focus:ring-rose-500">
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
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-rose-600 data-[state=checked]:to-amber-600"
                    />
                    <Label htmlFor="private-club" className="text-sm text-gray-700">Private Club (requires approval)</Label>
                  </div>
                  <div>
                    <Label htmlFor="max-members" className="text-gray-700">Maximum Members</Label>
                    <Input
                      id="max-members"
                      type="number"
                      value={clubForm.max_members}
                      onChange={(e) => setClubForm({ ...clubForm, max_members: parseInt(e.target.value) })}
                      min="1"
                      max="1000"
                      className="border-rose-200 focus:border-rose-500 focus:ring-rose-500"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    type="submit" 
                    onClick={handleCreateClub}
                    disabled={isCreatingClub}
                    className="bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white border-0"
                  >
                    {isCreatingClub ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Club'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {isLoadingClubs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="p-4 md:p-6 border-rose-100 bg-gradient-to-br from-white to-rose-50">
                  <div className="animate-pulse">
                    <div className="h-4 bg-rose-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-rose-100 rounded w-1/2 mb-4"></div>
                    <div className="h-20 bg-rose-100 rounded mb-4"></div>
                    <div className="flex space-x-2">
                      <div className="h-8 bg-rose-200 rounded flex-1"></div>
                      <div className="h-8 bg-amber-200 rounded flex-1"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {(showMyClubs ? userClubs : clubs).map((club) => (
                <Card key={club.id} className="p-4 md:p-6 hover:shadow-xl transition-all duration-300 border-rose-100 bg-gradient-to-br from-white to-rose-50 hover:border-rose-200 group">
                  <div className="flex items-start justify-between mb-3 md:mb-4">
                    <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-rose-500 to-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                        <Users className="w-5 h-5 md:w-6 md:h-6 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm md:text-base text-gray-800 truncate group-hover:text-rose-700 transition-colors">{club.name}</h3>
                        <div className="flex items-center space-x-1 md:space-x-2 mt-1">
                          <Badge variant="secondary" className="text-xs bg-rose-100 text-rose-700 border-rose-200">
                            {club.category}
                          </Badge>
                          {club.is_private && (
                            <Badge variant="outline" className="text-xs border-amber-200 text-amber-700 bg-amber-50">
                              <Lock className="w-3 h-3 mr-1" />
                              Private
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs md:text-sm text-gray-600 mb-3 md:mb-4 line-clamp-3">{club.description}</p>
                  
                  <div className="flex items-center justify-between text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3 md:w-4 md:h-4 text-rose-500" />
                      <span>{club.member_count} members</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 md:w-4 md:h-4 text-amber-500" />
                      <span>Active</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    {userClubs.some(userClub => userClub.id === club.id) ? (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1 border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300"
                          onClick={() => setSelectedClub(club)}
                        >
                          <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                          <span className="text-xs md:text-sm">View Club</span>
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300"
                        >
                          <Settings className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="sm" 
                        className="flex-1 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white border-0"
                        onClick={() => handleJoinClub(club.id)}
                        disabled={isJoiningClub === club.id}
                      >
                        {isJoiningClub === club.id ? (
                          <>
                            <Loader2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
                            <span className="text-xs md:text-sm">Joining...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                            <span className="text-xs md:text-sm">Join Club</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>
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