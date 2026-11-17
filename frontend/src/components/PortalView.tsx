import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ShieldCheck, Key, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface PortalViewProps {
  type: 'admin' | 'host';
}

export const PortalView: React.FC<PortalViewProps> = ({ type }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPortal = async () => {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        const res = type === 'admin' ? await api.getAdminDashboard() : await api.getHostDashboard();
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Access denied.');
      } finally {
        setLoading(false);
      }
    };

    fetchPortal();
  }, [type]);

  const isHost = type === 'host';

  return (
    <div className="portal-container">
      <div className="portal-card">
        <div className="portal-header">
          {isHost ? (
            <Key className="portal-icon text-amber" size={36} />
          ) : (
            <ShieldCheck className="portal-icon text-indigo" size={36} />
          )}
          <h2>{isHost ? 'Host & Partner Portal' : 'Platform Administration Portal'}</h2>
          <p className="portal-sub">
            Protected by backend RBAC middleware: <code>role:{type}</code>
          </p>
        </div>

        {loading ? (
          <div className="portal-loading">
            <Loader2 className="spinner" size={32} />
            <p>Verifying server credentials & permissions...</p>
          </div>
        ) : error ? (
          <div className="portal-error-card">
            <AlertTriangle className="error-icon" size={32} />
            <h3>Authorization Failed (HTTP 403)</h3>
            <p>{error}</p>
            <div className="portal-notice">
              Your active account does not have the <strong>{type.toUpperCase()}</strong> role.
            </div>
          </div>
        ) : (
          <div className="portal-success-card">
            <CheckCircle className="success-icon" size={32} />
            <h3>{data?.message || 'Access Granted!'}</h3>
            <p>Your authentication token passed the backend <code>role:{type}</code> check.</p>

            <div className="portal-stats">
              <div className="stat-card">
                <h4>{isHost ? 'Active Listings' : 'Total System Users'}</h4>
                <p className="stat-number">{isHost ? '4 Properties' : '1,428 Users'}</p>
              </div>
              <div className="stat-card">
                <h4>{isHost ? 'Upcoming Bookings' : 'Pending Approvals'}</h4>
                <p className="stat-number">{isHost ? '12 Guests' : '3 Hosts'}</p>
              </div>
              <div className="stat-card">
                <h4>{isHost ? 'Total Earnings' : 'Platform Health'}</h4>
                <p className="stat-number">{isHost ? '$3,850' : '99.98%'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

