/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/components/providers/providers';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { 
  subscribeToClubSpace,
  unsubscribeMultiple,
  getRealtimeStatus
} from '@/lib/realtime-service';
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
  Globe,
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
  ArrowLeft,
  Upload,
  Download,
  FileText,
  Image,
  Video,
  Smile,
  Hash,
  Volume2,
  VolumeX,
  UserCheck,
  UserX,
  ShieldCheck,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { ClubChat } from './club-chat';

interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  is_private: boolean;
  max_members: number;
  created_at: string;
  created_by: string;
  banner_url?: string;
  avatar_url?: string;
  member_count: number;
  is_member: boolean;
}

interface ClubMember {
  id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  user_profile: {
    full_name: string;
    username: string;
    avatar_url?: string;
  };
  user_reputation?: {
    total_xp: number;
    level: number;
  };
  is_online?: boolean;
}

interface ClubEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  max_attendees: number;
  is_virtual: boolean;
  virtual_link?: string;
  event_type?: 'hackathon' | 'workshop' | 'career_fair' | 'study_session' | 'social';
  club_id: string;
  created_by: string;
  rsvp_count?: number;
  requires_rsvp?: boolean;
  user_rsvp_status?: 'going' | 'maybe' | 'not_going' | null;
  attendee_count: number;
  is_attending: boolean;
}

interface ClubResource {
  id: string;
  title: string;
  description: string;
  resource_type: 'link' | 'file' | 'note';
  resource_url?: string;
  content?: string;
  category: string;
  club_id: string;
  created_by: string;
  created_at: string;
  user_profile: {
    full_name: string;
    avatar_url?: string;
  };
}

interface ClubSpaceProps {
  club: Club;
  onBack: () => void;
}

export function ClubSpace({ club, onBack }: ClubSpaceProps) {
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [resources, setResources] = useState<ClubResource[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'moderator' | 'member' | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  
  // Add state for real-time club data
  const [clubData, setClubData] = useState<Club>(club);
  const [realTimeMemberCount, setRealTimeMemberCount] = useState(club.member_count);

  // Dialog states
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateResource, setShowCreateResource] = useState(false);
  const [showMemberProfile, setShowMemberProfile] = useState<ClubMember | null>(null);
  const [showBannerUpload, setShowBannerUpload] = useState(false);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  
  // Form states
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_type: 'social' as 'career_fair' | 'hackathon' | 'study_session' | 'social' | 'workshop',
    location: '',
    virtual_link: '',
    start_time: '',
    end_time: '',
    max_attendees: 100,
    requires_rsvp: true,
  });
  
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    resource_type: 'link' as 'link' | 'file' | 'note',
    resource_url: '',
    content: '',
    category: 'study-materials',
  });

  // Add state for saved resources and loading states
  const [savedResources, setSavedResources] = useState<Set<string>>(new Set());
  const [membersLoading, setMembersLoading] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  // Fetch club data
  const fetchClubData = useCallback(async () => {
    setLoading(true);
    setMembersLoading(true);
    setResourcesLoading(true);
    
    try {
      // First, get the current user's table ID
      let currentUserId = null;
      if (user?.id) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', user.id)
          .single();
        
        if (userData) {
          currentUserId = userData.id;
          setCurrentUserId(userData.id);
        }
      }

      // Fetch updated club data with current member count
      const { data: updatedClubData } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', club.id)
        .single();

      if (updatedClubData) {
        setClubData(updatedClubData);
        setRealTimeMemberCount(updatedClubData.member_count);
      }

      // Fetch members with loading state
      setMembersLoading(true);
      const { data: membersData } = await supabase
        .from('club_members')
        .select(`
          *,
          user_profile:users(full_name, username, avatar_url),
          user_reputation(total_xp, level)
        `)
        .eq('club_id', club.id);

      if (membersData) {
        setMembers(membersData);
        // Update real-time member count based on actual members
        setRealTimeMemberCount(membersData.length);
        
        // Find current user's role
        const currentUserMember = membersData.find(m => m.user_id === currentUserId);
        if (currentUserMember) {
          setUserRole(currentUserMember.role);
        }
      }
      setMembersLoading(false);

      // Fetch events
      const { data: eventsData } = await supabase
        .from('club_events')
        .select('*')
        .eq('club_id', club.id)
        .order('event_date', { ascending: true });

      if (eventsData) {
        setEvents(eventsData);
      }

      // Fetch resources with loading state
      setResourcesLoading(true);
      const { data: resourcesData } = await supabase
        .from('club_resources')
        .select(`
          *,
          user_profile:users(full_name, avatar_url)
        `)
        .eq('club_id', club.id)
        .order('created_at', { ascending: false });

      if (resourcesData) {
        setResources(resourcesData);
      }
      setResourcesLoading(false);

      // Fetch saved resources for current user
      if (currentUserId) {
        const { data: savedResourcesData } = await supabase
          .from('saved_resources')
          .select('resource_id')
          .eq('user_id', currentUserId)
          .eq('club_id', club.id);

        if (savedResourcesData) {
          setSavedResources(new Set(savedResourcesData.map(sr => sr.resource_id)));
        }
      }
    } catch (error) {
      console.error('Error fetching club data:', error);
      toast.error('Failed to load club data');
    } finally {
      setLoading(false);
      setMembersLoading(false);
      setResourcesLoading(false);
    }
  }, [club.id, user?.id, supabase]);

  // Add save resource functionality
  const saveResource = async (resourceId: string) => {
    try {
      const { error } = await supabase
        .from('saved_resources')
        .insert({
          user_id: currentUserId,
          resource_id: resourceId,
          club_id: club.id
        });

      if (error) throw error;

      setSavedResources(prev => new Set([...Array.from(prev), resourceId]));
      toast.success('Resource saved!');
    } catch (error) {
      console.error('Error saving resource:', error);
      toast.error('Failed to save resource');
    }
  };

  // Add unsave resource functionality
  const unsaveResource = async (resourceId: string) => {
    try {
      const { error } = await supabase
        .from('saved_resources')
        .delete()
        .eq('user_id', currentUserId)
        .eq('resource_id', resourceId);

      if (error) throw error;

      setSavedResources(prev => {
        const newSet = new Set(prev);
        newSet.delete(resourceId);
        return newSet;
      });
      toast.success('Resource unsaved');
    } catch (error) {
      console.error('Error unsaving resource:', error);
      toast.error('Failed to unsave resource');
    }
  };

  // Add share resource functionality
  const shareResource = async (resource: ClubResource) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: resource.title,
          text: resource.description,
          url: resource.resource_url || window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        const shareText = `${resource.title}\n${resource.description}\n${resource.resource_url || window.location.href}`;
        await navigator.clipboard.writeText(shareText);
        toast.success('Resource link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing resource:', error);
      toast.error('Failed to share resource');
    }
  };

  useEffect(() => {
    fetchClubData();
  }, [fetchClubData]);

  // Enhanced real-time subscription using the optimized service
  useEffect(() => {
    if (!club.id) return;

    // Subscribe to all club-related data using the enhanced service
    const subscriptionIds = subscribeToClubSpace(club.id, {
      onClubUpdate: (data) => {
        console.log('Club data updated:', data);
        setClubData(prevData => ({
          ...prevData,
          ...(data.new as Club)
        }));
        // Update member count from the new club data
        if (data.new && (data.new as any).member_count !== undefined) {
          setRealTimeMemberCount((data.new as any).member_count);
        }
      },
      onMembersUpdate: (data) => {
        console.log('Club members updated:', data);
        setMembers(prevMembers => {
          if (data.new) {
            return [...prevMembers, data.new];
          }
          return prevMembers.filter(m => m.id !== (data.old as any)?.id);
        });
        // Update member count based on current members array length
        setRealTimeMemberCount(prevCount => {
          if (data.new) {
            return prevCount + 1; // Member added
          } else if (data.old) {
            return Math.max(0, prevCount - 1); // Member removed
          }
          return prevCount;
        });
      },
      onEventsUpdate: (data) => {
        console.log('Club events updated:', data);
        fetchClubData(); // Refresh to get complete event data
      },
      onResourcesUpdate: (data) => {
        console.log('Club resources updated:', data);
        fetchClubData(); // Refresh to get complete resource data
      },
      onMessagesUpdate: (data) => {
        console.log('Club messages updated:', data);
        // Messages are handled by the ClubChat component
      }
    });

    // Cleanup function
    return () => {
      if (subscriptionIds.length > 0) {
        unsubscribeMultiple(subscriptionIds);
      }
    };
  }, [club.id, fetchClubData]);

  // Create event
  const createEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([{
          ...eventForm,
          club_id: club.id,
          created_by: currentUserId,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Event created successfully!');
      setShowCreateEvent(false);
      setEventForm({
        title: '',
        description: '',
        event_type: 'social' as 'career_fair' | 'hackathon' | 'study_session' | 'social' | 'workshop',
        location: '',
        virtual_link: '',
        start_time: '',
        end_time: '',
        max_attendees: 100,
        requires_rsvp: true,
      });
      fetchClubData();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    }
  };

  // Create resource
  const createResource = async () => {
    try {
      const { data, error } = await supabase
        .from('club_resources')
        .insert([{
          ...resourceForm,
          club_id: club.id,
          created_by: currentUserId,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Resource added successfully!');
      setShowCreateResource(false);
      setResourceForm({
        title: '',
        description: '',
        resource_type: 'link',
        resource_url: '',
        content: '',
        category: 'study-materials',
      });
      fetchClubData();
    } catch (error) {
      console.error('Error creating resource:', error);
      toast.error('Failed to add resource');
    }
  };

  // RSVP to event
  const rsvpEvent = async (eventId: string, status: 'going' | 'maybe' | 'not_going' = 'going') => {
    try {
      const { error } = await supabase
        .from('event_rsvps')
        .upsert([{
          event_id: eventId,
          user_id: currentUserId,
          status: status,
        }], {
          onConflict: 'event_id,user_id'
        });

      if (error) throw error;

      toast.success(`RSVP updated: ${status === 'going' ? 'Going' : status === 'maybe' ? 'Maybe' : 'Not Going'}!`);
      fetchClubData();
    } catch (error) {
      console.error('Error RSVPing to event:', error);
      toast.error('Failed to update RSVP');
    }
  };

  // Upload banner image (admin only)
  const uploadBanner = async () => {
    if (!bannerFile || userRole !== 'admin') return;

    try {
      const fileExt = bannerFile.name.split('.').pop();
      const fileName = `${club.id}-banner-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('club-banners')
        .upload(fileName, bannerFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('club-banners')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('clubs')
        .update({ banner_image: publicUrl })
        .eq('id', club.id);

      if (updateError) throw updateError;

      toast.success('Banner updated successfully!');
      setShowBannerUpload(false);
      setBannerFile(null);
      fetchClubData();
    } catch (error) {
      console.error('Error uploading banner:', error);
      toast.error('Failed to update banner');
    }
  };

  // Manage member role (admin only)
  const updateMemberRole = async (memberId: string, newRole: 'admin' | 'moderator' | 'member') => {
    if (userRole !== 'admin') return;

    try {
      const { error } = await supabase
        .from('club_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Member role updated!');
      fetchClubData();
    } catch (error) {
      console.error('Error updating member role:', error);
      toast.error('Failed to update member role');
    }
  };

  // Remove member (admin only)
  const removeMember = async (memberId: string) => {
    if (userRole !== 'admin') return;

    try {
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Member removed from club');
      fetchClubData();
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clubs
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{club.name}</h1>
          <p className="text-gray-600">{club.member_count} members</p>
        </div>
      </div>

      {/* Club Banner */}
      {club.banner_url ? (
        <div className="relative h-48 rounded-lg overflow-hidden group">
          <img 
            src={club.banner_url} 
            alt={club.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {userRole === 'admin' && (
            <Button
              onClick={() => setShowBannerUpload(true)}
              className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 backdrop-blur-sm hover:bg-white/30"
              size="sm"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Banner
            </Button>
          )}
        </div>
      ) : userRole === 'admin' && (
        <div className="h-48 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
          <Button
            onClick={() => setShowBannerUpload(true)}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>Add Club Banner</span>
          </Button>
        </div>
      )}

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center space-x-2">
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Members</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Events</span>
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Resources</span>
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center space-x-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Leaderboard</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Club Info */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>About {club.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">{club.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{club.member_count} members</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>Created {new Date(club.created_at).toLocaleDateString()}</span>
                    </div>
                    <Badge variant="secondary">{club.category}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Members</span>
                    <span className="font-semibold">{realTimeMemberCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Upcoming Events</span>
                    <span className="font-semibold">{events.filter(e => new Date(e.event_date) > new Date()).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Resources</span>
                    <span className="font-semibold">{resources.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Online Now</span>
                    <span className="font-semibold">{members.filter(m => m.is_online).length}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {events.slice(0, 3).map((event) => (
                      <div key={event.id} className="flex items-center space-x-3">
                        <Calendar className="h-4 w-4 text-rose-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          <p className="text-xs text-gray-500">{new Date(event.event_date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <ClubChat clubId={club.id} clubName={club.name} />
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Club Members ({members.length})</h3>
            <div className="flex items-center space-x-2">
              <Input placeholder="Search members..." className="w-64" />
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {membersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
              <span className="ml-2 text-gray-600">Loading members...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
              <Card key={member.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={member.user_profile.avatar_url} />
                      <AvatarFallback>
                        {member.user_profile.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {member.is_online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{member.user_profile.full_name}</h4>
                    <p className="text-sm text-gray-500">@{member.user_profile.username}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge 
                        variant={member.role === 'admin' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {member.role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                        {member.role === 'moderator' && <Shield className="h-3 w-3 mr-1" />}
                        {member.role}
                      </Badge>
                      {member.user_reputation && (
                        <Badge variant="outline" className="text-xs">
                          Level {member.user_reputation.level}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {userRole === 'admin' && member.user_id !== currentUserId && (
                    <div className="flex flex-col space-y-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowMemberProfile(member)}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </div>
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
            <h3 className="text-lg font-semibold">Club Events</h3>
            {(userRole === 'admin' || userRole === 'moderator') && (
              <Dialog open={showCreateEvent} onOpenChange={setShowCreateEvent}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-gray-800">Create New Event</DialogTitle>
                    <DialogDescription className="text-gray-600">
                      Organize an event for your club members
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="event-title" className="text-sm font-medium text-gray-700">Event Title</Label>
                      <Input
                        id="event-title"
                        value={eventForm.title}
                        onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                        placeholder="Enter event title"
                        className="mt-1 border-gray-200 focus:border-rose-300 focus:ring-rose-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="event-description" className="text-sm font-medium text-gray-700">Description</Label>
                      <Textarea
                        id="event-description"
                        value={eventForm.description}
                        onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                        placeholder="Describe your event"
                        className="mt-1 border-gray-200 focus:border-rose-300 focus:ring-rose-200"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="event-type" className="text-sm font-medium text-gray-700">Event Type</Label>
                      <select
                        id="event-type"
                        value={eventForm.event_type}
                        onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value as any })}
                        className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-md focus:border-rose-300 focus:ring-rose-200"
                      >
                        <option value="social">Social</option>
                        <option value="study_session">Study Session</option>
                        <option value="workshop">Workshop</option>
                        <option value="career_fair">Career Fair</option>
                        <option value="hackathon">Hackathon</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start-time" className="text-sm font-medium text-gray-700">Start Time</Label>
                        <Input
                          id="start-time"
                          type="datetime-local"
                          value={eventForm.start_time}
                          onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                          className="mt-1 border-gray-200 focus:border-rose-300 focus:ring-rose-200"
                        />
                      </div>
                      <div>
                        <Label htmlFor="end-time" className="text-sm font-medium text-gray-700">End Time</Label>
                        <Input
                          id="end-time"
                          type="datetime-local"
                          value={eventForm.end_time}
                          onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                          className="mt-1 border-gray-200 focus:border-rose-300 focus:ring-rose-200"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="max-attendees" className="text-sm font-medium text-gray-700">Max Attendees</Label>
                      <Input
                        id="max-attendees"
                        type="number"
                        value={eventForm.max_attendees}
                        onChange={(e) => setEventForm({ ...eventForm, max_attendees: parseInt(e.target.value) })}
                        className="mt-1 border-gray-200 focus:border-rose-300 focus:ring-rose-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="event-location" className="text-sm font-medium text-gray-700">Location</Label>
                      <Input
                        id="event-location"
                        value={eventForm.location}
                        onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                        placeholder="Event location (leave empty for virtual events)"
                        className="mt-1 border-gray-200 focus:border-rose-300 focus:ring-rose-200"
                      />
                    </div>
                    <div>
                      <Label htmlFor="virtual-link" className="text-sm font-medium text-gray-700">Virtual Meeting Link (Optional)</Label>
                      <Input
                        id="virtual-link"
                        value={eventForm.virtual_link}
                        onChange={(e) => setEventForm({ ...eventForm, virtual_link: e.target.value })}
                        placeholder="Zoom, Teams, or other meeting link"
                        className="mt-1 border-gray-200 focus:border-rose-300 focus:ring-rose-200"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="requires-rsvp"
                        checked={eventForm.requires_rsvp}
                        onChange={(e) => setEventForm({ ...eventForm, requires_rsvp: e.target.checked })}
                        className="rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                      />
                      <Label htmlFor="requires-rsvp" className="text-sm text-gray-700">Requires RSVP</Label>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button variant="outline" onClick={() => setShowCreateEvent(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={createEvent}
                      className="bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-600 hover:to-purple-600 text-white"
                    >
                      Create Event
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((event) => (
              <Card key={event.id} className="p-6 bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-lg transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-lg text-gray-800">{event.title}</h4>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          event.event_type === 'hackathon' ? 'bg-purple-100 text-purple-700 border-purple-200' :
                          event.event_type === 'workshop' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                          event.event_type === 'career_fair' ? 'bg-green-100 text-green-700 border-green-200' :
                          event.event_type === 'study_session' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                          'bg-rose-100 text-rose-700 border-rose-200'
                        }`}
                      >
                        {event.event_type?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'Social'}
                      </Badge>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{event.description}</p>
                  </div>
                  {event.virtual_link && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">
                      Virtual
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4 text-rose-500" />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {new Date(event.start_time).toLocaleDateString()} 
                      </span>
                      <span className="text-xs">
                        {new Date(event.start_time).toLocaleTimeString()} - {new Date(event.end_time).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  
                  {event.location && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 text-rose-500" />
                      <span>{event.location}</span>
                    </div>
                  )}
                  
                  {event.virtual_link && (
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Globe className="h-4 w-4 text-blue-500" />
                      <a 
                        href={event.virtual_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Join Virtual Meeting
                      </a>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Users className="h-4 w-4 text-rose-500" />
                    <span>
                      {event.rsvp_count || 0} / {event.max_attendees} 
                      {event.requires_rsvp ? ' RSVP\'d' : ' attending'}
                    </span>
                  </div>
                </div>

                {event.requires_rsvp && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={event.user_rsvp_status === 'going' ? "default" : "outline"}
                      onClick={() => rsvpEvent(event.id, 'going')}
                      disabled={(event.rsvp_count || 0) >= event.max_attendees && event.user_rsvp_status !== 'going'}
                      className={`flex-1 ${
                        event.user_rsvp_status === 'going' 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300'
                      }`}
                    >
                      Going
                    </Button>
                    <Button
                      size="sm"
                      variant={event.user_rsvp_status === 'maybe' ? "default" : "outline"}
                      onClick={() => rsvpEvent(event.id, 'maybe')}
                      className={`flex-1 ${
                        event.user_rsvp_status === 'maybe' 
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                          : 'hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-300'
                      }`}
                    >
                      Maybe
                    </Button>
                    <Button
                      size="sm"
                      variant={event.user_rsvp_status === 'not_going' ? "default" : "outline"}
                      onClick={() => rsvpEvent(event.id, 'not_going')}
                      className={`flex-1 ${
                        event.user_rsvp_status === 'not_going' 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'hover:bg-red-50 hover:text-red-700 hover:border-red-300'
                      }`}
                    >
                      Can&apos;t Go
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Enhanced Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Club Resources</h3>
              <p className="text-sm text-gray-600">Share and discover helpful resources with your club</p>
            </div>
            <Dialog open={showCreateResource} onOpenChange={setShowCreateResource}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-600 hover:to-purple-600 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Resource
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Resource</DialogTitle>
                  <DialogDescription>
                    Share a helpful resource with your club
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="resource-title">Title</Label>
                    <Input
                      id="resource-title"
                      value={resourceForm.title}
                      onChange={(e) => setResourceForm({ ...resourceForm, title: e.target.value })}
                      placeholder="Resource title"
                      className="mt-1 border-gray-200 focus:border-rose-300 focus:ring-rose-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="resource-type">Type</Label>
                    <Select value={resourceForm.resource_type} onValueChange={(value) => setResourceForm({ ...resourceForm, resource_type: value as 'link' | 'file' | 'note' })}>
                      <SelectTrigger className="mt-1 border-gray-200 focus:border-rose-300 focus:ring-rose-200">
                        <SelectValue placeholder="Select resource type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="link">
                          <div className="flex items-center space-x-2">
                            <ExternalLink className="h-4 w-4 text-blue-500" />
                            <span>Link</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="file">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-green-500" />
                            <span>File</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="note">
                          <div className="flex items-center space-x-2">
                            <Hash className="h-4 w-4 text-purple-500" />
                            <span>Note</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {resourceForm.resource_type === 'link' && (
                    <div>
                      <Label htmlFor="resource-url">URL</Label>
                      <Input
                        id="resource-url"
                        type="url"
                        value={resourceForm.resource_url}
                        onChange={(e) => setResourceForm({ ...resourceForm, resource_url: e.target.value })}
                        placeholder="https://example.com"
                        className="mt-1 border-gray-200 focus:border-rose-300 focus:ring-rose-200"
                      />
                    </div>
                  )}
                  {resourceForm.resource_type === 'note' && (
                    <div>
                      <Label htmlFor="resource-content">Content</Label>
                      <Textarea
                        id="resource-content"
                        value={resourceForm.content}
                        onChange={(e) => setResourceForm({ ...resourceForm, content: e.target.value })}
                        placeholder="Note content"
                        rows={4}
                        className="mt-1 border-gray-200 focus:border-rose-300 focus:ring-rose-200"
                      />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="resource-description">Description</Label>
                    <Textarea
                      id="resource-description"
                      value={resourceForm.description}
                      onChange={(e) => setResourceForm({ ...resourceForm, description: e.target.value })}
                      placeholder="Describe this resource"
                      className="mt-1 border-gray-200 focus:border-rose-300 focus:ring-rose-200"
                    />
                  </div>
                  <div>
                    <Label htmlFor="resource-category">Category</Label>
                    <Select value={resourceForm.category} onValueChange={(value) => setResourceForm({ ...resourceForm, category: value })}>
                      <SelectTrigger className="mt-1 border-gray-200 focus:border-rose-300 focus:ring-rose-200">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="study-materials">
                          <div className="flex items-center space-x-2">
                            <BookOpen className="h-4 w-4 text-blue-500" />
                            <span>Study Materials</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="tools">
                          <div className="flex items-center space-x-2">
                            <Settings className="h-4 w-4 text-green-500" />
                            <span>Tools</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="references">
                          <div className="flex items-center space-x-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span>References</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="general">
                          <div className="flex items-center space-x-2">
                            <Hash className="h-4 w-4 text-gray-500" />
                            <span>General</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <Button variant="outline" onClick={() => setShowCreateResource(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={createResource}
                    className="bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-600 hover:to-purple-600 text-white"
                  >
                    Add Resource
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search resources..."
                className="pl-10 border-gray-200 focus:border-rose-300 focus:ring-rose-200"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-full sm:w-48 border-gray-200 focus:border-rose-300 focus:ring-rose-200">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="link">Links</SelectItem>
                <SelectItem value="file">Files</SelectItem>
                <SelectItem value="note">Notes</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-categories">
              <SelectTrigger className="w-full sm:w-48 border-gray-200 focus:border-rose-300 focus:ring-rose-200">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-categories">All Categories</SelectItem>
                <SelectItem value="study-materials">Study Materials</SelectItem>
                <SelectItem value="tools">Tools</SelectItem>
                <SelectItem value="references">References</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {resourcesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
              <span className="ml-2 text-gray-600">Loading resources...</span>
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No resources yet</h3>
              <p className="text-gray-500 mb-4">Be the first to share a helpful resource with your club!</p>
              {(userRole === 'admin' || userRole === 'moderator') && (
                <Button onClick={() => setShowCreateResource(true)} className="bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-600 hover:to-purple-600 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Resource
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((resource) => (
              <Card key={resource.id} className="group p-6 bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
                <div className="space-y-4">
                  {/* Header with type icon and category */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        resource.resource_type === 'link' ? 'bg-blue-100 text-blue-600' :
                        resource.resource_type === 'file' ? 'bg-green-100 text-green-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        {resource.resource_type === 'link' && <ExternalLink className="h-4 w-4" />}
                        {resource.resource_type === 'file' && <FileText className="h-4 w-4" />}
                        {resource.resource_type === 'note' && <Hash className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">
                          {resource.title}
                        </h4>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                      {resource.category || 'General'}
                    </Badge>
                  </div>
                  
                  {/* Description */}
                  <p className="text-sm text-gray-600 line-clamp-2">{resource.description}</p>
                  
                  {/* Note content preview */}
                  {resource.resource_type === 'note' && resource.content && (
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-rose-50 rounded-lg border border-purple-100">
                      <p className="text-sm text-gray-700 line-clamp-3">{resource.content}</p>
                    </div>
                  )}
                  
                  {/* Author and date */}
                  <div className="flex items-center space-x-2 pt-2 border-t border-gray-100">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={resource.user_profile.avatar_url} />
                      <AvatarFallback className="text-xs bg-gradient-to-r from-rose-400 to-purple-400 text-white">
                        {resource.user_profile.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-gray-500 font-medium">{resource.user_profile.full_name}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{new Date(resource.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex space-x-2 pt-2">
                    {resource.resource_type === 'link' && resource.resource_url && (
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                        onClick={() => window.open(resource.resource_url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Open Link
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className={`border-gray-200 hover:border-rose-300 hover:text-rose-600 ${
                        savedResources.has(resource.id) ? 'bg-rose-50 border-rose-300 text-rose-600' : ''
                      }`}
                      onClick={() => savedResources.has(resource.id) ? unsaveResource(resource.id) : saveResource(resource.id)}
                    >
                      <Bookmark className={`h-3 w-3 mr-2 ${savedResources.has(resource.id) ? 'fill-current' : ''}`} />
                      {savedResources.has(resource.id) ? 'Saved' : 'Save'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-gray-200 hover:border-purple-300 hover:text-purple-600"
                      onClick={() => shareResource(resource)}
                    >
                      <Share2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            </div>
          )}
        </TabsContent>

        {/* Enhanced Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Club Leaderboard</h3>
            <Badge variant="outline" className="border-purple-200 text-purple-700">
              <Trophy className="h-3 w-3 mr-1" />
              Based on XP
            </Badge>
          </div>

          <div className="space-y-4">
            {members
              .filter(member => member.user_reputation)
              .sort((a, b) => (b.user_reputation?.total_xp || 0) - (a.user_reputation?.total_xp || 0))
              .map((member, index) => (
                <Card key={member.id} className="p-6 bg-white/80 backdrop-blur-sm border-white/20 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-center space-x-6">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-white ${
                       index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 shadow-lg' :
                       index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600 shadow-lg' :
                       index === 2 ? 'bg-gradient-to-r from-amber-600 to-amber-800 shadow-lg' :
                       'bg-gradient-to-r from-rose-500 to-purple-500'
                     }`}>
                      {index < 3 ? (
                        <Trophy className="h-6 w-6" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.user_profile.avatar_url} />
                      <AvatarFallback>
                        {member.user_profile.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-800">{member.user_profile.full_name}</h4>
                      <p className="text-sm text-gray-500">@{member.user_profile.username}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge 
                          variant={member.role === 'admin' ? 'default' : 'secondary'}
                          className={`text-xs ${
                            member.role === 'admin' 
                              ? 'bg-gradient-to-r from-rose-500 to-purple-500 text-white' 
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {member.role === 'admin' && <Crown className="h-3 w-3 mr-1" />}
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="outline" className="border-purple-200 text-purple-700">
                          Level {member.user_reputation?.level}
                        </Badge>
                      </div>
                      <p className="text-lg font-bold text-gray-800">
                        {member.user_reputation?.total_xp?.toLocaleString()} XP
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            
            {members.filter(member => member.user_reputation).length === 0 && (
              <Card className="p-12 text-center bg-white/80 backdrop-blur-sm border-white/20">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-800 mb-2">No rankings yet</h3>
                <p className="text-gray-600">Member rankings will appear as they earn XP!</p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Member Profile Dialog */}
      {showMemberProfile && (
        <Dialog open={!!showMemberProfile} onOpenChange={() => setShowMemberProfile(null)}>
          <DialogContent className="bg-white/95 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">Manage Member</DialogTitle>
              <DialogDescription className="text-gray-600">
                Update {showMemberProfile.user_profile.full_name}&apos;s role or remove them from the club
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <Avatar className="h-16 w-16 ring-2 ring-rose-100">
                  <AvatarImage src={showMemberProfile.user_profile.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-rose-400 to-purple-400 text-white font-bold text-lg">
                    {showMemberProfile.user_profile.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold text-gray-800">{showMemberProfile.user_profile.full_name}</h4>
                  <p className="text-gray-500">@{showMemberProfile.user_profile.username}</p>
                  <Badge variant="secondary" className="mt-1 bg-gray-100 text-gray-700">
                    {showMemberProfile.role}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700">Update Role</Label>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant={showMemberProfile.role === 'member' ? 'default' : 'outline'}
                    onClick={() => updateMemberRole(showMemberProfile.user_id, 'member')}
                    className={showMemberProfile.role === 'member' ? 'bg-gradient-to-r from-rose-500 to-purple-500 text-white' : ''}
                  >
                    Member
                  </Button>
                  <Button
                    size="sm"
                    variant={showMemberProfile.role === 'moderator' ? 'default' : 'outline'}
                    onClick={() => updateMemberRole(showMemberProfile.user_id, 'moderator')}
                    className={showMemberProfile.role === 'moderator' ? 'bg-gradient-to-r from-rose-500 to-purple-500 text-white' : ''}
                  >
                    Moderator
                  </Button>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-200">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removeMember(showMemberProfile.user_id)}
                  className="w-full"
                >
                  <UserX className="h-4 w-4 mr-2" />
                  Remove from Club
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Banner Upload Dialog */}
      <Dialog open={showBannerUpload} onOpenChange={setShowBannerUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Club Banner</DialogTitle>
            <DialogDescription>
              Upload a new banner image for your club. Recommended size: 1200x300px
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="banner-file">Banner Image</Label>
              <Input
                id="banner-file"
                type="file"
                accept="image/*"
                onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                className="mt-1"
              />
            </div>
            {bannerFile && (
              <div className="text-sm text-gray-600">
                Selected: {bannerFile.name}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBannerUpload(false);
                setBannerFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={uploadBanner}
              disabled={!bannerFile}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Banner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

