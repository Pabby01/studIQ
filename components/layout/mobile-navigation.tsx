'use client';

import { BookOpen, DollarSign, MapPin, User, Wallet } from 'lucide-react';
import { WalletConnect } from '@/components/wallet/wallet-connect';
import { Logo } from '@/components/ui/logo';
import { TabType } from './main-layout';

interface MobileNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const NAV_ITEMS = [
  {
    id: 'learning' as TabType,
    label: 'Learning',
    icon: BookOpen,
  },
  {
    id: 'finance' as TabType,
    label: 'Finance',
    icon: DollarSign,
  },
  {
    id: 'campus-hub' as TabType,
    label: 'Campus',
    icon: User,
  },
  {
    id: 'wallet' as TabType,
    label: 'Wallet',
    icon: Wallet,
  },
  {
    id: 'profile' as TabType,
    label: 'Profile',
    icon: User,
  },
];

export function MobileNavigation({ activeTab, onTabChange }: MobileNavigationProps) {
  return (
    <div className="relative">
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 md:hidden">
        <div className="flex items-center justify-center h-14 px-4">
          <Logo size="sm" />
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="grid grid-cols-5 h-14">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 px-1 text-[11px] leading-none transition-colors whitespace-nowrap ${
                  isActive
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}