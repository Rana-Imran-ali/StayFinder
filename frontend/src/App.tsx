import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { RegisterModal } from './components/RegisterModal';
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { IdentityVerificationModal } from './components/IdentityVerificationModal';
import { HostOnboardingModal } from './components/HostOnboardingModal';
import { StayFinderLanding } from './components/StayFinderLanding';
import { ProfileView } from './components/ProfileView';
import { HostDashboardView } from './components/HostDashboardView';
import { AdminManagementView } from './components/AdminManagementView';
import { PropertyDetailsModal } from './components/PropertyDetailsModal';
import type { Property } from './types/property';
import './App.css';

const MainContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState<string>('explore');

  // Modals state
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false);
  const [isHostOnboardingOpen, setIsHostOnboardingOpen] = useState(false);

  // Property details modal state
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isPropertyDetailsOpen, setIsPropertyDetailsOpen] = useState(false);

  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property);
    setIsPropertyDetailsOpen(true);
  };

  // If unauthenticated and on protected view, fall back to explore
  React.useEffect(() => {
    if (!isAuthenticated && currentView !== 'explore') {
      setCurrentView('explore');
    }
  }, [isAuthenticated, currentView]);

  return (
    <div className="app-shell">
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenRegister={() => setIsRegisterOpen(true)}
        onOpenIdentityModal={() => setIsIdentityModalOpen(true)}
        onOpenHostOnboarding={() => setIsHostOnboardingOpen(true)}
      />

      <main className="main-content">
        {currentView === 'explore' && (
          <StayFinderLanding
            onOpenLogin={() => setIsLoginOpen(true)}
            onOpenRegister={() => setIsRegisterOpen(true)}
            onGoToProfile={() => setCurrentView('profile')}
            onSelectProperty={handleSelectProperty}
          />
        )}

        {currentView === 'profile' && isAuthenticated && <ProfileView />}

        {currentView === 'host-portal' && isAuthenticated && (
          <HostDashboardView
            onOpenIdentityModal={() => setIsIdentityModalOpen(true)}
            onSelectProperty={handleSelectProperty}
          />
        )}

        {currentView === 'admin-portal' && isAuthenticated && <AdminManagementView />}
      </main>

      <footer className="footer">
        <div className="footer-content">
          <p>© {new Date().getFullYear()} StayFinder, Inc. All rights reserved.</p>
          <div className="footer-links">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Sitemap</span>
            <span>Company details</span>
          </div>
        </div>
      </footer>

      {/* Auth & Feature Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={() => setIsRegisterOpen(true)}
        onSwitchToForgot={() => setIsForgotOpen(true)}
      />

      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={() => setIsLoginOpen(true)}
      />

      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        onSwitchToLogin={() => setIsLoginOpen(true)}
      />

      <IdentityVerificationModal
        isOpen={isIdentityModalOpen}
        onClose={() => setIsIdentityModalOpen(false)}
      />

      <HostOnboardingModal
        isOpen={isHostOnboardingOpen}
        onClose={() => setIsHostOnboardingOpen(false)}
        onSuccess={() => setCurrentView('host-portal')}
      />

      {/* Property Details Modal */}
      <PropertyDetailsModal
        property={selectedProperty}
        isOpen={isPropertyDetailsOpen}
        onClose={() => setIsPropertyDetailsOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
