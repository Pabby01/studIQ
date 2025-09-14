'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { RealtimeChannel, type RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  BookOpen,
  Upload,
  Brain,
  Award,
  FileText,
  Play,
  TrendingUp,
  Clock,
  Star,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/components/providers/providers';

interface Material {
  id: string;
  title: string;
  summary: string | null;
  quiz: string | null;
  file_url: string | null;
  created_at: string;
}

interface Course {
  id: string;
  title: string;
  progress: number;
  last_studied: string;
  total_lessons: number;
  completed_lessons: number;
}

const AI_FEATURES = [
  {
    title: 'Smart Summaries',
    description: 'AI-generated summaries from your course materials',
    icon: Brain,
    color: 'bg-blue-500'
  },
  {
    title: 'Quiz Generator',
    description: 'Personalized quizzes based on your content',
    icon: FileText,
    color: 'bg-purple-500'
  },
  {
    title: 'Study Insights',
    description: 'Track your learning patterns and progress',
    icon: TrendingUp,
    color: 'bg-green-500'
  }
];

export function LearningHub() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { getAccessToken, user } = useAuth();
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const realtimeChannel = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const loadMaterials = async () => {
      try {
        setLoading(true);
        const token = await getAccessToken();
        const res = await fetch('/api/materials', {
          headers: {
            'content-type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        if (!res.ok) {
          throw new Error('Failed to load materials');
        }
        const json = await res.json();
        setMaterials(json.items || []);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load materials. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    const loadCourses = async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/courses', {
          headers: {
            'content-type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        if (!res.ok) {
          throw new Error('Failed to load courses');
        }
        const json = await res.json();
        setCourses(json.items || []);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load courses. Please try again.',
          variant: 'destructive'
        });
      }
    };

    const setupRealtimeSubscription = () => {
      if (!user) return;

      realtimeChannel.current = supabase
        .channel(`materials_${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'course_materials',
          filter: `user_id=eq.${user.id}`
        }, (payload: RealtimePostgresChangesPayload<any>) => {
          if (payload.eventType === 'INSERT') {
            setMaterials((prev) => [payload.new as Material, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setMaterials((prev) => prev.filter((m) => m.id !== (payload as any).old.id));
          } else if (payload.eventType === 'UPDATE') {
            setMaterials((prev) =>
              prev.map((m) => (m.id === (payload as any).new.id ? (payload.new as Material) : m))
            );
          }
        })
        .subscribe();

      return () => {
        realtimeChannel.current?.unsubscribe();
      };
    };

    loadMaterials();
    loadCourses();
    const cleanup = setupRealtimeSubscription();

    return () => {
      cleanup?.();
    };
  }, [getAccessToken, user, toast, supabase]);

  const onChooseFile = () => fileInputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF, DOCX, or TXT file.',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 10MB.',
        variant: 'destructive'
      });
      return;
    }

    setSelectedFile(file);
    if (file.type === 'text/plain') {
      try {
        const text = await file.text();
        setTextContent(text);
        if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to read file content.',
          variant: 'destructive'
        });
      }
    }
  };

  const onSubmit = async () => {
    if (!title && !textContent && !selectedFile) {
      toast({
        title: 'Missing content',
        description: 'Please provide a title, text content, or upload a file.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsUploading(true);
      const token = await getAccessToken();

      let fileUrl = null;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });
        if (!uploadRes.ok) throw new Error('Failed to upload file');
        const { url } = await uploadRes.json();
        fileUrl = url;
      }

      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: title || undefined,
          textContent: textContent || undefined,
          fileUrl
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Failed to save');
      }

      toast({
        title: 'Success',
        description: 'Material uploaded successfully!'
      });

      setTitle('');
      setTextContent('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save material',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Learning Hub</h1>
        <p className="text-blue-100">
          Upload materials, get AI-powered insights, and track your progress
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Section */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Upload className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Upload Course Materials</h2>
            </div>

            <div className="grid gap-3 mb-4">
              <Input
                placeholder="Title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isUploading}
              />
              <div>
                <textarea
                  placeholder="Paste text content to summarize (optional)"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full min-h-[120px] p-3 border rounded-md text-sm"
                  disabled={isUploading}
                />
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Drop your PDFs, notes, or slides here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supports PDF, DOCX, TXT files up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={onFileChange}
                disabled={isUploading}
              />
              <Button onClick={onChooseFile} disabled={isUploading}>
                <Upload className="w-4 h-4 mr-2" />
                {selectedFile ? selectedFile.name : 'Choose Files'}
              </Button>
              <Button
                className="ml-3"
                onClick={onSubmit}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Upload'
                )}
              </Button>
            </div>
          </Card>

          {/* AI Features */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">AI-Powered Learning Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {AI_FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      toast({
                        title: 'Coming Soon',
                        description: `${feature.title} will be available soon!`
                      });
                    }}
                  >
                    <div
                      className={`w-10 h-10 ${feature.color} rounded-lg flex items-center justify-center mb-3`}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-medium mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recent Courses */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Continue Learning</h2>
              <Button variant="ghost" size="sm">View All</Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : courses.length > 0 ? (
              <div className="space-y-4">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>

                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{course.title}</h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {course.last_studied}
                        </span>
                        <span>
                          {course.completed_lessons}/{course.total_lessons} lessons
                        </span>
                      </div>
                      <Progress value={course.progress} className="mt-2 h-2" />
                    </div>

                    <Button size="sm">
                      <Play className="w-4 h-4 mr-1" />
                      Continue
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No courses available. Start by uploading some materials!
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Study Stats */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Study Statistics</h3>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Materials Uploaded</span>
                  <span className="font-medium">{materials.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Active Courses</span>
                  <span className="font-medium">{courses.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Study Streak</span>
                  <span className="font-medium flex items-center">
                    <Star className="w-4 h-4 text-yellow-500 mr-1" /> 5 days
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}