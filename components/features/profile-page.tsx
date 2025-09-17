'use client';

import { useEffect, useMemo, useRef, useState, ChangeEvent } from 'react';
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
  DollarSign,
  Upload,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletBalance } from '@/components/wallet/wallet-balance';

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
  const { user, signOut, getAccessToken } = useAuth();
  const { toast } = useToast();
const wallet = useWallet();
const pubkey = wallet.publicKey ? wallet.publicKey.toBase58() : '';

  // Realtime profile state
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [editing, setEditing] = useState(false);

  // Local form fields
  const displayName = useMemo(() => profile?.preferences?.display_name || '', [profile]);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [usernameError, setUsernameError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
  const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB
  const ALLOWED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

  // Avatar input change handler with validation
  const onAvatarInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast({
        title: 'Unsupported file type',
        description: 'Please select a PNG, JPG, or WEBP image.',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      toast({
        title: 'Image too large',
        description: 'Max size is 2MB. Please choose a smaller image.',
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }

    await handleAvatarChange(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  // Load profile
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const token = await getAccessToken();
        const res = await fetch('/api/profile', {
          headers: {
            'content-type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          cache: 'no-store'
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Failed to load profile');
        const json = await res.json();
        if (mounted) setProfile(json.profile || null);
      } catch (e: any) {
        console.error(e);
        toast({ title: 'Error', description: e?.message || 'Unable to load profile', variant: 'destructive' });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [getAccessToken, toast]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSave = async () => {
    try {
      // Pre-validate username
      if (username && !USERNAME_REGEX.test(username)) {
        setUsernameError('Use 3-20 letters, numbers, or underscores');
        toast({ title: 'Invalid username', description: 'Use 3-20 letters, numbers, or underscores', variant: 'destructive' });
        return;
      }

      setSaving(true);
      const token = await getAccessToken();
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ username, bio, preferences: { display_name: displayName } })
      });

      // Handle duplicate username explicitly
      if (res.status === 409) {
        setUsernameError('Username not available');
        toast({ title: 'Username not available', description: 'Please choose a different username.', variant: 'destructive' });
        return;
      }

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to save');
      setProfile(json.profile);
      setEditing(false);
      setUsernameError('');
      toast({ title: 'Profile updated' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'Save failed', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (file: File) => {
    try {
      setAvatarUploading(true);
      const token = await getAccessToken();
      const form = new FormData();
      form.append('file', file);
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: form
      });
      const uploadJson = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) throw new Error(uploadJson?.error || 'Upload failed');
      const avatar_url = uploadJson.url as string;

      const patchRes = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ avatar_url })
      });
      const patchJson = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok) throw new Error(patchJson?.error || 'Failed to update avatar');
      setProfile(patchJson.profile);
      toast({ title: 'Avatar updated' });
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Error', description: e?.message || 'Upload failed', variant: 'destructive' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const renderProfileSection = () => (
    <div className="space-y-6">
      {/* Loading state */}
      {loading ? (
        <Card className="p-6 animate-pulse">
          <div className="flex items-start space-x-6 mb-6">
            <div className="w-20 h-20 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-3">
              <div className="h-6 w-40 bg-gray-200 rounded" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-4 w-64 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <div className="h-6 w-12 bg-gray-200 rounded mx-auto mb-1" />
                <div className="h-4 w-20 bg-gray-200 rounded mx-auto" />
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="flex items-start space-x-6 mb-6">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback>{(profile?.username || user?.email || 'U').slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              {/* Hidden file input for avatar selection */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={onAvatarInputChange}
                disabled={avatarUploading}
              />
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-2 -right-2 rounded-full"
                disabled={avatarUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold">{displayName || profile?.username || user?.email || 'Your Name'}</h1>
                  <p className="text-gray-600">@{profile?.username || 'username'}</p>
                  <p className="text-sm text-gray-500">{profile?.bio || 'Add a short bio to your profile'}</p>
                </div>
                {!editing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditing(true)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={saving}>
                      <Save className="w-4 h-4 mr-2" />
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>

              {!editing ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{5}</p>
                    <p className="text-sm text-gray-600">Courses</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{127}</p>
                    <p className="text-sm text-gray-600">Study Hours</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{3}</p>
                    <p className="text-sm text-gray-600">NFT Badges</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{28}</p>
                    <p className="text-sm text-gray-600">Transactions</p>
                  </div>
                </div>
              ) : (
                <div className="border-t pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input id="displayName" value={displayName} onChange={(e) => setProfile((p: any) => ({ ...(p || {}), preferences: { ...(p?.preferences || {}), display_name: e.target.value } }))} className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          setUsername(v);
                          // Live validation feedback
                          if (v && !USERNAME_REGEX.test(v)) {
                            setUsernameError('Use 3-20 letters, numbers, or underscores');
                          } else {
                            setUsernameError('');
                          }
                        }}
                        className={`mt-1 ${usernameError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                      />
                      {usernameError ? (
                        <p className="text-xs text-red-600 mt-1">{usernameError}</p>
                      ) : null}
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="bio">Bio</Label>
                      <Input id="bio" value={bio} onChange={(e) => setBio(e.target.value)} className="mt-1" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Wallet Information */}
          <div className="mt-6">
            <div className="flex items-center space-x-3 mb-4">
              <Wallet className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Wallet Information</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Solana Address</p>
                  <p className="text-sm text-gray-600 font-mono">
                    {pubkey ? `${pubkey.slice(0, 6)}...${pubkey.slice(-6)}` : 'Not connected'}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (pubkey) {
                        navigator.clipboard.writeText(pubkey);
                        toast({ title: 'Copied to clipboard' });
                      }
                    }}
                    disabled={!pubkey}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!pubkey) return;
                      const rpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || '';
                      const isDevnet = /devnet|testnet/i.test(rpc) || rpc.includes('devnet');
                      const url = `https://explorer.solana.com/address/${pubkey}${isDevnet ? '?cluster=devnet' : ''}`;
                      window.open(url, '_blank');
                    }}
                    disabled={!pubkey}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Live Balance */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <span className="text-sm text-gray-600">SOL Balance</span>
                <WalletBalance />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Achievements and other sections remain as before */}
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