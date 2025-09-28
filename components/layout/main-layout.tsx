'use client';

import { useState } from 'react';
import { MobileNavigation } from './mobile-navigation';
import { DesktopNavigation } from './desktop-navigation';
import { Footer } from './footer';
import { LearningHub } from '@/components/features/learning-hub';
import { FinanceHub } from '@/components/features/finance-hub';
import CampusHub from '@/components/features/campus-hub';
import { ProfilePage } from '@/components/features/profile-page';
import { WalletConnect } from '@/components/wallet/wallet-connect';
import { WalletBalance } from '@/components/wallet/wallet-balance';
import { ErrorBoundary } from '@/components/error-boundary';

export type TabType = 'learning' | 'finance' | 'campus-hub' | 'profile' | 'wallet';

export function MainLayout() {
  const [activeTab, setActiveTab] = useState<TabType>('campus-hub');

  const renderContent = () => {
    switch (activeTab) {
      case 'learning':
        return (
          <ErrorBoundary context="Learning Hub">
            <LearningHub />
          </ErrorBoundary>
        );
      case 'finance':
        return (
          <ErrorBoundary context="Finance Hub">
            <FinanceHub />
          </ErrorBoundary>
        );
      case 'campus-hub':
        return (
          <ErrorBoundary context="Campus Hub">
            <CampusHub />
          </ErrorBoundary>
        );
      case 'profile':
        return (
          <ErrorBoundary context="Profile Page">
            <ProfilePage />
          </ErrorBoundary>
        );
      case 'wallet':
        return (
          <ErrorBoundary context="Wallet">
            <div className="container mx-auto px-4 py-8">
              <h2 className="text-2xl font-bold mb-6">Wallet</h2>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex flex-col space-y-4">
                  <WalletConnect />
                  <WalletBalance />
                </div>
              </div>
            </div>
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary context="Learning Hub">
            <LearningHub />
          </ErrorBoundary>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorBoundary context="Main Layout">
        {/* Desktop Navigation */}
        <div className="hidden md:block">
          <DesktopNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Main Content */}
        <div className="pt-14 pb-20 md:pb-0 md:pt-16">
          {renderContent()}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <MobileNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Footer */}
        
      </ErrorBoundary>
    </div>
  );
}