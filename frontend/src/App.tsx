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
import { MyTripsView } from './components/MyTripsView';
import { WishlistView } from './components/WishlistView';
import { BookingPageView } from './components/BookingPageView';
import { PropertyDetailsModal } from './components/PropertyDetailsModal';
import { favoritesApi } from './services/favoritesApi';
import type { Property } from './types/property';
import './App.css';

interface BookingSession {
  property: Property;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  hasPet: boolean;
}

const MainContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [currentView, setCurrentView] = useState<string>('explore');

  // Booking session state
  const [bookingSession, setBookingSession] = useState<BookingSession | null>(null);

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

  /**
   * Called when user clicks "Reserve" on a PropertyCard (from landing / explore).
   * Adds the property to the wishlist and navigates to the wishlist view.
   * Never triggers payment automatically.
   */
  const handleAddToWishlist = async (property: Property) => {
    if (!isAuthenticated) {
      setIsLoginOpen(true);
      return;
    }
    try {
      await favoritesApi.toggleFavorite(property.id);
    } catch {
      // best-effort; wishlist view will reload regardless
    }
    setCurrentView('wishlist');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartBooking = (
    property: Property,
    checkInDate?: string,
    checkOutDate?: string,
    guestCount: number = 1,
    hasPet: boolean = false
  ) => {
    if (!isAuthenticated) {
      setIsLoginOpen(true);
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkout = new Date(tomorrow);
    checkout.setDate(tomorrow.getDate() + 3);

    const inDate = checkInDate || tomorrow.toISOString().split('T')[0];
    const outDate = checkOutDate || checkout.toISOString().split('T')[0];

    setBookingSession({
      property,
      checkInDate: inDate,
      checkOutDate: outDate,
      guestCount,
      hasPet,
    });
    setIsPropertyDetailsOpen(false);
    setCurrentView('booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync URL hash with currentView (e.g. #admin, #trips, #profile, #wishlist, #host)
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (hash === 'admin' || hash === 'admin-portal') {
        setCurrentView('admin-portal');
      } else if (hash === 'trips') {
        setCurrentView('trips');
      } else if (hash === 'wishlist' || hash === 'saved') {
        setCurrentView('wishlist');
      } else if (hash === 'profile') {
        setCurrentView('profile');
      } else if (hash === 'host' || hash === 'host-portal') {
        setCurrentView('host-portal');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
            onBookNow={handleAddToWishlist}
          />
        )}

        {currentView === 'booking' && bookingSession && (
          <BookingPageView
            property={bookingSession.property}
            initialCheckIn={bookingSession.checkInDate}
            initialCheckOut={bookingSession.checkOutDate}
            initialGuests={bookingSession.guestCount}
            initialHasPet={bookingSession.hasPet}
            onBack={() => setCurrentView('explore')}
            onSuccess={(_booking) => {
              setBookingSession(null);
              setCurrentView('trips');
            }}
          />
        )}

        {currentView === 'profile' && isAuthenticated && <ProfileView />}

        {currentView === 'trips' && isAuthenticated && (
          <MyTripsView onExploreStays={() => setCurrentView('explore')} />
        )}

        {currentView === 'wishlist' && isAuthenticated && (
          <WishlistView
            onSelectProperty={handleSelectProperty}
            onExploreStays={() => setCurrentView('explore')}
            onBookNow={handleStartBooking}
          />
        )}

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
        onRequireLogin={() => setIsLoginOpen(true)}
        onStartBooking={(prop) => {
          setIsPropertyDetailsOpen(false);
          handleAddToWishlist(prop);
        }}
        onReserveSuccess={() => {
          setIsPropertyDetailsOpen(false);
          setCurrentView('wishlist');
        }}
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
