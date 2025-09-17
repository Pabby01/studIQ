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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface Material {
  id: string;
  title: string;
  summary: string | null;
  quiz: any | null;
  file_url: string | null;
  created_at: string;
  progress?: number | null;
}

interface Course {
  id: string;
  title: string;
  progress: number;
  last_studied: string;
  quiz_count: number;
  summary_excerpt?: string;
}

const AI_FEATURES = [
  {
    key: 'summary' as const,
    title: 'Smart Summaries',
    description: 'AI-generated summaries from your course materials',
    icon: Brain,
    color: 'bg-blue-500'
  },
  {
    key: 'quiz' as const,
    title: 'Quiz Generator',
    description: 'Personalized quizzes based on your content',
    icon: FileText,
    color: 'bg-purple-500'
  },
  {
    key: 'insights' as const,
    title: 'Study Insights',
    description: 'Track your learning patterns and progress',
    icon: TrendingUp,
    color: 'bg-green-500'
  }
];

type FeatureType = 'summary' | 'quiz' | 'insights';

export function LearningHub() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [featureOpen, setFeatureOpen] = useState(false);
  const [featureType, setFeatureType] = useState<FeatureType | null>(null);
  const [activeMaterialId, setActiveMaterialId] = useState<string>('');
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);
  // New state for generation actions and quiz settings
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizCount, setQuizCount] = useState<'10' | '20' | '50'>('10');
  const [quizAnswers, setQuizAnswers] = useState<string[]>([]);
  const [quizResult, setQuizResult] = useState<{ score: number; correct: boolean[] } | null>(null);

  // Helper to sanitize any accidental URLs or boilerplate from summaries/excerpts
  const sanitizeSummary = (s: string): string => {
    if (!s) return s;
    return s
      .replace(/https?:\/\/\S+/g, '')
      .replace(/Extracted\s+text\s+from\s+file:\s*/i, '')
      .trim();
  };
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { getAccessToken, user } = useAuth();
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  const realtimeChannel = useRef<RealtimeChannel | null>(null);
  const router = useRouter();

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
      console.debug('[LearningHub] Starting upload', {
        tokenPresent: !!token,
        titleLength: title?.length || 0,
        textLength: textContent?.length || 0,
        hasFile: !!selectedFile
      });

      let fileUrl = null as string | null;
      if (selectedFile) {
        console.debug('[LearningHub] Uploading file', {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size
        });
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });
        let uploadText = '';
        try {
          uploadText = await uploadRes.text();
        } catch (e) {
          console.warn('[LearningHub] Could not read upload response text', e);
        }
        console.debug('[LearningHub] /api/upload response', {
          status: uploadRes.status,
          ok: uploadRes.ok,
          body: uploadText
        });
        if (!uploadRes.ok) {
          try {
            const parsed = uploadText ? JSON.parse(uploadText) : null;
            throw new Error(parsed?.error ? `Upload failed: ${parsed.error}` : `Upload failed with status ${uploadRes.status}`);
          } catch (err) {
            if (err instanceof Error && !/Upload failed/.test(err.message)) {
              // JSON parse failed; throw generic with status and body snippet
              throw new Error(`Upload failed (${uploadRes.status}): ${uploadText?.slice(0, 300)}`);
            }
            throw err;
          }
        }
        let uploadJson: any = {};
        try {
          uploadJson = uploadText ? JSON.parse(uploadText) : {};
        } catch (e) {
          console.warn('[LearningHub] Upload response was not valid JSON');
        }
        const { url } = uploadJson || {};
        fileUrl = url;
        console.debug('[LearningHub] File uploaded, url:', fileUrl);
      }

      const payload = {
        title: title || undefined,
        textContent: textContent || undefined,
        fileUrl
      };
      console.debug('[LearningHub] Saving material via /api/materials', payload);

      const materialToken = await getAccessToken();
      const res = await fetch('/api/materials', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      let materialsText = '';
      try {
        materialsText = await res.text();
      } catch (e) {
        console.warn('[LearningHub] Could not read materials response text', e);
      }
      console.debug('[LearningHub] /api/materials response', {
        status: res.status,
        ok: res.ok,
        body: materialsText
      });

      if (!res.ok) {
        try {
          const err = materialsText ? JSON.parse(materialsText) : null;
          throw new Error(err?.error || 'Failed to save');
        } catch (err) {
          if (err instanceof Error && err.message === 'Failed to save') throw err;
          throw new Error(`Failed to save (${res.status}): ${materialsText?.slice(0, 300)}`);
        }
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
      console.error('[LearningHub] Upload flow error', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save material',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const openFeature = (type: FeatureType) => {
    setFeatureType(type);
    setActiveMaterialId('');
    setActiveMaterial(null);
    setQuizAnswers([]);
    setQuizResult(null);
    setFeatureOpen(true);
  };

  const loadMaterial = async (id: string) => {
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/materials/${id}`, {
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!res.ok) throw new Error('Failed to load material');
      const json = await res.json();
      const item = json.item as Material;
      setActiveMaterial(item);
      // initialize quiz answers length
      const q = Array.isArray((item as any)?.quiz) ? (item as any).quiz : [];
      setQuizAnswers(new Array(q.length).fill(''));
      setQuizResult(null);
    } catch (e) {
      toast({ title: 'Error', description: 'Could not load material', variant: 'destructive' });
    }
  };

  const gradeQuiz = async () => {
    if (!activeMaterial) return;
    const quiz: { q: string; a?: string }[] = Array.isArray((activeMaterial as any).quiz)
      ? (activeMaterial as any).quiz
      : [];
    const correct = quiz.map((q, idx) => {
      const userAns = (quizAnswers[idx] || '').trim().toLowerCase();
      const ground = (q.a || '').trim().toLowerCase();
      if (ground) return userAns === ground || (ground && userAns.includes(ground));
      // Fallback: treat non-empty answers as correct when no ground truth is provided
      return userAns.length > 0;
    });
    const score = Math.round((correct.filter(Boolean).length / (quiz.length || 1)) * 100);
    setQuizResult({ score, correct: correct as boolean[] });

    try {
      const token = await getAccessToken();
      // Update progress to reflect quiz completion/score
      await fetch(`/api/materials/${activeMaterial.id}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ progress: score })
      });
    } catch (e) {
      console.warn('Failed to update progress');
    }
  };

  const quizzesCompleted = materials.filter((m) => (m?.progress ?? 0) >= 60).length;

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
                    onClick={() => openFeature(feature.key)}
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
                    className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-blue-600" />
                    </div>

                    <div className="flex-1">
                      <h3 className="font-medium mb-1 cursor-pointer hover:underline" onClick={() => router.push(`/study/${course.id}`)}>{course.title}</h3>
                      <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          {course.last_studied}
                        </span>
                        <span className="flex items-center">
                          <FileText className="w-3 h-3 mr-1" />
                          {course.quiz_count} quizzes
                        </span>
                      </div>
                      {course.summary_excerpt ? (
                        <p
                          className="mt-2 text-sm text-gray-700 cursor-pointer hover:underline"
                          onClick={() => {
                            setFeatureType('summary');
                            setActiveMaterialId(course.id);
                            loadMaterial(course.id);
                            setFeatureOpen(true);
                          }}
                        >
                          {course.summary_excerpt}
                        </p>
                      ) : null}
                      <Progress value={course.progress} className="mt-2 h-2" />
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Button size="sm" onClick={() => router.push(`/study/${course.id}`)}>
                        <Play className="w-4 h-4 mr-1" />
                        Continue
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setFeatureType('summary');
                          setActiveMaterialId(course.id);
                          loadMaterial(course.id);
                          setFeatureOpen(true);
                        }}
                      >
                        Read Summary
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setFeatureType('quiz');
                          setActiveMaterialId(course.id);
                          loadMaterial(course.id);
                          setFeatureOpen(true);
                        }}
                      >
                        Take Quiz
                      </Button>
                    </div>
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
                  <span className="text-gray-600">Quizzes Completed</span>
                  <span className="font-medium">{quizzesCompleted}</span>
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

      {/* Feature Modal */}
      <Dialog open={featureOpen} onOpenChange={setFeatureOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {featureType === 'summary' && 'Generate Summary'}
              {featureType === 'quiz' && 'Generate & Take Quiz'}
              {featureType === 'insights' && 'Study Insights'}
            </DialogTitle>
            <DialogDescription>
              Select a material to proceed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="material-select" className="block text-sm text-gray-600 mb-1">Material</label>
              <select
                id="material-select"
                className="w-full border rounded-md p-2"
                value={activeMaterialId}
                onChange={(e) => {
                  const id = e.target.value;
                  setActiveMaterialId(id);
                  if (id) loadMaterial(id);
                }}
              >
                <option value="">Select material…</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>

            {featureType === 'summary' && (
              <div className="space-y-2">
                <h4 className="font-semibold">Summary</h4>
                {activeMaterial ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{sanitizeSummary(activeMaterial.summary || 'No summary available for this material.')}</p>
                ) : (
                  <p className="text-sm text-gray-500">Choose a material to view its AI-generated summary.</p>
                )}
                <div className="flex items-center gap-3 pt-1">
                  <Button
                    onClick={async () => {
                      if (!activeMaterial) return;
                      try {
                        setGeneratingSummary(true);
                        const token = await getAccessToken();
                        const res = await fetch(`/api/materials/${activeMaterial.id}`, {
                          method: 'POST',
                          headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                          body: JSON.stringify({ action: 'summary' })
                        });
                        if (!res.ok) throw new Error('Failed to generate summary');
                        const json = await res.json();
                        setActiveMaterial(json.item);
                        setMaterials((prev) => prev.map((m) => (m.id === json.item.id ? json.item : m)));
                        // Update Continue Learning summary excerpt immediately
                        setCourses((prev) => prev.map((c) => c.id === json.item.id ? {
                          ...c,
                          summary_excerpt: (() => {
                            const s = sanitizeSummary((json.item?.summary || '') as string);
                            return s ? s.slice(0, 160) + (s.length > 160 ? '…' : '') : '';
                          })()
                        } : c));
                        toast({ title: 'Summary generated', description: 'The summary has been updated.' });
                      } catch (e) {
                        toast({ title: 'Error', description: 'Could not generate summary', variant: 'destructive' });
                      } finally {
                        setGeneratingSummary(false);
                      }
                    }}
                    disabled={!activeMaterial || generatingSummary}
                  >
                    {generatingSummary ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>) : 'Generate Summary'}
                  </Button>
                  {activeMaterial && (
                    <Button variant="secondary" onClick={() => router.push(`/study/${activeMaterial.id}`)}>
                      Open Study Page
                    </Button>
                  )}
                </div>
              </div>
            )}

            {featureType === 'insights' && (
              <div className="space-y-3">
                {activeMaterial ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Progress</span>
                      <span className="font-medium">{Math.round(activeMaterial.progress ?? 0)}%</span>
                    </div>
                    <Progress value={activeMaterial.progress ?? 0} />
                    <div className="flex items-center justify-between">
                      <span>Questions available</span>
                      <span className="font-medium">{Array.isArray((activeMaterial as any).quiz) ? (activeMaterial as any).quiz.length : 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Estimated reading time</span>
                      <span className="font-medium">{Math.max(1, Math.ceil(((activeMaterial.summary || '').split(/\s+/).length || 120) / 200))} min</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Choose a material to view insights.</p>
                )}
                {activeMaterial && (
                  <Button variant="secondary" onClick={() => router.push(`/study/${activeMaterial.id}`)}>
                    Continue Learning
                  </Button>
                )}
              </div>
            )}

            {featureType === 'quiz' && (
              <div className="space-y-4">
                {!activeMaterial && (
                  <p className="text-sm text-gray-500">Choose a material to generate and take a quiz.</p>
                )}
                {activeMaterial && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                      <div className="sm:col-span-2">
                        <label className="block text-sm text-gray-600 mb-1">Number of questions</label>
                        <Select value={quizCount} onValueChange={(v) => setQuizCount(v as '10' | '20' | '50')}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select count" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Button
                          className="w-full"
                          onClick={async () => {
                            if (!activeMaterial) return;
                            try {
                              setGeneratingQuiz(true);
                              const token = await getAccessToken();
                              const res = await fetch(`/api/materials/${activeMaterial.id}`, {
                                method: 'POST',
                                headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                                body: JSON.stringify({ action: 'quiz', count: Number(quizCount), useWebSearch: true })
                              });
                              if (!res.ok) throw new Error('Failed to generate quiz');
                              const json = await res.json();
                              setActiveMaterial(json.item);
                              setMaterials((prev) => prev.map((m) => (m.id === json.item.id ? json.item : m)));
                              // Update Continue Learning quiz count immediately
                              setCourses((prev) => prev.map((c) => c.id === json.item.id ? {
                                ...c,
                                quiz_count: Array.isArray(json.item?.quiz) ? json.item.quiz.length : (c.quiz_count || 0)
                              } : c));
                              toast({ title: 'Success', description: `Quiz generated successfully. Created ${Array.isArray(json.item?.quiz) ? json.item.quiz.length : 0} questions.` });
                              // Auto-close the quiz modal/tab after success
                              setFeatureOpen(false);
                            } catch (e) {
                              toast({ title: 'Error', description: 'Could not generate quiz', variant: 'destructive' });
                            } finally {
                              setGeneratingQuiz(false);
                            }
                          }}
                          disabled={generatingQuiz}
                        >
                          {generatingQuiz ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>) : 'Generate Quiz'}
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Questions available</span>
                      <span className="font-medium">{Array.isArray((activeMaterial as any).quiz) ? (activeMaterial as any).quiz.length : 0}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button variant="secondary" onClick={() => router.push(`/study/${activeMaterial.id}`)}>
                        Open Study Page
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}