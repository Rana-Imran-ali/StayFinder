import React, { useState } from 'react';
import { api } from '../services/api';
import { X, Mail, Lock, KeyRound, AlertCircle, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSwitchToLogin,
}) => {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await api.forgotPassword(email);
      if (res.data?.reset_token) {
        setResetToken(res.data.reset_token);
        setSuccess('Reset token generated! (Displayed below for quick testing)');
        setStep('reset');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request reset token. Please verify the email.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await api.resetPassword({
        email,
        token: resetToken,
        password: newPassword,
        password_confirmation: confirmPassword,
      });

      setSuccess(res.message || 'Password reset successfully!');
      setTimeout(() => {
        onClose();
        onSwitchToLogin();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check token.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-header">
          <h2>{step === 'request' ? 'Reset Password' : 'Set New Password'}</h2>
          <p>
            {step === 'request'
              ? 'Enter your registered email to receive a password reset token'
              : 'Enter your reset token and new secure password'}
          </p>
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

        {step === 'request' ? (
          <form onSubmit={handleRequestToken} className="modal-form">
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-icon-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full submit-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="spinner" size={18} />
                  <span>Generating Token...</span>
                </>
              ) : (
                <span>Request Reset Token</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="modal-form">
            <div className="form-group">
              <label>Reset Token</label>
              <div className="input-icon-wrapper">
                <KeyRound className="input-icon" size={18} />
                <input
                  type="text"
                  placeholder="Paste reset token here"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                />
              </div>
            </div>

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
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full submit-btn" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="spinner" size={18} />
                  <span>Resetting Password...</span>
                </>
              ) : (
                <span>Confirm Password Reset</span>
              )}
            </button>

            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => setStep('request')}
            >
              <ArrowLeft size={16} />
              <span>Back to Email</span>
            </button>
          </form>
        )}

        <div className="modal-footer">
          <button
            type="button"
            className="link-btn font-semibold"
            onClick={() => {
              onClose();
              onSwitchToLogin();
            }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  );
};

