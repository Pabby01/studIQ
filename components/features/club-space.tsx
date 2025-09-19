/* eslint-disable @next/next/no-img-element */
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
  location: string;
  max_attendees: number;
  is_virtual: boolean;
  club_id: string;
  created_by: string;
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
  const [activeTab, setActiveTab] = useState('overview');
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [events, setEvents] = useState<ClubEvent[]>([]);
  const [resources, setResources] = useState<ClubResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'moderator' | 'member'>('member');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Dialog states
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateResource, setShowCreateResource] = useState(false);
  const [showMemberProfile, setShowMemberProfile] = useState<ClubMember | null>(null);
  
  // Form states
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    max_attendees: 100,
    is_virtual: false,
  });
  
  const [resourceForm, setResourceForm] = useState({
    title: '',
    description: '',
    resource_type: 'link' as 'link' | 'file' | 'note',
    resource_url: '',
    content: '',
    category: 'general',
  });

  // Fetch club data
  const fetchClubData = useCallback(async () => {
    setLoading(true);
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

      // Fetch members
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
        // Find current user's role
        const currentUserMember = membersData.find(m => m.user_id === currentUserId);
        if (currentUserMember) {
          setUserRole(currentUserMember.role);
        }
      }

      // Fetch events
      const { data: eventsData } = await supabase
        .from('club_events')
        .select('*')
        .eq('club_id', club.id)
        .order('event_date', { ascending: true });

      if (eventsData) {
        setEvents(eventsData);
      }

      // Fetch resources
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
    } catch (error) {
      console.error('Error fetching club data:', error);
      toast.error('Failed to load club data');
    } finally {
      setLoading(false);
    }
  }, [club.id, user?.id, supabase]);

  useEffect(() => {
    fetchClubData();
  }, [fetchClubData]);

  // Real-time subscription for club member updates
  useEffect(() => {
    const channel = supabase
      .channel('club_members_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'club_members',
          filter: `club_id=eq.${club.id}`,
        },
        (payload) => {
          console.log('Club members change detected:', payload);
          // Refresh club data when members change
          fetchClubData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [club.id, supabase, fetchClubData]);

  // Real-time subscription for club events
  useEffect(() => {
    const channel = supabase
      .channel('club_events_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'club_events',
          filter: `club_id=eq.${club.id}`,
        },
        (payload) => {
          console.log('Club events change detected:', payload);
          fetchClubData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [club.id, supabase, fetchClubData]);

  // Real-time subscription for club resources
  useEffect(() => {
    const channel = supabase
      .channel('club_resources_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'club_resources',
          filter: `club_id=eq.${club.id}`,
        },
        (payload) => {
          console.log('Club resources change detected:', payload);
          fetchClubData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [club.id, supabase, fetchClubData]);

  // Create event
  const createEvent = async () => {
    try {
      const { data, error } = await supabase
        .from('club_events')
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
        event_date: '',
        location: '',
        max_attendees: 100,
        is_virtual: false,
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
        category: 'general',
      });
      fetchClubData();
    } catch (error) {
      console.error('Error creating resource:', error);
      toast.error('Failed to add resource');
    }
  };

  // RSVP to event
  const rsvpEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('club_event_members')
        .insert([{
          event_id: eventId,
          user_id: currentUserId,
        }]);

      if (error) throw error;

      toast.success('RSVP confirmed!');
      fetchClubData();
    } catch (error) {
      console.error('Error RSVPing to event:', error);
      toast.error('Failed to RSVP');
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
      {club.banner_url && (
        <div className="relative h-48 rounded-lg overflow-hidden">
          <img 
            src={club.banner_url} 
            alt={club.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
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
                    <span className="font-semibold">{members.length}</span>
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
                    <DialogTitle>Create New Event</DialogTitle>
                    <DialogDescription>
                      Organize an event for your club members
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="event-title">Event Title</Label>
                      <Input
                        id="event-title"
                        value={eventForm.title}
                        onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                        placeholder="Enter event title"
                      />
                    </div>
                    <div>
                      <Label htmlFor="event-description">Description</Label>
                      <Textarea
                        id="event-description"
                        value={eventForm.description}
                        onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                        placeholder="Describe your event"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="event-date">Date & Time</Label>
                        <Input
                          id="event-date"
                          type="datetime-local"
                          value={eventForm.event_date}
                          onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="max-attendees">Max Attendees</Label>
                        <Input
                          id="max-attendees"
                          type="number"
                          value={eventForm.max_attendees}
                          onChange={(e) => setEventForm({ ...eventForm, max_attendees: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="event-location">Location</Label>
                      <Input
                        id="event-location"
                        value={eventForm.location}
                        onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                        placeholder="Event location or virtual link"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowCreateEvent(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createEvent}>
                      Create Event
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {events.map((event) => (
              <Card key={event.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-lg">{event.title}</h4>
                    <p className="text-gray-600 text-sm mt-1">{event.description}</p>
                  </div>
                  {event.is_virtual && (
                    <Badge variant="outline" className="text-xs">
                      Virtual
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(event.event_date).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{event.attendee_count} / {event.max_attendees} attending</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant={event.is_attending ? "outline" : "default"}
                  onClick={() => rsvpEvent(event.id)}
                  disabled={event.attendee_count >= event.max_attendees && !event.is_attending}
                  className="w-full"
                >
                  {event.is_attending ? 'Attending' : 'RSVP'}
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Club Resources</h3>
            <Dialog open={showCreateResource} onOpenChange={setShowCreateResource}>
              <DialogTrigger asChild>
                <Button>
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
                    />
                  </div>
                  <div>
                    <Label htmlFor="resource-type">Type</Label>
                    <Select value={resourceForm.resource_type} onValueChange={(value: 'link' | 'file' | 'note') => setResourceForm({ ...resourceForm, resource_type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="link">Link</SelectItem>
                        <SelectItem value="file">File</SelectItem>
                        <SelectItem value="note">Note</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {resourceForm.resource_type === 'link' && (
                    <div>
                      <Label htmlFor="resource-url">URL</Label>
                      <Input
                        id="resource-url"
                        value={resourceForm.resource_url}
                        onChange={(e) => setResourceForm({ ...resourceForm, resource_url: e.target.value })}
                        placeholder="https://..."
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
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateResource(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createResource}>
                    Add Resource
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => (
              <Card key={resource.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {resource.resource_type === 'link' && <ExternalLink className="h-5 w-5 text-blue-500" />}
                    {resource.resource_type === 'file' && <FileText className="h-5 w-5 text-green-500" />}
                    {resource.resource_type === 'note' && <BookOpen className="h-5 w-5 text-purple-500" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{resource.title}</h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{resource.description}</p>
                    
                    <div className="flex items-center space-x-2 mt-3">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={resource.user_profile.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {resource.user_profile.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-gray-500">{resource.user_profile.full_name}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{new Date(resource.created_at).toLocaleDateString()}</span>
                    </div>
                    
                    {resource.resource_type === 'link' && resource.resource_url && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-3"
                        onClick={() => window.open(resource.resource_url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Open Link
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Club Leaderboard</h3>
            <Badge variant="outline">Based on XP</Badge>
          </div>

          <div className="space-y-4">
            {members
              .filter(member => member.user_reputation)
              .sort((a, b) => (b.user_reputation?.total_xp || 0) - (a.user_reputation?.total_xp || 0))
              .map((member, index) => (
                <Card key={member.id} className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold">
                      {index + 1}
                    </div>
                    
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={member.user_profile.avatar_url} />
                      <AvatarFallback>
                        {member.user_profile.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <h4 className="font-medium">{member.user_profile.full_name}</h4>
                      <p className="text-sm text-gray-500">@{member.user_profile.username}</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-semibold">{member.user_reputation?.total_xp || 0} XP</p>
                      <p className="text-sm text-gray-500">Level {member.user_reputation?.level || 1}</p>
                    </div>
                    
                    {index < 3 && (
                      <div className="flex-shrink-0">
                        {index === 0 && <Trophy className="h-6 w-6 text-yellow-500" />}
                        {index === 1 && <Award className="h-6 w-6 text-gray-400" />}
                        {index === 2 && <Award className="h-6 w-6 text-amber-600" />}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Member Profile Dialog */}
      {showMemberProfile && (
        <Dialog open={!!showMemberProfile} onOpenChange={() => setShowMemberProfile(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Member</DialogTitle>
              <DialogDescription>
                Update {showMemberProfile.user_profile.full_name}&apos;s role or remove them from the club
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={showMemberProfile.user_profile.avatar_url} />
                  <AvatarFallback>
                    {showMemberProfile.user_profile.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold">{showMemberProfile.user_profile.full_name}</h4>
                  <p className="text-gray-500">@{showMemberProfile.user_profile.username}</p>
                  <Badge variant="secondary" className="mt-1">
                    {showMemberProfile.role}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Update Role</Label>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant={showMemberProfile.role === 'member' ? 'default' : 'outline'}
                    onClick={() => updateMemberRole(showMemberProfile.id, 'member')}
                  >
                    Member
                  </Button>
                  <Button
                    size="sm"
                    variant={showMemberProfile.role === 'moderator' ? 'default' : 'outline'}
                    onClick={() => updateMemberRole(showMemberProfile.id, 'moderator')}
                  >
                    Moderator
                  </Button>
                  <Button
                    size="sm"
                    variant={showMemberProfile.role === 'admin' ? 'default' : 'outline'}
                    onClick={() => updateMemberRole(showMemberProfile.id, 'admin')}
                  >
                    Admin
                  </Button>
                </div>
              </div>
              
              <Separator />
              
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  removeMember(showMemberProfile.id);
                  setShowMemberProfile(null);
                }}
                className="w-full"
              >
                <UserX className="h-4 w-4 mr-2" />
                Remove from Club
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}