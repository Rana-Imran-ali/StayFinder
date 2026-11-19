import React, { useState } from 'react';
import type { Property } from '../types/property';
import type { PricingBreakdown } from '../types/pricing';
import type { Booking } from '../types/booking';
import { bookingApi } from '../services/bookingApi';
import {
  X,
  Calendar,
  Users,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sparkles,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';

interface CheckoutModalProps {
  property: Property;
  pricing: PricingBreakdown;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  hasPet: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (booking: Booking) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  property,
  pricing,
  checkInDate,
  checkOutDate,
  guestCount,
  hasPet,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet' | 'demo'>('card');
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  if (!isOpen) return null;

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToRules) {
      setError('Please agree to the ground rules and cancellation policy to proceed.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await bookingApi.createBooking({
        property_id: property.id,
        check_in: checkInDate,
        check_out: checkOutDate,
        guests_count: guestCount,
        has_pet: hasPet,
        special_requests: specialRequests || undefined,
        payment_method: paymentMethod,
      });

      if (res.success && res.data) {
        setCompletedBooking(res.data);
      } else {
        setError(res.message || 'Unable to complete reservation.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to complete booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Resolve cover image
  const coverImage = property.images && property.images.length > 0
    ? (property.images.find((img) => img.is_primary)?.image_path || property.images[0].image_path)
    : 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80';
  const imageUrl = coverImage.startsWith('http') ? coverImage : `/storage/${coverImage}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
            <h2 className="text-xl font-extrabold text-slate-900">
              {completedBooking ? 'Booking Confirmed!' : property.instant_bookable ? 'Confirm and Pay' : 'Request to Book'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success View */}
        {completedBooking ? (
          <div className="p-8 sm:p-12 text-center space-y-6 flex-1 overflow-y-auto">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <Sparkles size={32} />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase tracking-wider font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                {completedBooking.status === 'confirmed' ? 'Reservation Confirmed' : 'Request Submitted'}
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-2">
                {completedBooking.status === 'confirmed' ? 'You are all set!' : 'Host notified!'}
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                {completedBooking.status === 'confirmed'
                  ? 'Your reservation has been locked and confirmed. Safe travels!'
                  : 'Your request has been sent to the host. You will receive an update once confirmed.'}
              </p>
            </div>

            {/* Voucher preview snippet */}
            <div className="max-w-md mx-auto p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3">
              <div className="flex justify-between items-center text-xs text-slate-500 border-b pb-2">
                <span>Confirmation Code</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {completedBooking.booking_code}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Dates</span>
                <span className="font-semibold text-slate-800">
                  {completedBooking.check_in} → {completedBooking.check_out} ({completedBooking.nights} nights)
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Total Charged</span>
                <span className="font-extrabold text-slate-900 text-sm">
                  ${completedBooking.total_amount} {completedBooking.currency}
                </span>
              </div>
            </div>

            <div className="pt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (completedBooking) {
                    onSuccess(completedBooking);
                  }
                  onClose();
                }}
                className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <CheckCircle2 size={18} />
                Done & View Trips
              </button>
            </div>
          </div>
        ) : (
          /* Normal Checkout View */
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left 7 Columns: Form & Rules */}
            <form id="checkoutForm" onSubmit={handleConfirmBooking} className="md:col-span-7 space-y-6">
              {/* Error Notice */}
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Trip Summary Card */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900">Your Trip</h3>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm">
                  <div className="flex items-center gap-3">
                    <Calendar size={18} className="text-slate-400" />
                    <div>
                      <div className="font-bold text-slate-800">Dates</div>
                      <div className="text-xs text-slate-500">
                        {checkInDate} to {checkOutDate} ({pricing.nights} nights)
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-sm">
                  <div className="flex items-center gap-3">
                    <Users size={18} className="text-slate-400" />
                    <div>
                      <div className="font-bold text-slate-800">Guests</div>
                      <div className="text-xs text-slate-500">
                        {guestCount} {guestCount === 1 ? 'guest' : 'guests'}
                        {hasPet ? ' • Bringing a pet' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Section */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard size={18} className="text-rose-600" />
                  Payment Method
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3.5 rounded-2xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                      paymentMethod === 'card'
                        ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500 text-slate-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span>Credit / Debit Card</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">Demo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallet')}
                    className={`p-3.5 rounded-2xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                      paymentMethod === 'wallet'
                        ? 'border-rose-500 bg-rose-50/40 ring-1 ring-rose-500 text-slate-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span>Digital Wallet</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">Fast</span>
                  </button>
                </div>
              </div>

              {/* Message to Host */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <label className="text-sm font-bold text-slate-900 block">
                  Message the host <span className="text-xs font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Let the host know about your travel plans or arrival time..."
                  className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Ground Rules & Policies */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Ground Rules</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  We ask every guest to remember a few simple things about what makes a great guest:
                  follow the house rules, treat the host’s home like your own, and leave the space in good condition.
                </p>

                <label className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={agreedToRules}
                    onChange={(e) => setAgreedToRules(e.target.checked)}
                    className="w-4 h-4 accent-rose-600 rounded mt-0.5 shrink-0"
                  />
                  <span>
                    I agree to the <strong>House Rules</strong>, cancellation policy, and StayFinder Guest Refund Policy.
                  </span>
                </label>
              </div>
            </form>

            {/* Right 5 Columns: Price Summary Card */}
            <div className="md:col-span-5">
              <div className="p-5 bg-slate-50/70 border border-slate-200 rounded-3xl space-y-5 sticky top-0">
                {/* Property Card Header */}
                <div className="flex gap-3 pb-4 border-b border-slate-200">
                  <img
                    src={imageUrl}
                    alt={property.title}
                    className="w-20 h-20 object-cover rounded-2xl border shrink-0"
                  />
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-400 font-semibold uppercase">
                      {property.property_type}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 line-clamp-2">
                      {property.title}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {property.city}, {property.country}
                    </p>
                  </div>
                </div>

                {/* Price Details */}
                <div className="space-y-2.5 text-xs text-slate-600">
                  <h4 className="font-bold text-slate-900 text-sm">Price details</h4>

                  <div className="flex justify-between">
                    <span>${pricing.base_total ? Math.round(pricing.base_total / (pricing.nights || 1)) : property.price_per_night} × {pricing.nights} nights</span>
                    <span className="font-semibold text-slate-800">${pricing.base_total}</span>
                  </div>

                  {Number(pricing.cleaning_fee) > 0 && (
                    <div className="flex justify-between">
                      <span>Cleaning fee</span>
                      <span className="font-semibold text-slate-800">${pricing.cleaning_fee}</span>
                    </div>
                  )}

                  {Number(pricing.extra_guest_fee) > 0 && (
                    <div className="flex justify-between">
                      <span>Extra guest fee</span>
                      <span className="font-semibold text-slate-800">${pricing.extra_guest_fee}</span>
                    </div>
                  )}

                  {Number(pricing.pet_fee) > 0 && (
                    <div className="flex justify-between">
                      <span>Pet fee</span>
                      <span className="font-semibold text-slate-800">${pricing.pet_fee}</span>
                    </div>
                  )}

                  {Number(pricing.discount_amount) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>{pricing.discount_label || 'Stay discount'}</span>
                      <span>-${pricing.discount_amount}</span>
                    </div>
                  )}

                  {Number(pricing.tax_amount) > 0 && (
                    <div className="flex justify-between">
                      <span>Occupancy taxes</span>
                      <span className="font-semibold text-slate-800">${pricing.tax_amount}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-sm font-extrabold text-slate-900">
                    <span>Total (USD)</span>
                    <span className="text-lg">${pricing.total}</span>
                  </div>

                  {Number(pricing.security_deposit) > 0 && (
                    <div className="text-[10px] text-slate-400 text-right">
                      Includes ${pricing.security_deposit} refundable deposit
                    </div>
                  )}
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  form="checkoutForm"
                  disabled={submitting || !agreedToRules}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-rose-200 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Processing Reservation...</span>
                    </>
                  ) : (
                    <span>{property.instant_bookable ? 'Confirm and Pay' : 'Submit Reservation Request'}</span>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span>Secure demo checkout with instant confirmation</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
