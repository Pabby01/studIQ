'use client';

import { BookOpen, DollarSign, MapPin, User, Bell, Search } from 'lucide-react';
import { WalletConnect } from '@/components/wallet/wallet-connect';
import { WalletBalance } from '@/components/wallet/wallet-balance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TabType } from './main-layout';

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
    id: 'campus' as TabType,
    label: 'Campus Tools',
    icon: MapPin,
  },
];

export function DesktopNavigation({ activeTab, onTabChange }: DesktopNavigationProps) {
  return (
    <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-blue-600">StudIQ</h1>
            </div>
            
            <nav className="flex space-x-6">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search..."
                className="pl-10 w-64"
              />
            </div>

            <div className="flex items-center space-x-4">
              <WalletBalance />
              <WalletConnect />
            </div>
            
            <Button variant="ghost" size="sm">
              <Bell className="w-4 h-4" />
            </Button>
            
            <button
              onClick={() => onTabChange('profile')}
              className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}