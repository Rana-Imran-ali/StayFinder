import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Compass, User as UserIcon, LogOut, ShieldCheck, Home, Key, Menu, X, Sparkles, FileCheck, Luggage, Heart } from 'lucide-react';

interface NavbarProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenIdentityModal: () => void;
  onOpenHostOnboarding: () => void;
  currentView: string;
  setCurrentView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenLogin,
  onOpenRegister,
  onOpenIdentityModal,
  onOpenHostOnboarding,
  currentView,
  setCurrentView,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isHost = user?.roles?.some((r) => r.slug === 'host');
  const isAdmin = user?.roles?.some((r) => r.slug === 'admin');

  const avatarUrl = user?.profile?.profile_photo
    ? (user.profile.profile_photo.startsWith('http')
      ? user.profile.profile_photo
      : `/storage/${user.profile.profile_photo}`)
    : null;

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Brand */}
        <div className="nav-brand" onClick={() => setCurrentView('explore')}>
          <div className="brand-icon">
            <Compass className="icon-main" />
          </div>
          <span className="brand-name">StayFinder</span>
        </div>

        {/* Center Navigation Links */}
        <div className="nav-links desktop-only">
          <button
            className={`nav-btn ${currentView === 'explore' ? 'active' : ''}`}
            onClick={() => setCurrentView('explore')}
          >
            <Home size={18} />
            <span>Explore Stays</span>
          </button>

          {isAuthenticated && (
            <>
              <button
                className={`nav-btn ${currentView === 'trips' ? 'active' : ''}`}
                onClick={() => setCurrentView('trips')}
              >
                <Luggage size={18} />
                <span>My Trips</span>
              </button>

              <button
                className={`nav-btn ${currentView === 'wishlist' ? 'active' : ''}`}
                onClick={() => setCurrentView('wishlist')}
              >
                <Heart size={18} />
                <span>Wishlists</span>
              </button>

              <button
                className={`nav-btn ${currentView === 'profile' ? 'active' : ''}`}
                onClick={() => setCurrentView('profile')}
              >
                <UserIcon size={18} />
                <span>My Profile</span>
              </button>

              {isHost ? (
                <button
                  className={`nav-btn host-badge ${currentView === 'host-portal' ? 'active' : ''}`}
                  onClick={() => setCurrentView('host-portal')}
                >
                  <Key size={18} />
                  <span>Host Portal</span>
                </button>
              ) : (
                <button
                  className="nav-btn become-host-btn"
                  onClick={onOpenHostOnboarding}
                >
                  <Sparkles size={16} />
                  <span>Become a Host</span>
                </button>
              )}

              {isAdmin && (
                <button
                  className={`nav-btn admin-badge ${currentView === 'admin-portal' ? 'active' : ''}`}
                  onClick={() => setCurrentView('admin-portal')}
                >
                  <ShieldCheck size={18} />
                  <span>Admin Panel</span>
                </button>
              )}
            </>
          )}
        </div>

        {/* Right Actions & Auth */}
        <div className="nav-actions">
          {isAuthenticated && user ? (
            <div className="user-profile-menu">
              <button
                className="profile-chip"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user.name} className="avatar-img" />
                ) : (
                  <div className="avatar-placeholder">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="profile-chip-info desktop-only">
                  <span className="user-name">{user.name}</span>
                  <span className="user-role-tag">
                    {user.roles?.[0]?.name || 'Customer'}
                  </span>
                </div>
              </button>

              {/* Profile Dropdown */}
              {dropdownOpen && (
                <div className="profile-dropdown">
                  <div className="dropdown-header">
                    <p className="dd-name">{user.name}</p>
                    <p className="dd-email">{user.email}</p>
                  </div>
                  <hr className="dd-divider" />
                  <button
                    className="dd-item"
                    onClick={() => {
                      setCurrentView('profile');
                      setDropdownOpen(false);
                    }}
                  >
                    <UserIcon size={16} />
                    <span>My Profile</span>
                  </button>
                  <button
                    className="dd-item"
                    onClick={() => {
                      setCurrentView('trips');
                      setDropdownOpen(false);
                    }}
                  >
                    <Luggage size={16} />
                    <span>My Trips</span>
                  </button>
                  <button
                    className="dd-item"
                    onClick={() => {
                      setCurrentView('wishlist');
                      setDropdownOpen(false);
                    }}
                  >
                    <Heart size={16} />
                    <span>Wishlists</span>
                  </button>
                  <button
                    className="dd-item"
                    onClick={() => {
                      onOpenIdentityModal();
                      setDropdownOpen(false);
                    }}
                  >
                    <FileCheck size={16} />
                    <span>Identity Verification</span>
                  </button>
                  {isHost && (
                    <button
                      className="dd-item"
                      onClick={() => {
                        setCurrentView('host-portal');
                        setDropdownOpen(false);
                      }}
                    >
                      <Key size={16} />
                      <span>Host Portal</span>
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="dd-item"
                      onClick={() => {
                        setCurrentView('admin-portal');
                        setDropdownOpen(false);
                      }}
                    >
                      <ShieldCheck size={16} />
                      <span>Admin Management</span>
                    </button>
                  )}
                  <hr className="dd-divider" />
                  <button
                    className="dd-item logout"
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                      setCurrentView('explore');
                    }}
                  >
                    <LogOut size={16} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <button className="btn-secondary" onClick={onOpenLogin}>
                Sign In
              </button>
              <button className="btn-primary" onClick={onOpenRegister}>
                Register
              </button>
            </div>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            className="mobile-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <button
            className="mobile-item"
            onClick={() => {
              setCurrentView('explore');
              setMobileMenuOpen(false);
            }}
          >
            Explore Stays
          </button>
          {isAuthenticated ? (
            <>
              <button
                className="mobile-item"
                onClick={() => {
                  setCurrentView('trips');
                  setMobileMenuOpen(false);
                }}
              >
                My Trips
              </button>
              <button
                className="mobile-item"
                onClick={() => {
                  setCurrentView('wishlist');
                  setMobileMenuOpen(false);
                }}
              >
                Wishlists
              </button>
              <button
                className="mobile-item"
                onClick={() => {
                  setCurrentView('profile');
                  setMobileMenuOpen(false);
                }}
              >
                Profile & Settings
              </button>
              <button
                className="mobile-item"
                onClick={() => {
                  onOpenIdentityModal();
                  setMobileMenuOpen(false);
                }}
              >
                Identity Verification
              </button>
              {isHost ? (
                <button
                  className="mobile-item"
                  onClick={() => {
                    setCurrentView('host-portal');
                    setMobileMenuOpen(false);
                  }}
                >
                  Host Portal
                </button>
              ) : (
                <button
                  className="mobile-item"
                  onClick={() => {
                    onOpenHostOnboarding();
                    setMobileMenuOpen(false);
                  }}
                >
                  Become a Host
                </button>
              )}
              {isAdmin && (
                <button
                  className="mobile-item"
                  onClick={() => {
                    setCurrentView('admin-portal');
                    setMobileMenuOpen(false);
                  }}
                >
                  Admin Panel
                </button>
              )}
              <button
                className="mobile-item text-red"
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                  setCurrentView('explore');
                }}
              >
                Log Out
              </button>
            </>
          ) : (
            <div className="mobile-auth">
              <button
                className="btn-secondary w-full"
                onClick={() => {
                  onOpenLogin();
                  setMobileMenuOpen(false);
                }}
              >
                Sign In
              </button>
              <button
                className="btn-primary w-full"
                onClick={() => {
                  onOpenRegister();
                  setMobileMenuOpen(false);
                }}
              >
                Register
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
