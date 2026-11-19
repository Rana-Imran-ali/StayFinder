import React, { useState } from 'react';
import type { Booking } from '../types/booking';
import { bookingApi } from '../services/bookingApi';
import {
  X,
  Calendar,
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  Ban,
  Receipt,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface BookingDetailsModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onBookingCancelled?: (updated: Booking) => void;
}

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  booking,
  isOpen,
  onClose,
  onBookingCancelled,
}) => {
  const [cancelling, setCancelling] = useState(false);
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !booking) return null;

  const property = booking.property;
  const isCancellable = ['confirmed', 'pending'].includes(booking.status) &&
    new Date(booking.check_in) >= new Date(new Date().toDateString());

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setError('Please provide a reason for cancelling your reservation.');
      return;
    }

    setCancelling(true);
    setError(null);
    try {
      const res = await bookingApi.cancelBooking(booking.id, cancelReason);
      if (res.success && res.data) {
        setShowCancelPrompt(false);
        if (onBookingCancelled) onBookingCancelled(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel reservation.');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = () => {
    switch (booking.status) {
      case 'confirmed':
        return (
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Confirmed
          </span>
        );
      case 'pending':
        return (
          <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold flex items-center gap-1.5">
            <Clock size={14} /> Awaiting Host Confirmation
          </span>
        );
      case 'completed':
        return (
          <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Completed Stay
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold flex items-center gap-1.5">
            <Ban size={14} /> Cancelled
          </span>
        );
      case 'rejected':
        return (
          <span className="px-3 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-xs font-bold flex items-center gap-1.5">
            <Ban size={14} /> Declined
          </span>
        );
      default:
        return null;
    }
  };

  const coverImage = property?.images && property.images.length > 0
    ? (property.images.find((img) => img.is_primary)?.image_path || property.images[0].image_path)
    : 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80';
  const imageUrl = coverImage.startsWith('http') ? coverImage : `/storage/${coverImage}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Reservation Voucher</div>
            <h2 className="text-lg font-extrabold text-slate-900">{booking.booking_code}</h2>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Property Banner */}
          {property && (
            <div className="flex gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <img
                src={imageUrl}
                alt={property.title}
                className="w-24 h-24 object-cover rounded-xl border shrink-0"
              />
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {property.property_type} • Hosted by {booking.host?.name || 'Superhost'}
                </span>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{property.title}</h3>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin size={13} className="text-rose-500 shrink-0" />
                  {property.address}, {property.city}, {property.country}
                </p>
              </div>
            </div>
          )}

          {/* Dates & Guests Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Calendar size={12} /> Check-In
              </span>
              <div className="text-sm font-bold text-slate-900">{booking.check_in}</div>
              <div className="text-[11px] text-slate-500">After 3:00 PM</div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Calendar size={12} /> Check-Out
              </span>
              <div className="text-sm font-bold text-slate-900">{booking.check_out}</div>
              <div className="text-[11px] text-slate-500">Before 11:00 AM</div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-0.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Users size={12} /> Occupancy
              </span>
              <div className="text-sm font-bold text-slate-900">
                {booking.guests_count} {booking.guests_count === 1 ? 'Guest' : 'Guests'}
              </div>
              <div className="text-[11px] text-slate-500">
                {booking.nights} nights {booking.has_pet ? '• Pet included' : ''}
              </div>
            </div>
          </div>

          {/* Special Requests */}
          {booking.special_requests && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <span className="font-bold text-slate-700 block">Your Notes to Host:</span>
              <p className="text-slate-600">{booking.special_requests}</p>
            </div>
          )}

          {/* Cancellation Info if cancelled */}
          {booking.status === 'cancelled' && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-1">
              <span className="font-bold flex items-center gap-1.5">
                <AlertTriangle size={14} /> Reservation Cancelled
              </span>
              <p>{booking.cancellation_reason || 'Cancelled by guest.'}</p>
              {booking.cancelled_at && (
                <div className="text-[10px] text-rose-600">On {booking.cancelled_at}</div>
              )}
            </div>
          )}

          {/* Itemized Receipt */}
          <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-2.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
              <Receipt size={14} className="text-slate-400" />
              Payment Summary
            </h4>

            <div className="flex justify-between text-xs text-slate-600">
              <span>Nightly Stay ({booking.nights} nights)</span>
              <span className="font-semibold text-slate-800">${booking.base_price}</span>
            </div>

            {booking.cleaning_fee > 0 && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>Cleaning Fee</span>
                <span className="font-semibold text-slate-800">${booking.cleaning_fee}</span>
              </div>
            )}

            {booking.extra_guest_fee > 0 && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>Extra Guest Fee</span>
                <span className="font-semibold text-slate-800">${booking.extra_guest_fee}</span>
              </div>
            )}

            {booking.pet_fee > 0 && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>Pet Fee</span>
                <span className="font-semibold text-slate-800">${booking.pet_fee}</span>
              </div>
            )}

            {booking.discount_amount > 0 && (
              <div className="flex justify-between text-xs text-emerald-600 font-semibold">
                <span>{booking.discount_label || 'Discount'}</span>
                <span>-${booking.discount_amount}</span>
              </div>
            )}

            {booking.tax_amount > 0 && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>Taxes</span>
                <span className="font-semibold text-slate-800">${booking.tax_amount}</span>
              </div>
            )}

            <div className="pt-2 border-t flex justify-between items-center text-sm font-extrabold text-slate-900">
              <span>Total Paid ({booking.currency})</span>
              <span className="text-base text-rose-600">${booking.total_amount}</span>
            </div>
          </div>

          {/* Cancel Section */}
          {isCancellable && !showCancelPrompt && (
            <div className="pt-2 flex justify-between items-center text-xs">
              <span className="text-slate-400">Plans changed?</span>
              <button
                type="button"
                onClick={() => setShowCancelPrompt(true)}
                className="text-rose-600 hover:underline font-semibold"
              >
                Cancel Reservation
              </button>
            </div>
          )}

          {showCancelPrompt && (
            <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3">
              <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-rose-600" />
                Confirm Cancellation
              </h4>
              <p className="text-xs text-slate-600">
                Are you sure you want to cancel this reservation? The dates will be released and refund will be processed according to the cancellation policy.
              </p>

              {error && <div className="text-xs text-red-600">{error}</div>}

              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation (required)..."
                className="w-full text-xs p-2.5 border rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Keep Reservation
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleCancel}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {cancelling && <Loader2 size={13} className="animate-spin" />}
                  Confirm Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all"
          >
            Close Voucher
          </button>
        </div>
      </div>
    </div>
  );
};
