'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/providers/providers';
import { 
  User,
  Settings,
  Wallet,
  Award,
  Shield,
  Bell,
  Moon,
  LogOut,
  Edit,
  Copy,
  ExternalLink,
  TrendingUp,
  Book,
  DollarSign
} from 'lucide-react';

const USER_STATS = {
  coursesCompleted: 5,
  totalStudyHours: 127,
  nftBadges: 3,
  walletTransactions: 28,
  savingsGoalProgress: 65
};

const NFT_BADGES = [
  { id: 1, name: 'Quiz Master', image: '🏆', rarity: 'Rare' },
  { id: 2, name: 'Study Streak', image: '🔥', rarity: 'Common' },
  { id: 3, name: 'DeFi Explorer', image: '💎', rarity: 'Epic' }
];

const ACHIEVEMENTS = [
  { id: 1, title: '7-Day Study Streak', description: 'Studied for 7 consecutive days', date: 'Dec 10, 2024' },
  { id: 2, title: 'First DeFi Transaction', description: 'Completed your first staking transaction', date: 'Dec 8, 2024' },
  { id: 3, title: 'Course Completion', description: 'Completed Calculus II with 95% score', date: 'Dec 5, 2024' }
];

export function ProfilePage() {
  const [activeSection, setActiveSection] = useState('profile');
  const { user, signOut } = useAuth();
  const [editing, setEditing] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const renderProfileSection = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-start space-x-6 mb-6">
          <Avatar className="w-20 h-20">
            <AvatarImage src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" />
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">John Doe</h1>
                <p className="text-gray-600">@johndoe</p>
                <p className="text-sm text-gray-500">Computer Science Student</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(!editing)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{USER_STATS.coursesCompleted}</p>
                <p className="text-sm text-gray-600">Courses</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{USER_STATS.totalStudyHours}</p>
                <p className="text-sm text-gray-600">Study Hours</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{USER_STATS.nftBadges}</p>
                <p className="text-sm text-gray-600">NFT Badges</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{USER_STATS.walletTransactions}</p>
                <p className="text-sm text-gray-600">Transactions</p>
              </div>
            </div>
          </div>
        </div>

        {editing && (
          <div className="border-t pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" defaultValue="John Doe" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input id="username" defaultValue="johndoe" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" defaultValue="john.doe@university.edu" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="major">Major</Label>
                <Input id="major" defaultValue="Computer Science" className="mt-1" />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-4">
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button onClick={() => setEditing(false)}>
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Wallet Information */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Wallet className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Wallet Information</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium">Solana Address</p>
              <p className="text-sm text-gray-600 font-mono">3k8J2mK9...Qr5tX8nL</p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Copy className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <p className="text-lg font-semibold text-blue-600">2.45</p>
              <p className="text-sm text-gray-600">SOL</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-lg font-semibold text-green-600">$123.05</p>
              <p className="text-sm text-gray-600">USDC</p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <p className="text-lg font-semibold text-orange-600">245</p>
              <p className="text-sm text-gray-600">Credits</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderAchievementsSection = () => (
    <div className="space-y-6">
      {/* NFT Badges */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Award className="w-5 h-5 text-yellow-600" />
          <h2 className="text-lg font-semibold">NFT Badges</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {NFT_BADGES.map((badge) => (
            <div key={badge.id} className="border rounded-lg p-4 text-center">
              <div className="text-4xl mb-2">{badge.image}</div>
              <h3 className="font-medium mb-1">{badge.name}</h3>
              <Badge variant={badge.rarity === 'Epic' ? 'default' : 'secondary'} className="text-xs">
                {badge.rarity}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Achievements */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Achievements</h2>
        <div className="space-y-3">
          {ACHIEVEMENTS.map((achievement) => (
            <div key={achievement.id} className="flex items-center space-x-4 p-3 border rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Award className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{achievement.title}</h3>
                <p className="text-sm text-gray-600">{achievement.description}</p>
              </div>
              <span className="text-sm text-gray-500">{achievement.date}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderSettingsSection = () => (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-6">Settings</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="font-medium mb-3">Notifications</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="w-4 h-4 text-gray-600" />
                <span>Learning reminders</span>
              </div>
              <Button variant="outline" size="sm">On</Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <DollarSign className="w-4 h-4 text-gray-600" />
                <span>Transaction alerts</span>
              </div>
              <Button variant="outline" size="sm">On</Button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-3">Privacy & Security</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-gray-600" />
                <span>Two-factor authentication</span>
              </div>
              <Button variant="outline" size="sm">Enable</Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <User className="w-4 h-4 text-gray-600" />
                <span>Profile visibility</span>
              </div>
              <Button variant="outline" size="sm">Public</Button>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-3">Appearance</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Moon className="w-4 h-4 text-gray-600" />
              <span>Dark mode</span>
            </div>
            <Button variant="outline" size="sm">Off</Button>
          </div>
        </div>

        <div className="pt-6 border-t">
          <Button
            variant="outline"
            className="w-full text-red-600 border-red-300 hover:bg-red-50"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Profile</h1>
        <p className="text-indigo-100">
          Manage your profile, achievements, and settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveSection('profile')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-3 transition-colors ${
                  activeSection === 'profile'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Profile</span>
              </button>
              <button
                onClick={() => setActiveSection('achievements')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-3 transition-colors ${
                  activeSection === 'achievements'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Achievements</span>
              </button>
              <button
                onClick={() => setActiveSection('settings')}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center space-x-3 transition-colors ${
                  activeSection === 'settings'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </nav>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {activeSection === 'profile' && renderProfileSection()}
          {activeSection === 'achievements' && renderAchievementsSection()}
          {activeSection === 'settings' && renderSettingsSection()}
        </div>
      </div>
    </div>
  );
}