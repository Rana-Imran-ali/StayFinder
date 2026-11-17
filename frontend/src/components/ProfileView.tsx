import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  Camera,
  User as UserIcon,
  Phone,
  Calendar,
  MapPin,
  FileText,
  Lock,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const ProfileView: React.FC = () => {
  const { user, setUser, logoutAll } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'roles'>('profile');

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dob, setDob] = useState(user?.profile?.date_of_birth ? user.profile.date_of_birth.substring(0, 10) : '');
  const [gender, setGender] = useState(user?.profile?.gender || '');
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [address, setAddress] = useState(user?.profile?.address || '');

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!user) return null;

  const avatarUrl = user.profile?.profile_photo
    ? (user.profile.profile_photo.startsWith('http')
      ? user.profile.profile_photo
      : `/storage/${user.profile.profile_photo}`)
    : null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await api.updateProfile({
        name,
        phone,
        date_of_birth: dob || undefined,
        gender: gender || undefined,
        bio: bio || undefined,
        address: address || undefined,
      });

      if (res.data) {
        setUser(res.data);
      }
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsPhotoLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.uploadPhoto(file);
      if (res.data) {
        // Refresh full user
        const refreshed = await api.getUser();
        if (refreshed.data) {
          setUser(refreshed.data);
        }
        setSuccessMsg('Profile photo updated successfully!');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to upload photo.');
    } finally {
      setIsPhotoLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    if (newPassword !== newPasswordConfirmation) {
      setErrorMsg('New passwords do not match.');
      setIsLoading(false);
      return;
    }

    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      });

      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirmation('');
      setSuccessMsg('Password changed successfully! Other device sessions have been revoked.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-container">
      {/* Profile Header Banner */}
      <div className="profile-hero">
        <div className="profile-hero-content">
          <div className="avatar-wrapper">
            {avatarUrl ? (
              <img src={avatarUrl} alt={user.name} className="profile-avatar-large" />
            ) : (
              <div className="avatar-placeholder-large">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              className="photo-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPhotoLoading}
              title="Upload new photo"
            >
              {isPhotoLoading ? <Loader2 size={16} className="spinner" /> : <Camera size={16} />}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>

          <div className="profile-hero-text">
            <h2>{user.name}</h2>
            <p className="profile-email">{user.email}</p>
            <div className="profile-tags">
              <span className="badge badge-status">
                ● {user.status.toUpperCase()}
              </span>
              {user.roles?.map((r) => (
                <span key={r.id} className="badge badge-role">
                  {r.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <UserIcon size={18} />
          <span>Personal Info</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Lock size={18} />
          <span>Security & Password</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          <ShieldCheck size={18} />
          <span>Role & Access</span>
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab 1: Profile Information */}
      {activeTab === 'profile' && (
        <form onSubmit={handleUpdateProfile} className="card-form">
          <div className="card-header">
            <h3>Personal Information</h3>
            <p>Update your public profile and contact preferences</p>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-icon-wrapper">
                <UserIcon className="input-icon" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <div className="input-icon-wrapper">
                <Phone className="input-icon" size={18} />
                <input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Date of Birth</label>
              <div className="input-icon-wrapper">
                <Calendar className="input-icon" size={18} />
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Gender</label>
              <select
                className="select-input"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Prefer not to say</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-Binary">Non-Binary</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Address / Location</label>
            <div className="input-icon-wrapper">
              <MapPin className="input-icon" size={18} />
              <input
                type="text"
                placeholder="City, State, Country"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Bio & Traveler Notes</label>
            <div className="input-icon-wrapper textarea-wrapper">
              <FileText className="input-icon textarea-icon" size={18} />
              <textarea
                rows={3}
                placeholder="Tell hosts or guests a little bit about yourself..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>

          <div className="card-actions">
            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Profile Changes</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Security & Password */}
      {activeTab === 'security' && (
        <div className="security-section">
          <form onSubmit={handleChangePassword} className="card-form">
            <div className="card-header">
              <h3>Change Password</h3>
              <p>Ensure your account is using a long, random password to stay secure</p>
            </div>

            <div className="form-group">
              <label>Current Password</label>
              <div className="input-icon-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label>New Password</label>
                <div className="input-icon-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    type="password"
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <div className="input-icon-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={newPasswordConfirmation}
                    onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="card-actions">
              <button type="submit" className="btn-primary" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </div>
          </form>

          {/* Session Invalidation */}
          <div className="card-form mt-4">
            <div className="card-header">
              <h3>Global Session Control</h3>
              <p>Log out of all other browsers, mobile apps, and active sessions</p>
            </div>
            <div className="card-actions">
              <button
                type="button"
                className="btn-danger"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to log out of all active devices?')) {
                    await logoutAll();
                  }
                }}
              >
                <LogOut size={16} />
                <span>Log Out of All Devices</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Roles & Privileges */}
      {activeTab === 'roles' && (
        <div className="card-form">
          <div className="card-header">
            <h3>Assigned Roles & Capabilities</h3>
            <p>Your authorization level determines which platform portals you can access</p>
          </div>

          <div className="roles-list">
            {user.roles && user.roles.length > 0 ? (
              user.roles.map((r) => (
                <div key={r.id} className="role-item-card">
                  <ShieldCheck className="role-badge-icon" size={24} />
                  <div>
                    <h4>{r.name} Role</h4>
                    <p>{r.description || `Granted access for '${r.slug}' capabilities.`}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted">No specific roles assigned.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

