import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { X, Home, Building2, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface HostOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const HostOnboardingModal: React.FC<HostOnboardingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { refreshUser } = useAuth();

  const [businessName, setBusinessName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [aboutHost, setAboutHost] = useState('');
  const [languages, setLanguages] = useState<string>('English');
  const [responseTime, setResponseTime] = useState('within an hour');
  const [cancellationPolicy, setCancellationPolicy] = useState<'flexible' | 'moderate' | 'strict'>('flexible');
  const [instantBooking, setInstantBooking] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const langArray = languages
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean);

      await api.onboardHost({
        business_name: businessName || undefined,
        tax_id: taxId || undefined,
        about_host: aboutHost,
        languages: langArray.length > 0 ? langArray : ['English'],
        response_time: responseTime,
        cancellation_policy: cancellationPolicy,
        instant_booking: instantBooking,
      });

      await refreshUser();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to complete host onboarding.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="icon-header-badge bg-amber-soft">
            <Home size={28} className="text-amber" />
          </div>
          <h2>Become a StayFinder Host</h2>
          <p>Join thousands of hosts welcoming travelers and earning on StayFinder</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid-2">
            <div className="form-group">
              <label>Business / Hosting Entity Name (Optional)</label>
              <div className="input-icon-wrapper">
                <Building2 className="input-icon" size={18} />
                <input
                  type="text"
                  placeholder="e.g. Seaside Villas LLC"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Tax ID / Business Registration (Optional)</label>
              <div className="input-icon-wrapper">
                <FileText className="input-icon" size={18} />
                <input
                  type="text"
                  placeholder="e.g. US-123456789"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>About You & Your Hosting Philosophy *</label>
            <textarea
              className="standard-textarea"
              rows={3}
              placeholder="Tell guests about your hospitality style, favorite local spots, and what makes your stays unique..."
              value={aboutHost}
              onChange={(e) => setAboutHost(e.target.value)}
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Languages Spoken (comma separated)</label>
              <input
                type="text"
                className="standard-input"
                placeholder="English, Spanish, French"
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Typical Response Time</label>
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

          <div className="form-grid-2">
            <div className="form-group">
              <label>Default Cancellation Policy</label>
              <select
                className="select-input"
                value={cancellationPolicy}
                onChange={(e: any) => setCancellationPolicy(e.target.value)}
              >
                <option value="flexible">Flexible (Full refund 1 day prior)</option>
                <option value="moderate">Moderate (Full refund 5 days prior)</option>
                <option value="strict">Strict (50% refund up to 7 days prior)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Instant Booking</label>
              <div className="checkbox-toggle-container">
                <input
                  type="checkbox"
                  id="instant_booking_check"
                  checked={instantBooking}
                  onChange={(e) => setInstantBooking(e.target.checked)}
                />
                <label htmlFor="instant_booking_check">
                  Allow guests to book instantly without manual approval
                </label>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full submit-btn" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={18} className="spinner" />
                <span>Completing Host Onboarding...</span>
              </>
            ) : (
              <span>Submit Host Registration</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
