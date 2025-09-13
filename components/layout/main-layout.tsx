'use client';

import { useState } from 'react';
import { MobileNavigation } from './mobile-navigation';
import { DesktopNavigation } from './desktop-navigation';
import { LearningHub } from '@/components/features/learning-hub';
import { FinanceHub } from '@/components/features/finance-hub';
import { CampusTools } from '@/components/features/campus-tools';
import { ProfilePage } from '@/components/features/profile-page';

export type TabType = 'learning' | 'finance' | 'campus' | 'profile';

export function MainLayout() {
  const [activeTab, setActiveTab] = useState<TabType>('learning');

  const renderContent = () => {
    switch (activeTab) {
      case 'learning':
        return <LearningHub />;
      case 'finance':
        return <FinanceHub />;
      case 'campus':
        return <CampusTools />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <LearningHub />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Navigation */}
      <div className="hidden md:block">
        <DesktopNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Main Content */}
      <div className="pb-20 md:pb-0 md:pt-16">
        {renderContent()}
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        <MobileNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </div>
  );
}