import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { messageApi } from '../services/messageApi';
import { notificationApi } from '../services/notificationApi';
import type { AppNotificationItem } from '../services/notificationApi';
import {
  Compass,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Home,
  Key,
  Menu,
  X,
  Sparkles,
  FileCheck,
  Luggage,
  Heart,
  MessageSquare,
  Bell,
} from 'lucide-react';

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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const checkCounts = async () => {
      const [msgCount, notifRes] = await Promise.all([
        messageApi.getUnreadCount(),
        notificationApi.getNotifications().catch(() => ({ data: [], unread_count: 0 })),
      ]);
      setUnreadMsgCount(msgCount);
      setUnreadNotifCount(notifRes.unread_count);
      setNotifications(notifRes.data);
    };

    checkCounts();
    const interval = setInterval(checkCounts, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleMarkAllNotifsRead = async () => {
    await notificationApi.markAllAsRead();
    setUnreadNotifCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

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
                className={`nav-btn ${currentView === 'messages' ? 'active' : ''}`}
                onClick={() => setCurrentView('messages')}
                style={{ position: 'relative' }}
              >
                <MessageSquare size={18} />
                <span>Messages</span>
                {unreadMsgCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      background: '#FF385C',
                      color: '#fff',
                      fontSize: '10px',
                      fontWeight: 700,
                      borderRadius: '10px',
                      padding: '1px 5px',
                    }}
                  >
                    {unreadMsgCount}
                  </span>
                )}
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
        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isAuthenticated && user ? (
            <>
              {/* Notification Bell */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setDropdownOpen(false);
                  }}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                  style={{ position: 'relative' }}
                  title="Notifications"
                >
                  <Bell size={20} />
                  {unreadNotifCount > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        background: '#FF385C',
                        color: '#fff',
                        fontSize: '9px',
                        fontWeight: 700,
                        borderRadius: '10px',
                        padding: '1px 4px',
                        minWidth: '15px',
                        textAlign: 'center',
                      }}
                    >
                      {unreadNotifCount}
                    </span>
                  )}
                </button>

                {/* Notifications Popover */}
                {notificationsOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '110%',
                      width: '320px',
                      background: '#fff',
                      borderRadius: '16px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                      border: '1px solid #f0f0f0',
                      zIndex: 100,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Notifications</span>
                      {unreadNotifCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllNotifsRead}
                          style={{ fontSize: '0.72rem', color: '#FF385C', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          Mark all as read
                        </button>
                      )}
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#999', fontSize: '0.8rem' }}>
                          No notifications yet
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            style={{
                              padding: '0.75rem 1rem',
                              borderBottom: '1px solid #f8f8f8',
                              background: notif.is_read ? '#fff' : '#fff5f7',
                              cursor: 'pointer',
                            }}
                            onClick={() => {
                              if (notif.action_url) {
                                if (notif.action_url.includes('trips')) setCurrentView('trips');
                                else if (notif.action_url.includes('messages')) setCurrentView('messages');
                                else if (notif.action_url.includes('reservations') || notif.action_url.includes('host')) setCurrentView('host-portal');
                              }
                              setNotificationsOpen(false);
                            }}
                          >
                            <p style={{ fontSize: '0.78rem', fontWeight: notif.is_read ? 600 : 700, color: '#1e293b', marginBottom: '2px' }}>
                              {notif.title}
                            </p>
                            <p style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4 }}>
                              {notif.message}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

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
                      setCurrentView('messages');
                      setDropdownOpen(false);
                    }}
                  >
                    <MessageSquare size={16} />
                    <span>Messages</span>
                    {unreadMsgCount > 0 && (
                      <span className="ml-auto text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.2 rounded-full">
                        {unreadMsgCount}
                      </span>
                    )}
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
          </>
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
                  setCurrentView('messages');
                  setMobileMenuOpen(false);
                }}
              >
                Messages {unreadMsgCount > 0 ? `(${unreadMsgCount})` : ''}
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
