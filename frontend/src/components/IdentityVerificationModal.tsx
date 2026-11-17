import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { IdentityVerification } from '../types/auth';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  UploadCloud,
  FileCheck,
  Camera,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

interface IdentityVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IdentityVerificationModal: React.FC<IdentityVerificationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, refreshUser } = useAuth();

  const [documentType, setDocumentType] = useState<'passport' | 'national_id' | 'driving_license'>('passport');
  const [documentNumber, setDocumentNumber] = useState('');
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);

  const [verification, setVerification] = useState<IdentityVerification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await api.getIdentityVerificationStatus();
      if (res.data?.verification) {
        setVerification(res.data.verification);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!frontFile) {
      setError('Please upload the front of your identification document.');
      return;
    }
    if (!selfieFile) {
      setError('Please upload a selfie for identity confirmation.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('document_type', documentType);
      if (documentNumber) formData.append('document_number', documentNumber);
      formData.append('document_front', frontFile);
      if (backFile) formData.append('document_back', backFile);
      formData.append('selfie', selfieFile);

      const res = await api.submitIdentityVerification(formData);
      if (res.data) {
        setVerification(res.data);
        setSuccess('Documents submitted successfully! Your identity is now under review.');
        await refreshUser();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit identity documents.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isApproved = user?.is_identity_verified || verification?.status === 'approved';
  const isPending = verification?.status === 'pending';
  const isRejected = verification?.status === 'rejected';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-header">
          <div className="icon-header-badge">
            <ShieldCheck size={28} className="text-primary" />
          </div>
          <h2>Identity Verification (KYC)</h2>
          <p>Verify your official government identity to unlock secure hosting and booking</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        {isLoading ? (
          <div className="modal-loading-state">
            <Loader2 className="spinner" size={28} />
            <p>Loading verification status...</p>
          </div>
        ) : isApproved ? (
          <div className="status-banner approved">
            <CheckCircle2 size={36} className="text-emerald" />
            <div>
              <h3>Identity Verified</h3>
              <p>Your government documents have been verified and approved by the platform administration.</p>
              <span className="timestamp-note">Verified at: {new Date(verification?.verified_at || '').toLocaleDateString()}</span>
            </div>
          </div>
        ) : (
          <>
            {isPending && (
              <div className="status-banner pending">
                <Clock size={32} className="text-amber" />
                <div>
                  <h3>Verification Under Review</h3>
                  <p>Our compliance team is currently reviewing your documents. Reviews typically conclude within 24 hours.</p>
                </div>
              </div>
            )}

            {isRejected && (
              <div className="status-banner rejected">
                <AlertTriangle size={32} className="text-rose" />
                <div>
                  <h3>Verification Not Approved</h3>
                  <p><strong>Reason:</strong> {verification?.rejection_reason || 'Document was illegible or mismatched.'}</p>
                  <p className="mt-1">Please review the reason above and resubmit clear, valid documents below.</p>
                </div>
              </div>
            )}

            {(!isPending || isRejected) && (
              <form onSubmit={handleSubmit} className="modal-form mt-3">
                <div className="form-group">
                  <label>Document Type</label>
                  <select
                    className="select-input"
                    value={documentType}
                    onChange={(e: any) => setDocumentType(e.target.value)}
                  >
                    <option value="passport">International Passport</option>
                    <option value="national_id">National ID Card</option>
                    <option value="driving_license">Driver's License</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Document Number (Optional)</label>
                  <input
                    type="text"
                    className="standard-input"
                    placeholder="e.g. A12345678"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Document Front Image *</label>
                    <div className="file-upload-box">
                      <UploadCloud size={24} className="upload-icon" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFrontFile(e.target.files?.[0] || null)}
                        required
                      />
                      <span className="file-label">
                        {frontFile ? frontFile.name : 'Choose front photo'}
                      </span>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Document Back Image (If applicable)</label>
                    <div className="file-upload-box">
                      <FileCheck size={24} className="upload-icon" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setBackFile(e.target.files?.[0] || null)}
                      />
                      <span className="file-label">
                        {backFile ? backFile.name : 'Choose back photo'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Selfie Photo with Neutral Face *</label>
                  <div className="file-upload-box">
                    <Camera size={24} className="upload-icon" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelfieFile(e.target.files?.[0] || null)}
                      required
                    />
                    <span className="file-label">
                      {selfieFile ? selfieFile.name : 'Upload clear selfie'}
                    </span>
                  </div>
                  <span className="input-helper">Face must be well lit and without sunglasses or hats.</span>
                </div>

                <button type="submit" className="btn-primary w-full submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="spinner" />
                      <span>Encrypting & Uploading Documents...</span>
                    </>
                  ) : (
                    <span>Submit Identity Documents</span>
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

