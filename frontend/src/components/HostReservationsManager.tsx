import React, { useState, useEffect, useCallback } from 'react';
import type { Booking, HostBookingStats } from '../types/booking';
import { bookingApi } from '../services/bookingApi';
import { BookingDetailsModal } from './BookingDetailsModal';
import {
  Calendar,
  DollarSign,
  Clock,
  CheckCircle2,
  Check,
  X,
  Loader2,
  AlertCircle,
  Eye,
  Sparkles,
} from 'lucide-react';

export const HostReservationsManager: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<HostBookingStats | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const fetchHostBookings = useCallback(async (status: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await bookingApi.getHostBookings(status);
      if (res.success && res.data) {
        setBookings(res.data.data.data);
        setStats(res.data.stats);
      } else {
        setBookings([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load reservations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHostBookings(statusFilter);
  }, [statusFilter, fetchHostBookings]);

  const handleAccept = async (bookingId: number) => {
    setActionLoadingId(bookingId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await bookingApi.acceptBooking(bookingId);
      if (res.success && res.data) {
        setSuccessMsg(res.message || 'Reservation accepted and calendar locked!');
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: 'confirmed', payment_status: 'paid' } : b))
        );
        fetchHostBookings(statusFilter);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to accept reservation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (bookingId: number) => {
    const reason = window.prompt('Please provide a reason for declining this request (optional):');
    if (reason === null) return; // User cancelled prompt

    setActionLoadingId(bookingId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await bookingApi.rejectBooking(bookingId, reason || undefined);
      if (res.success && res.data) {
        setSuccessMsg(res.message || 'Reservation request declined.');
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: 'rejected' } : b))
        );
        fetchHostBookings(statusFilter);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to decline reservation.');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Metric Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Total Bookings</span>
              <Calendar size={18} className="text-blue-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.total_reservations}</div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Pending Action</span>
              <Clock size={18} className="text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-amber-600 flex items-center gap-2">
              {stats.pending_approval}
              {stats.pending_approval > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Confirmed Upcoming</span>
              <CheckCircle2 size={18} className="text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">{stats.confirmed_upcoming}</div>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Earnings (Confirmed)</span>
              <DollarSign size={18} className="text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">${stats.total_earnings.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex gap-2">
          {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
                statusFilter === tab
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
          <Sparkles size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Reservations Table / Cards */}
      {loading ? (
        <div className="py-20 flex items-center justify-center text-slate-400 gap-2">
          <Loader2 size={24} className="animate-spin text-rose-500" />
          <span className="text-xs">Loading host reservations...</span>
        </div>
      ) : bookings.length === 0 ? (
        <div className="py-16 text-center border border-dashed rounded-2xl bg-slate-50/50">
          <p className="text-xs text-slate-400">No {statusFilter !== 'all' ? statusFilter : ''} reservations found.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Reservation</th>
                  <th className="py-3 px-4">Guest</th>
                  <th className="py-3 px-4">Dates & Nights</th>
                  <th className="py-3 px-4">Payout</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Property / Code */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{b.booking_code}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{b.property?.title}</div>
                    </td>

                    {/* Guest */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{b.guest?.name || 'Guest'}</div>
                      <div className="text-[11px] text-slate-400">{b.guest?.email}</div>
                    </td>

                    {/* Dates */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{b.check_in} → {b.check_out}</div>
                      <div className="text-[11px] text-slate-500">
                        {b.nights} {b.nights === 1 ? 'night' : 'nights'} • {b.guests_count} {b.guests_count === 1 ? 'guest' : 'guests'}
                      </div>
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ${b.total_amount} {b.currency}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {b.status === 'confirmed' ? (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-full border border-emerald-200">
                          Confirmed
                        </span>
                      ) : b.status === 'pending' ? (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold rounded-full border border-amber-200">
                          Pending Approval
                        </span>
                      ) : b.status === 'completed' ? (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-full border border-blue-200">
                          Completed
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-full border border-rose-200">
                          Cancelled
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {b.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              disabled={actionLoadingId === b.id}
                              onClick={() => handleAccept(b.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                              title="Accept reservation"
                            >
                              <Check size={13} /> Accept
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === b.id}
                              onClick={() => handleReject(b.id)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                              title="Decline reservation"
                            >
                              <X size={13} /> Decline
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedBooking(b)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                          title="View voucher & details"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Voucher Modal */}
      <BookingDetailsModal
        booking={selectedBooking}
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />
    </div>
  );
};
