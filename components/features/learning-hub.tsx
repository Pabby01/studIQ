'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  BookOpen, 
  Upload, 
  Brain, 
  Award, 
  FileText, 
  Play,
  TrendingUp,
  Clock,
  Star
} from 'lucide-react';

const RECENT_COURSES = [
  {
    id: 1,
    title: 'Calculus II',
    progress: 75,
    lastStudied: '2 hours ago',
    totalLessons: 24,
    completedLessons: 18
  },
  {
    id: 2,
    title: 'Computer Science Fundamentals',
    progress: 45,
    lastStudied: '1 day ago',
    totalLessons: 32,
    completedLessons: 14
  },
  {
    id: 3,
    title: 'Physics - Mechanics',
    progress: 88,
    lastStudied: '3 hours ago',
    totalLessons: 20,
    completedLessons: 17
  }
];

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
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">
                Drop your PDFs, notes, or slides here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supports PDF, DOCX, TXT files up to 10MB
              </p>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Choose Files
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
                  <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 ${feature.color} rounded-lg flex items-center justify-center mb-3`}>
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
            
            <div className="space-y-4">
              {RECENT_COURSES.map((course) => (
                <div key={course.id} className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{course.title}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {course.lastStudied}
                      </span>
                      <span>{course.completedLessons}/{course.totalLessons} lessons</span>
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
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Study Stats */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Study Statistics</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Study Streak</span>
                <div className="flex items-center">
                  <span className="text-lg font-semibold text-orange-600 mr-1">7</span>
                  <span className="text-sm text-gray-600">days</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Hours This Week</span>
                <span className="text-lg font-semibold text-blue-600">12.5</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Courses Completed</span>
                <span className="text-lg font-semibold text-green-600">3</span>
              </div>
            </div>
          </Card>

          {/* Achievements */}
          <Card className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Award className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold">Recent Achievements</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                <Star className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-sm">Quiz Master</p>
                  <p className="text-xs text-gray-600">Scored 90%+ on 5 quizzes</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <Brain className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">AI Explorer</p>
                  <p className="text-xs text-gray-600">Used AI features 20 times</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Brain className="w-4 h-4 mr-2" />
                Generate Quiz
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="w-4 h-4 mr-2" />
                Create Summary
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Award className="w-4 h-4 mr-2" />
                View NFT Badges
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}