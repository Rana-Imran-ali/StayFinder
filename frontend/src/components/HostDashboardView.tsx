import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { HostProfile, PayoutMethod, HostVerification } from '../types/auth';
import type { Property } from '../types/property';
import { HostPropertyList } from './HostPropertyList';
import {
  Home,
  ShieldCheck,
  CreditCard,
  Settings,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Check,
  Building,
  Building2,
  HelpCircle,
  Loader2,
} from 'lucide-react';

interface HostDashboardViewProps {
  onOpenIdentityModal: () => void;
  onSelectProperty?: (property: Property) => void;
}

export const HostDashboardView: React.FC<HostDashboardViewProps> = ({ onOpenIdentityModal, onSelectProperty }) => {
  const { user, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'listings' | 'profile' | 'account' | 'payouts'>('overview');
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);
  const [verification, setVerification] = useState<HostVerification | null>(null);
  const [payoutMethods, setPayoutMethods] = useState<PayoutMethod[]>([]);

  // Host Profile Form State
  const [businessName, setBusinessName] = useState('');
  const [aboutHost, setAboutHost] = useState('');
  const [languages, setLanguages] = useState('');
  const [responseTime, setResponseTime] = useState('within a few hours');

  // Account / Policy Form State
  const [taxId, setTaxId] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState<'flexible' | 'moderate' | 'strict'>('flexible');
  const [checkInTime, setCheckInTime] = useState('15:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [instantBooking, setInstantBooking] = useState(true);

  // Add Payout Method Form State
  const [showAddPayout, setShowAddPayout] = useState(false);
  const [payoutType, setPayoutType] = useState<'bank_transfer' | 'paypal'>('bank_transfer');
  const [accountHolder, setAccountHolder] = useState(user?.name || '');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [paypalEmail, setPaypalEmail] = useState(user?.email || '');

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadHostData = async () => {
    setIsLoading(true);
    try {
      const [profRes, payoutRes] = await Promise.all([
        api.getHostProfile().catch(() => null),
        api.getPayoutMethods().catch(() => null),
      ]);

      if (profRes?.data) {
        setHostProfile(profRes.data.host_profile);
        setVerification(profRes.data.verification);
        setBusinessName(profRes.data.host_profile.business_name || '');
        setAboutHost(profRes.data.host_profile.about_host || '');
        setLanguages(profRes.data.host_profile.languages?.join(', ') || 'English');
        setResponseTime(profRes.data.host_profile.response_time || 'within a few hours');
        setCancellationPolicy(profRes.data.host_profile.cancellation_policy || 'flexible');
        setCheckInTime(profRes.data.host_profile.check_in_time || '15:00');
        setCheckOutTime(profRes.data.host_profile.check_out_time || '11:00');
        setInstantBooking(profRes.data.host_profile.instant_booking ?? true);
        setTaxId(profRes.data.host_profile.tax_id || '');
      }

      if (payoutRes?.data) {
        setPayoutMethods(payoutRes.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHostData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const langs = languages.split(',').map((l) => l.trim()).filter(Boolean);
      const res = await api.updateHostProfile({
        business_name: businessName,
        about_host: aboutHost,
        languages: langs,
        response_time: responseTime,
      });

      if (res.data) {
        setHostProfile(res.data);
      }
      setSuccessMsg('Host profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update host profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await api.updateHostAccountSettings({
        tax_id: taxId,
        cancellation_policy: cancellationPolicy,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        instant_booking: instantBooking,
      });

      if (res.data) {
        setHostProfile(res.data);
      }
      setSuccessMsg('Host account & policy settings updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update host account settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestHostVerification = async () => {
    if (!user?.is_identity_verified) {
      setErrorMsg('You must complete Identity Verification (KYC) before requesting verified host status.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await api.requestHostVerification();
      if (res.data) {
        setVerification(res.data);
        setSuccessMsg('Host verification submitted to administrators for review!');
        await refreshUser();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to request host verification.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await api.addPayoutMethod({
        type: payoutType,
        account_holder_name: accountHolder,
        bank_name: payoutType === 'bank_transfer' ? bankName : undefined,
        account_number: payoutType === 'bank_transfer' ? accountNumber : undefined,
        routing_number: payoutType === 'bank_transfer' ? routingNumber : undefined,
        paypal_email: payoutType === 'paypal' ? paypalEmail : undefined,
        currency: 'USD',
        is_default: payoutMethods.length === 0,
      });

      if (res.data) {
        setPayoutMethods((prev) => [...prev, res.data!]);
        setShowAddPayout(false);
        setAccountNumber('');
        setBankName('');
        setSuccessMsg('Payout method added successfully!');
        setTimeout(() => setSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add payout method.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefaultPayout = async (id: number) => {
    try {
      await api.setDefaultPayoutMethod(id);
      setPayoutMethods((prev) =>
        prev.map((m) => ({ ...m, is_default: m.id === id }))
      );
      setSuccessMsg('Primary payout method updated!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update default payout method.');
    }
  };

  const handleDeletePayout = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this payout method?')) return;

    try {
      await api.deletePayoutMethod(id);
      setPayoutMethods((prev) => prev.filter((m) => m.id !== id));
      setSuccessMsg('Payout method deleted.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete payout method.');
    }
  };

  if (isLoading) {
    return (
      <div className="portal-container">
        <div className="portal-card">
          <Loader2 className="spinner" size={32} />
          <p className="mt-2 text-muted">Loading Host Portal...</p>
        </div>
      </div>
    );
  }

  const isHostVerified = user?.is_host_verified || verification?.status === 'approved';
  const isPendingHostVerif = verification?.status === 'pending';

  return (
    <div className="portal-container host-dashboard">
      {/* Host Header */}
      <div className="host-header-card">
        <div className="host-header-left">
          <div className="host-avatar-box">
            <Home size={32} className="text-amber" />
          </div>
          <div>
            <h2>{hostProfile?.business_name || user?.name + "'s Host Portal"}</h2>
            <p className="text-muted">Manage your hosting presence, verification, and payout accounts</p>
          </div>
        </div>

        <div className="host-badges">
          {isHostVerified ? (
            <span className="badge badge-success">
              <CheckCircle2 size={14} /> Verified Host
            </span>
          ) : isPendingHostVerif ? (
            <span className="badge badge-warning">
              <Clock size={14} /> Verification Pending
            </span>
          ) : (
            <span className="badge badge-neutral">Standard Host</span>
          )}

          {user?.is_identity_verified ? (
            <span className="badge badge-success">
              <ShieldCheck size={14} /> ID Verified
            </span>
          ) : (
            <button className="badge badge-action" onClick={onOpenIdentityModal}>
              <HelpCircle size={14} /> Verify ID (Required)
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Sparkles size={18} />
          <span>Host Overview</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'listings' ? 'active' : ''}`}
          onClick={() => setActiveTab('listings')}
        >
          <Building2 size={18} />
          <span>My Properties</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <Home size={18} />
          <span>Host Profile</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <Settings size={18} />
          <span>Hosting Policies</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
          onClick={() => setActiveTab('payouts')}
        >
          <CreditCard size={18} />
          <span>Payout Accounts</span>
        </button>
      </div>

      {/* Feedback Alerts */}
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

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="host-overview-grid">
          <div className="card-form">
            <div className="card-header">
              <h3>Host Verification Checklist</h3>
              <p>Achieving verified host status increases booking conversions by 40%</p>
            </div>

            <div className="checklist-items">
              <div className="checklist-row">
                <div className="check-indicator done">
                  <Check size={16} />
                </div>
                <div className="check-details">
                  <h4>Account Created & Host Role Assigned</h4>
                  <p>You are registered as a host on StayFinder.</p>
                </div>
              </div>

              <div className="checklist-row">
                <div className={`check-indicator ${user?.is_identity_verified ? 'done' : 'pending'}`}>
                  {user?.is_identity_verified ? <Check size={16} /> : '2'}
                </div>
                <div className="check-details">
                  <h4>Government Identity Verification (KYC)</h4>
                  <p>
                    {user?.is_identity_verified
                      ? 'Your government ID documents are approved.'
                      : 'Required: Upload passport or government ID to confirm identity.'}
                  </p>
                </div>
                {!user?.is_identity_verified && (
                  <button className="btn-secondary btn-sm" onClick={onOpenIdentityModal}>
                    Start ID Verification
                  </button>
                )}
              </div>

              <div className="checklist-row">
                <div className={`check-indicator ${isHostVerified ? 'done' : 'pending'}`}>
                  {isHostVerified ? <Check size={16} /> : '3'}
                </div>
                <div className="check-details">
                  <h4>Platform Host Verification Badge</h4>
                  <p>
                    {isHostVerified
                      ? 'Congratulations! You are a verified host on StayFinder.'
                      : isPendingHostVerif
                      ? 'Your host verification is in queue with platform administrators.'
                      : 'Submit your profile for admin verification review.'}
                  </p>
                </div>
                {!isHostVerified && !isPendingHostVerif && (
                  <button
                    className="btn-primary btn-sm"
                    onClick={handleRequestHostVerification}
                    disabled={isSaving || !user?.is_identity_verified}
                  >
                    Request Verification
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="portal-stats">
            <div className="stat-card">
              <h4>Response Rate</h4>
              <p className="stat-number">100%</p>
              <span className="stat-sub">{hostProfile?.response_time}</span>
            </div>
            <div className="stat-card">
              <h4>Active Payouts</h4>
              <p className="stat-number">{payoutMethods.length}</p>
              <span className="stat-sub">
                {payoutMethods.find((m) => m.is_default)?.type.replace('_', ' ').toUpperCase() || 'None set'}
              </span>
            </div>
            <div className="stat-card">
              <h4>Cancellation</h4>
              <p className="stat-number text-capitalize">{hostProfile?.cancellation_policy}</p>
              <span className="stat-sub">Default property policy</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: My Properties */}
      {activeTab === 'listings' && (
        <div className="card-form">
          <HostPropertyList onSelectProperty={onSelectProperty} />
        </div>
      )}

      {/* Tab 2: Host Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="card-form">
          <div className="card-header">
            <h3>Public Host Information</h3>
            <p>This information is visible to guests on your property listings</p>
          </div>

          <div className="form-group">
            <label>Business / Host Entity Name</label>
            <input
              type="text"
              className="standard-input"
              value={businessName}
              placeholder="e.g. Seaside Escapes LLC"
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>About You & Hosting Style *</label>
            <textarea
              className="standard-textarea"
              rows={4}
              value={aboutHost}
              onChange={(e) => setAboutHost(e.target.value)}
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Spoken Languages (comma separated)</label>
              <input
                type="text"
                className="standard-input"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Response Time</label>
              <select
                className="select-input"
                value={responseTime}
                onChange={(e) => setResponseTime(e.target.value)}
              >
                <option value="within an hour">Within an hour</option>
                <option value="within a few hours">Within a few hours</option>
                <option value="within a day">Within a day</option>
              </select>
            </div>
          </div>

          <div className="card-actions">
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="spinner" /> : 'Save Host Profile'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Hosting Policies */}
      {activeTab === 'account' && (
        <form onSubmit={handleSaveAccount} className="card-form">
          <div className="card-header">
            <h3>Account & Hosting Policies</h3>
            <p>Configure check-in windows, cancellation rules, and tax identifiers</p>
          </div>

          <div className="form-group">
            <label>Tax ID / VAT Registration</label>
            <input
              type="text"
              className="standard-input"
              placeholder="e.g. US-987654321"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Default Check-In Time</label>
              <input
                type="text"
                className="standard-input"
                placeholder="15:00"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Default Check-Out Time</label>
              <input
                type="text"
                className="standard-input"
                placeholder="11:00"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Cancellation Policy</label>
              <select
                className="select-input"
                value={cancellationPolicy}
                onChange={(e: any) => setCancellationPolicy(e.target.value)}
              >
                <option value="flexible">Flexible (100% refund up to 24h prior)</option>
                <option value="moderate">Moderate (100% refund up to 5 days prior)</option>
                <option value="strict">Strict (50% refund up to 7 days prior)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Instant Booking</label>
              <div className="checkbox-toggle-container">
                <input
                  type="checkbox"
                  id="instant_booking_account"
                  checked={instantBooking}
                  onChange={(e) => setInstantBooking(e.target.checked)}
                />
                <label htmlFor="instant_booking_account">
                  Automatically accept guest reservations
                </label>
              </div>
            </div>
          </div>

          <div className="card-actions">
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? <Loader2 size={16} className="spinner" /> : 'Save Policies'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: Payout Accounts */}
      {activeTab === 'payouts' && (
        <div className="card-form">
          <div className="card-header flex-between">
            <div>
              <h3>Payout Methods</h3>
              <p>Where you receive earnings after guest check-ins</p>
            </div>
            <button className="btn-primary btn-sm" onClick={() => setShowAddPayout(!showAddPayout)}>
              <Plus size={16} />
              <span>Add Payout Method</span>
            </button>
          </div>

          {/* Add Payout Method Form */}
          {showAddPayout && (
            <form onSubmit={handleAddPayout} className="payout-add-form">
              <h4>Add New Payout Account</h4>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Payout Type</label>
                  <select
                    className="select-input"
                    value={payoutType}
                    onChange={(e: any) => setPayoutType(e.target.value)}
                  >
                    <option value="bank_transfer">Direct Bank Deposit / Wire</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Account Holder Name *</label>
                  <input
                    type="text"
                    className="standard-input"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    required
                  />
                </div>
              </div>

              {payoutType === 'bank_transfer' ? (
                <>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Bank Name *</label>
                      <input
                        type="text"
                        className="standard-input"
                        placeholder="e.g. JPMorgan Chase"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Routing / Sort Code</label>
                      <input
                        type="text"
                        className="standard-input"
                        placeholder="e.g. 021000021"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Account Number / IBAN *</label>
                    <input
                      type="password"
                      className="standard-input"
                      placeholder="Account number"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      required
                    />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label>PayPal Email Address *</label>
                  <input
                    type="email"
                    className="standard-input"
                    value={paypalEmail}
                    onChange={(e) => setPaypalEmail(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-actions-row">
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? <Loader2 size={16} className="spinner" /> : 'Save Payout Method'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddPayout(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* List of Payout Methods */}
          <div className="payout-list">
            {payoutMethods.length === 0 ? (
              <p className="text-muted text-center py-4">
                No payout methods configured yet. Add your bank or PayPal account to receive bookings revenue.
              </p>
            ) : (
              payoutMethods.map((method) => (
                <div key={method.id} className="payout-item-card">
                  <div className="payout-icon-box">
                    <Building size={22} className="text-primary" />
                  </div>
                  <div className="payout-details">
                    <div className="payout-title-row">
                      <h4>
                        {method.type === 'bank_transfer'
                          ? `${method.bank_name || 'Bank Account'} (•••• ${method.account_number_last_four || '****'})`
                          : `PayPal (${method.paypal_email})`}
                      </h4>
                      {method.is_default && (
                        <span className="badge badge-success">Default</span>
                      )}
                    </div>
                    <p className="text-muted">
                      Holder: {method.account_holder_name} • Currency: {method.currency}
                    </p>
                  </div>

                  <div className="payout-actions">
                    {!method.is_default && (
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => handleSetDefaultPayout(method.id)}
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      className="btn-icon-danger"
                      onClick={() => handleDeletePayout(method.id)}
                      title="Remove method"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

