'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/providers/providers';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, MoreHorizontal, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Message {
  id: string;
  content: string;
  user_id: string;
  club_id: string;
  created_at: string;
  user_profile: {
    full_name: string;
    avatar_url?: string;
  };
}

interface ClubMember {
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  user_profile: {
    full_name: string;
    avatar_url?: string;
  };
}

interface ClubChatProps {
  clubId: string;
  clubName: string;
}

export function ClubChat({ clubId, clubName }: ClubChatProps) {
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/clubs/${clubId}/chat`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/clubs/${clubId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch(`/api/clubs/${clubId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage.trim(),
        }),
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages(); // Refresh messages
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/clubs/${clubId}/chat`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_id: messageId,
        }),
      });

      if (response.ok) {
        fetchMessages(); // Refresh messages
        toast.success('Message deleted');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getUserRole = (userId: string): string => {
    const member = members.find(m => m.user_id === userId);
    return member?.role || 'member';
  };

  const canDeleteMessage = (message: Message): boolean => {
    if (!user) return false;
    const userRole = getUserRole(user.id);
    return message.user_id === user.id || userRole === 'admin' || userRole === 'moderator';
  };

  useEffect(() => {
    if (user && clubId) {
      setLoading(true);
      Promise.all([fetchMessages(), fetchMembers()]).finally(() => setLoading(false));
    }
  }, [user, clubId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time message updates
  useEffect(() => {
    if (user && clubId) {
      const channel = supabase
        .channel(`club-chat-${clubId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'club_messages',
          filter: `club_id=eq.${clubId}`
        }, () => {
          fetchMessages();
        })
        .on('postgres_changes', {
          event: 'DELETE',
          schema: 'public',
          table: 'club_messages',
          filter: `club_id=eq.${clubId}`
        }, () => {
          fetchMessages();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, clubId]);

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please sign in to access club chat</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>{clubName} Chat</span>
          </CardTitle>
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Users className="h-3 w-3" />
            <span>{members.length} members</span>
          </Badge>
        </div>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="flex items-start space-x-3 group">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.user_profile.avatar_url} />
                    <AvatarFallback>
                      {message.user_profile.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium">{message.user_profile.full_name}</p>
                      <Badge variant="outline" className="text-xs">
                        {getUserRole(message.user_id)}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <p className="text-sm mt-1 break-words">{message.content}</p>
                  </div>
                  
                  {canDeleteMessage(message) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => deleteMessage(message.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Message
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        
        <Separator />
        
        {/* Message Input */}
        <div className="p-4">
          <div className="flex space-x-2">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}