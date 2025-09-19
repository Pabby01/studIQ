'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/providers';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  CreditCard, 
  Users, 
  Share2, 
  Edit, 
  Save, 
  Plus,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

interface CollaborationTool {
  id: string;
  title: string;
  type: 'notes' | 'flashcards';
  content: any;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  creator_profile: {
    full_name: string;
    avatar_url?: string;
  };
}

interface SharedUser {
  user_id: string;
  permission: 'view' | 'edit';
  user_profile: {
    full_name: string;
    avatar_url?: string;
  };
}

interface Note {
  id: string;
  title: string;
  content: string;
}

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface CollaborationWorkspaceProps {
  toolId: string;
}

export function CollaborationWorkspace({ toolId }: CollaborationWorkspaceProps) {
  const { user } = useAuth();
  const supabase = createClientComponentClient();
  const [tool, setTool] = useState<CollaborationTool | null>(null);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharing, setSharing] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Flashcards state
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [studyMode, setStudyMode] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const fetchTool = async () => {
    try {
      const response = await fetch(`/api/collaboration-tools/${toolId}`);
      if (response.ok) {
        const data = await response.json();
        setTool(data.tool);
        
        if (data.tool.type === 'notes') {
          setNotes(data.tool.content?.notes || []);
        } else if (data.tool.type === 'flashcards') {
          setFlashcards(data.tool.content?.flashcards || []);
        }
      }
    } catch (error) {
      console.error('Error fetching tool:', error);
      toast.error('Failed to load collaboration tool');
    }
  };

  const fetchSharedUsers = async () => {
    try {
      const response = await fetch(`/api/collaboration-tools/${toolId}/share`);
      if (response.ok) {
        const data = await response.json();
        setSharedUsers(data.shares || []);
      }
    } catch (error) {
      console.error('Error fetching shared users:', error);
    }
  };

  const saveTool = useCallback(async () => {
    if (!tool || saving) return;

    setSaving(true);
    try {
      const content = tool.type === 'notes' ? { notes } : { flashcards };
      
      const response = await fetch(`/api/collaboration-tools/${toolId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: tool.title,
          content,
        }),
      });

      if (response.ok) {
        toast.success('Changes saved');
      } else {
        toast.error('Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving tool:', error);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [tool, toolId, notes, flashcards, saving]);

  const shareWithUser = async () => {
    if (!shareEmail.trim() || sharing) return;

    setSharing(true);
    try {
      const response = await fetch(`/api/collaboration-tools/${toolId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: shareEmail.trim(),
          permission: 'edit',
        }),
      });

      if (response.ok) {
        setShareEmail('');
        fetchSharedUsers();
        toast.success('Tool shared successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to share tool');
      }
    } catch (error) {
      console.error('Error sharing tool:', error);
      toast.error('Failed to share tool');
    } finally {
      setSharing(false);
    }
  };

  const removeShare = async (userId: string) => {
    try {
      const response = await fetch(`/api/collaboration-tools/${toolId}/share`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
        }),
      });

      if (response.ok) {
        fetchSharedUsers();
        toast.success('Access removed');
      } else {
        toast.error('Failed to remove access');
      }
    } catch (error) {
      console.error('Error removing share:', error);
      toast.error('Failed to remove access');
    }
  };

  // Notes functions
  const addNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'New Note',
      content: '',
    };
    setNotes([...notes, newNote]);
    setSelectedNote(newNote);
    setNoteTitle(newNote.title);
    setNoteContent(newNote.content);
    setIsEditing(true);
  };

  const selectNote = (note: Note) => {
    setSelectedNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setIsEditing(false);
  };

  const saveNote = () => {
    if (!selectedNote) return;
    
    const updatedNotes = notes.map(note =>
      note.id === selectedNote.id
        ? { ...note, title: noteTitle, content: noteContent }
        : note
    );
    setNotes(updatedNotes);
    setSelectedNote({ ...selectedNote, title: noteTitle, content: noteContent });
    setIsEditing(false);
    saveTool();
  };

  const deleteNote = (noteId: string) => {
    setNotes(notes.filter(note => note.id !== noteId));
    if (selectedNote?.id === noteId) {
      setSelectedNote(null);
      setNoteTitle('');
      setNoteContent('');
    }
    saveTool();
  };

  // Flashcards functions
  const addFlashcard = () => {
    if (!newCardFront.trim() || !newCardBack.trim()) return;

    const newCard: Flashcard = {
      id: Date.now().toString(),
      front: newCardFront.trim(),
      back: newCardBack.trim(),
    };
    setFlashcards([...flashcards, newCard]);
    setNewCardFront('');
    setNewCardBack('');
    saveTool();
  };

  const deleteFlashcard = (cardId: string) => {
    setFlashcards(flashcards.filter(card => card.id !== cardId));
    saveTool();
  };

  const nextCard = () => {
    setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
    setShowAnswer(false);
  };

  const prevCard = () => {
    setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
    setShowAnswer(false);
  };

  const canEdit = () => {
    if (!user || !tool) return false;
    if (tool.created_by === user.id) return true;
    const userShare = sharedUsers.find(share => share.user_id === user.id);
    return userShare?.permission === 'edit';
  };

  useEffect(() => {
    if (user && toolId) {
      setLoading(true);
      Promise.all([fetchTool(), fetchSharedUsers()]).finally(() => setLoading(false));
    }
  }, [user, toolId]);

  // Real-time updates
  useEffect(() => {
    if (user && toolId) {
      const channel = supabase
        .channel(`collaboration-tool-${toolId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'collaboration_tools',
          filter: `id=eq.${toolId}`
        }, () => {
          fetchTool();
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'collaboration_shares',
          filter: `tool_id=eq.${toolId}`
        }, () => {
          fetchSharedUsers();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, toolId]);

  // Auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tool && (notes.length > 0 || flashcards.length > 0)) {
        saveTool();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [notes, flashcards, saveTool]);

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please sign in to access collaboration tools</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loading collaboration workspace...</p>
        </CardContent>
      </Card>
    );
  }

  if (!tool) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Collaboration tool not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {tool.type === 'notes' ? (
                <FileText className="h-6 w-6" />
              ) : (
                <CreditCard className="h-6 w-6" />
              )}
              <div>
                <CardTitle>{tool.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Created by {tool.creator_profile.full_name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={tool.is_public ? 'default' : 'secondary'}>
                {tool.is_public ? 'Public' : 'Private'}
              </Badge>
              {saving && <Badge variant="outline">Saving...</Badge>}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {tool.type === 'notes' ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Shared Notes</CardTitle>
                  {canEdit() && (
                    <Button onClick={addNote} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Note
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Notes List */}
                  <div className="space-y-2">
                    <h3 className="font-medium">Notes</h3>
                    <ScrollArea className="h-64">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className={`p-2 rounded cursor-pointer hover:bg-gray-50 ${
                            selectedNote?.id === note.id ? 'bg-blue-50 border border-blue-200' : ''
                          }`}
                          onClick={() => selectNote(note)}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium truncate">{note.title}</p>
                            {canEdit() && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNote(note.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>

                  {/* Note Editor */}
                  <div className="md:col-span-2">
                    {selectedNote ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">Note Editor</h3>
                          {canEdit() && (
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditing(!isEditing)}
                              >
                                {isEditing ? <Eye className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                              </Button>
                              {isEditing && (
                                <Button onClick={saveNote} size="sm">
                                  <Save className="h-4 w-4 mr-2" />
                                  Save
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {isEditing && canEdit() ? (
                          <div className="space-y-3">
                            <Input
                              placeholder="Note title"
                              value={noteTitle}
                              onChange={(e) => setNoteTitle(e.target.value)}
                            />
                            <Textarea
                              placeholder="Write your note here..."
                              value={noteContent}
                              onChange={(e) => setNoteContent(e.target.value)}
                              rows={10}
                            />
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <h4 className="text-lg font-semibold">{selectedNote.title}</h4>
                            <div className="prose prose-sm max-w-none">
                              <pre className="whitespace-pre-wrap">{selectedNote.content}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-64 text-muted-foreground">
                        Select a note to view or edit
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Flashcards</CardTitle>
                  <div className="flex space-x-2">
                    {flashcards.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={() => setStudyMode(!studyMode)}
                        size="sm"
                      >
                        {studyMode ? 'Edit Mode' : 'Study Mode'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {studyMode && flashcards.length > 0 ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <Badge variant="outline">
                        {currentCardIndex + 1} of {flashcards.length}
                      </Badge>
                    </div>
                    
                    <Card className="min-h-[200px] flex items-center justify-center">
                      <CardContent className="text-center p-6">
                        <p className="text-lg mb-4">
                          {showAnswer ? flashcards[currentCardIndex]?.back : flashcards[currentCardIndex]?.front}
                        </p>
                        <Button
                          onClick={() => setShowAnswer(!showAnswer)}
                          variant="outline"
                        >
                          {showAnswer ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                          {showAnswer ? 'Hide Answer' : 'Show Answer'}
                        </Button>
                      </CardContent>
                    </Card>
                    
                    <div className="flex justify-center space-x-2">
                      <Button onClick={prevCard} variant="outline" disabled={flashcards.length <= 1}>
                        Previous
                      </Button>
                      <Button onClick={nextCard} variant="outline" disabled={flashcards.length <= 1}>
                        Next
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {canEdit() && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
                        <div>
                          <label className="text-sm font-medium">Front</label>
                          <Textarea
                            placeholder="Question or term"
                            value={newCardFront}
                            onChange={(e) => setNewCardFront(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Back</label>
                          <Textarea
                            placeholder="Answer or definition"
                            value={newCardBack}
                            onChange={(e) => setNewCardBack(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Button
                            onClick={addFlashcard}
                            disabled={!newCardFront.trim() || !newCardBack.trim()}
                            className="w-full"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Flashcard
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {flashcards.map((card) => (
                        <Card key={card.id}>
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Front</p>
                                <p className="text-sm">{card.front}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Back</p>
                                <p className="text-sm">{card.back}</p>
                              </div>
                              {canEdit() && (
                                <div className="flex justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteFlashcard(card.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Collaborators */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Collaborators</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Owner */}
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={tool.creator_profile.avatar_url} />
                  <AvatarFallback>
                    {tool.creator_profile.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{tool.creator_profile.full_name}</p>
                  <Badge variant="default" className="text-xs">Owner</Badge>
                </div>
              </div>

              {/* Shared Users */}
              {sharedUsers.map((share) => (
                <div key={share.user_id} className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={share.user_profile.avatar_url} />
                    <AvatarFallback>
                      {share.user_profile.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{share.user_profile.full_name}</p>
                    <Badge variant="outline" className="text-xs">{share.permission}</Badge>
                  </div>
                  {tool.created_by === user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeShare(share.user_id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}

              {/* Share Tool */}
              {tool.created_by === user?.id && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Email to share with"
                      value={shareEmail}
                      onChange={(e) => setShareEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={shareWithUser}
                      disabled={!shareEmail.trim() || sharing}
                      size="sm"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}