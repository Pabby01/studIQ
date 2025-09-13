'use client';

import { BookOpen, DollarSign, MapPin, User } from 'lucide-react';
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
    id: 'campus' as TabType,
    label: 'Campus',
    icon: MapPin,
  },
  {
    id: 'profile' as TabType,
    label: 'Profile',
    icon: User,
  },
];

export function MobileNavigation({ activeTab, onTabChange }: MobileNavigationProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-4 h-16">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}