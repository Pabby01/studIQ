'use client';

import { useEffect, useState } from 'react';
import { BookOpen, DollarSign, MapPin, User, Bell, Search, CheckCircle2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Logo } from '@/components/ui/logo';
import { TabType } from './main-layout';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useAuth } from '@/components/providers/providers';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface DesktopNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const NAV_ITEMS = [
  {
    id: 'learning' as TabType,
    label: 'Learning Hub',
    icon: BookOpen,
  },
  {
    id: 'finance' as TabType,
    label: 'Finance Hub',
    icon: DollarSign,
  },
  {
    id: 'campus-hub' as TabType,
    label: 'Campus Hub',
    icon: Users,
  },
];

export function DesktopNavigation({ activeTab, onTabChange }: DesktopNavigationProps) {
  // Profile avatar state + realtime
  const { getAccessToken } = useAuth();
  const supabase = createClientComponentClient();
  const [profile, setProfile] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const token = await getAccessToken();
        const res = await fetch('/api/profile', {
          headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setProfile(json.profile || null);
      } catch (e) {
        // swallow
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [getAccessToken]);

  useEffect(() => {
    if (!profile?.id) return;
    const channel = supabase
      .channel(`profile-header-${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${profile.id}` },
        (payload) => {
          setProfile((prev: any) => ({ ...(prev || {}), ...(payload.new as any) }));
        }
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [profile?.id, supabase]);

  // Wallet dropdown
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  const WalletMenu = () => (
    <>
      {connected ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 border border-green-200 hover:bg-green-200">
              Connected
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { const addr = publicKey?.toBase58() || ''; if (addr) navigator.clipboard.writeText(addr); }}>Copy address</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { const addr = publicKey?.toBase58(); if (addr) window.open(`https://solscan.io/account/${addr}`, '_blank'); }}>View on Explorer</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setVisible(true)}>Switch wallet</DropdownMenuItem>
            <DropdownMenuItem onClick={async () => { try { await disconnect(); } catch {} }}>Disconnect</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setVisible(true)}>Connect Wallet</Button>
      )}
    </>
  );

  return (
    <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-16 flex items-center justify-between">
          {/* Left: Brand & Tabs */}
          <div className="flex items-center space-x-6">
            <div onClick={() => onTabChange('learning')}>
              <Logo size="sm" className="cursor-pointer" />
            </div>
            <nav className="hidden md:flex items-center space-x-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Search, Wallet, and Profile */}
          <div className="flex items-center space-x-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input placeholder="Search..." className="pl-10 w-56" />
            </div>

            {/* Wallet dropdown */}
            <div className="flex items-center">
              <WalletMenu />
            </div>

            <Button variant="ghost" size="icon" className="hidden md:inline-flex">
              <Bell className="w-4 h-4" />
            </Button>

            <button
              onClick={() => onTabChange('profile')}
              className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}