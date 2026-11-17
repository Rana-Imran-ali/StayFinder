import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { User, IdentityVerification, HostVerification, AdminActivityLog } from '../types/auth';
import {
  ShieldCheck,
  Users,
  FileCheck,
  Home,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Loader2,
  Lock,
} from 'lucide-react';

export const AdminManagementView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'identity' | 'hosts' | 'logs'>('overview');

  // Stats & Overview
  const [stats, setStats] = useState<any>(null);
  const [recentLogs, setRecentLogs] = useState<AdminActivityLog[]>([]);

  // Users List
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Verifications Queues
  const [idVerifications, setIdVerifications] = useState<IdentityVerification[]>([]);
  const [hostVerifications, setHostVerifications] = useState<HostVerification[]>([]);

  // Audit Logs
  const [allLogs, setAllLogs] = useState<AdminActivityLog[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal / Rejection State
  const [rejectingTarget, setRejectingTarget] = useState<{ type: 'identity' | 'host'; id: number } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (activeTab === 'overview') {
        const res = await api.getAdminDashboard();
        if (res.data) {
          setStats(res.data.stats);
          setRecentLogs(res.data.recent_logs);
        }
      } else if (activeTab === 'users') {
        const res = await api.getAdminUsers({
          search: userSearch || undefined,
          role: roleFilter || undefined,
          status: statusFilter || undefined,
        });
        if (res.data) {
          setUsers(res.data.data);
        }
      } else if (activeTab === 'identity') {
        const res = await api.getPendingIdentityVerifications('pending');
        if (res.data) {
          setIdVerifications(res.data.data);
        }
      } else if (activeTab === 'hosts') {
        const res = await api.getPendingHostVerifications('pending');
        if (res.data) {
          setHostVerifications(res.data.data);
        }
      } else if (activeTab === 'logs') {
        const res = await api.getAdminActivityLogs();
        if (res.data) {
          setAllLogs(res.data.data);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch admin data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleSearchUsers = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleUpdateUserStatus = async (userId: number, newStatus: 'active' | 'inactive' | 'banned') => {
    try {
      await api.updateUserStatus(userId, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
      setSuccessMsg(`User status updated to ${newStatus}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user status.');
    }
  };

  const handleReviewIdentity = async (id: number, decision: 'approved' | 'rejected', reason?: string) => {
    setIsActionLoading(true);
    try {
      await api.reviewIdentityVerification(id, decision, reason);
      setIdVerifications((prev) => prev.filter((v) => v.id !== id));
      setRejectingTarget(null);
      setRejectionReason('');
      setSuccessMsg(`Identity verification ${decision}!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to review verification.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReviewHost = async (id: number, decision: 'approved' | 'rejected', reason?: string) => {
    setIsActionLoading(true);
    try {
      await api.reviewHostVerification(id, decision, reason);
      setHostVerifications((prev) => prev.filter((h) => h.id !== id));
      setRejectingTarget(null);
      setRejectionReason('');
      setSuccessMsg(`Host verification ${decision}!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to review host verification.');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="portal-container admin-portal">
      {/* Admin Header */}
      <div className="admin-header-card">
        <div className="admin-header-left">
          <div className="admin-badge-icon-box">
            <ShieldCheck size={32} className="text-indigo" />
          </div>
          <div>
            <h2>Platform Administration & Compliance</h2>
            <p className="text-muted">Review verifications, manage platform members, and monitor audit trails</p>
          </div>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="profile-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={18} />
          <span>Dashboard</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={18} />
          <span>Users & Hosts</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'identity' ? 'active' : ''}`}
          onClick={() => setActiveTab('identity')}
        >
          <FileCheck size={18} />
          <span>ID Verifications</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'hosts' ? 'active' : ''}`}
          onClick={() => setActiveTab('hosts')}
        >
          <Home size={18} />
          <span>Host Applications</span>
        </button>
        <button
          className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          <Lock size={18} />
          <span>Audit Logs</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="alert alert-error">
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tab 1: Dashboard Overview */}
      {activeTab === 'overview' && (
        <div className="admin-overview">
          <div className="portal-stats admin-stats">
            <div className="stat-card">
              <h4>Total Platform Users</h4>
              <p className="stat-number">{stats?.total_users ?? 0}</p>
              <span className="stat-sub">{stats?.active_users ?? 0} Active • {stats?.banned_users ?? 0} Banned</span>
            </div>
            <div className="stat-card">
              <h4>Registered Hosts</h4>
              <p className="stat-number">{stats?.total_hosts ?? 0}</p>
              <span className="stat-sub">Property Partners</span>
            </div>
            <div className="stat-card">
              <h4>Pending ID Verifications</h4>
              <p className="stat-number text-rose">{stats?.pending_identity_verifications ?? 0}</p>
              <span className="stat-sub">Awaiting KYC Approval</span>
            </div>
            <div className="stat-card">
              <h4>Pending Host Verifications</h4>
              <p className="stat-number text-amber">{stats?.pending_host_verifications ?? 0}</p>
              <span className="stat-sub">Awaiting Host Review</span>
            </div>
          </div>

          <div className="card-form mt-4">
            <div className="card-header">
              <h3>Recent Administrative Audit Logs</h3>
              <p>Chronological security and compliance actions</p>
            </div>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Administrator</th>
                    <th>Action</th>
                    <th>Description</th>
                    <th>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-muted">
                        No admin activity logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    recentLogs.map((log) => (
                      <tr key={log.id}>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td><strong>{log.admin?.name || 'Admin'}</strong></td>
                        <td>
                          <span className="badge badge-neutral">{log.action}</span>
                        </td>
                        <td>{log.description}</td>
                        <td><code>{log.ip_address || '127.0.0.1'}</code></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: User & Host Management */}
      {activeTab === 'users' && (
        <div className="card-form">
          <div className="card-header">
            <h3>Registered Members Directory</h3>
            <p>Filter, search, inspect profiles, and enforce access restrictions</p>
          </div>

          <form onSubmit={handleSearchUsers} className="search-filter-bar">
            <div className="search-input-box">
              <Search size={16} className="text-muted" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            <select
              className="select-input select-sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="customer">Customer</option>
              <option value="host">Host</option>
              <option value="admin">Admin</option>
            </select>

            <select
              className="select-input select-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="banned">Banned</option>
            </select>

            <button type="submit" className="btn-primary btn-sm">
              Filter
            </button>
          </form>

          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="spinner" size={28} />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role(s)</th>
                    <th>Verifications</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Change Status</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="user-table-cell">
                          <strong>{u.name}</strong>
                          <span className="text-muted text-xs">{u.email}</span>
                          {u.phone && <span className="text-muted text-xs">{u.phone}</span>}
                        </div>
                      </td>
                      <td>
                        {u.roles?.map((r) => (
                          <span key={r.id} className="badge badge-role mr-1">
                            {r.name}
                          </span>
                        ))}
                      </td>
                      <td>
                        <div className="verif-badges-cell">
                          {u.is_identity_verified ? (
                            <span className="badge badge-success" title="Identity Verified">
                              ID Verified
                            </span>
                          ) : (
                            <span className="badge badge-neutral" title="Unverified">
                              ID Unverified
                            </span>
                          )}
                          {u.is_host_verified && (
                            <span className="badge badge-warning mt-1" title="Verified Host">
                              Host Verified
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            u.status === 'active'
                              ? 'badge-success'
                              : u.status === 'banned'
                              ? 'badge-danger'
                              : 'badge-neutral'
                          }`}
                        >
                          {u.status.toUpperCase()}
                        </span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <select
                          className="select-input select-xs"
                          value={u.status}
                          onChange={(e: any) => handleUpdateUserStatus(u.id, e.target.value)}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="banned">Banned</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Identity Verification Queue */}
      {activeTab === 'identity' && (
        <div className="card-form">
          <div className="card-header">
            <h3>Identity Documents Review Queue</h3>
            <p>Verify official government IDs to prevent fraudulent bookings and hosting</p>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="spinner" size={28} />
            </div>
          ) : idVerifications.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <CheckCircle2 size={36} className="text-emerald mx-auto mb-2" />
              <p>Queue is all caught up! No pending identity documents requiring review.</p>
            </div>
          ) : (
            <div className="verification-cards-grid">
              {idVerifications.map((verif) => (
                <div key={verif.id} className="verification-card">
                  <div className="verif-card-header">
                    <div>
                      <h4>{verif.user?.name}</h4>
                      <p className="text-muted text-xs">{verif.user?.email}</p>
                    </div>
                    <span className="badge badge-warning">Pending Review</span>
                  </div>

                  <div className="verif-doc-meta">
                    <p>
                      <strong>Doc Type:</strong> {verif.document_type.replace('_', ' ').toUpperCase()}
                    </p>
                    {verif.document_number && (
                      <p>
                        <strong>Number:</strong> {verif.document_number}
                      </p>
                    )}
                  </div>

                  {/* Document Thumbnails */}
                  <div className="thumbnails-row">
                    <div className="thumb-item">
                      <span className="thumb-label">Front ID</span>
                      <a href={`/storage/${verif.document_front}`} target="_blank" rel="noreferrer">
                        <img src={`/storage/${verif.document_front}`} alt="Front" className="thumb-img" />
                      </a>
                    </div>
                    {verif.document_back && (
                      <div className="thumb-item">
                        <span className="thumb-label">Back ID</span>
                        <a href={`/storage/${verif.document_back}`} target="_blank" rel="noreferrer">
                          <img src={`/storage/${verif.document_back}`} alt="Back" className="thumb-img" />
                        </a>
                      </div>
                    )}
                    <div className="thumb-item">
                      <span className="thumb-label">Selfie</span>
                      <a href={`/storage/${verif.selfie}`} target="_blank" rel="noreferrer">
                        <img src={`/storage/${verif.selfie}`} alt="Selfie" className="thumb-img" />
                      </a>
                    </div>
                  </div>

                  <div className="verif-actions-row">
                    <button
                      className="btn-success btn-sm w-full"
                      onClick={() => handleReviewIdentity(verif.id, 'approved')}
                      disabled={isActionLoading}
                    >
                      <CheckCircle2 size={16} /> Approve ID
                    </button>
                    <button
                      className="btn-danger btn-sm w-full"
                      onClick={() => setRejectingTarget({ type: 'identity', id: verif.id })}
                      disabled={isActionLoading}
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Host Verification Queue */}
      {activeTab === 'hosts' && (
        <div className="card-form">
          <div className="card-header">
            <h3>Host Applications Review Queue</h3>
            <p>Review new host profiles and award the verified host badge</p>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="spinner" size={28} />
            </div>
          ) : hostVerifications.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <CheckCircle2 size={36} className="text-emerald mx-auto mb-2" />
              <p>No pending host applications requiring review.</p>
            </div>
          ) : (
            <div className="verification-cards-grid">
              {hostVerifications.map((host) => (
                <div key={host.id} className="verification-card">
                  <div className="verif-card-header">
                    <div>
                      <h4>{host.user?.hostProfile?.business_name || host.user?.name}</h4>
                      <p className="text-muted text-xs">{host.user?.email}</p>
                    </div>
                    <span className="badge badge-warning">Pending Review</span>
                  </div>

                  <div className="host-details-summary">
                    <p>
                      <strong>Tax ID:</strong> {host.user?.hostProfile?.tax_id || 'Not provided'}
                    </p>
                    <p>
                      <strong>Identity Verified:</strong>{' '}
                      {host.user?.is_identity_verified ? (
                        <span className="text-emerald font-semibold">Yes (Verified)</span>
                      ) : (
                        <span className="text-rose font-semibold">No (Unverified)</span>
                      )}
                    </p>
                    <div className="about-text-box">
                      <strong>About Host:</strong>
                      <p>{host.user?.hostProfile?.about_host || 'No bio provided'}</p>
                    </div>
                  </div>

                  <div className="verif-actions-row">
                    <button
                      className="btn-success btn-sm w-full"
                      onClick={() => handleReviewHost(host.id, 'approved')}
                      disabled={isActionLoading}
                    >
                      <CheckCircle2 size={16} /> Approve Verified Host
                    </button>
                    <button
                      className="btn-danger btn-sm w-full"
                      onClick={() => setRejectingTarget({ type: 'host', id: host.id })}
                      disabled={isActionLoading}
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Full Audit Logs */}
      {activeTab === 'logs' && (
        <div className="card-form">
          <div className="card-header">
            <h3>Administrative Compliance Audit Trail</h3>
            <p>Immutable log of user modifications and verification approvals/rejections</p>
          </div>

          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="spinner" size={28} />
            </div>
          ) : (
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Administrator</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Description</th>
                    <th>IP</th>
                  </tr>
                </thead>
                <tbody>
                  {allLogs.map((log) => (
                    <tr key={log.id}>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                      <td><strong>{log.admin?.name || 'Admin'}</strong></td>
                      <td>
                        <span className="badge badge-neutral">{log.action}</span>
                      </td>
                      <td>{log.target_type ? `${log.target_type} #${log.target_id}` : '-'}</td>
                      <td>{log.description}</td>
                      <td><code>{log.ip_address || '127.0.0.1'}</code></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectingTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Rejection Reason</h3>
            <p className="text-muted text-sm mb-3">
              Explain why this {rejectingTarget.type} application is being rejected so the applicant can correct and resubmit.
            </p>

            <textarea
              className="standard-textarea"
              rows={4}
              placeholder="e.g. Document image was blurred; name on passport did not match account name..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
            />

            <div className="card-actions mt-3">
              <button
                className="btn-secondary"
                onClick={() => {
                  setRejectingTarget(null);
                  setRejectionReason('');
                }}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                disabled={!rejectionReason.trim() || isActionLoading}
                onClick={() => {
                  if (rejectingTarget.type === 'identity') {
                    handleReviewIdentity(rejectingTarget.id, 'rejected', rejectionReason);
                  } else {
                    handleReviewHost(rejectingTarget.id, 'rejected', rejectionReason);
                  }
                }}
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
