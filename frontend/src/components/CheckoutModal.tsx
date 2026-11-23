import React, { useState, useEffect } from 'react';
import type { Property } from '../types/property';
import type { PricingBreakdown } from '../types/pricing';
import type { Booking } from '../types/booking';
import { bookingApi } from '../services/bookingApi';
import { paymentApi } from '../services/paymentApi';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getSafePropertyImageUrl, DEFAULT_PROPERTY_FALLBACK } from '../utils/dummyImages';
import {
  X,
  Calendar,
  Users,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sparkles,
  ChevronLeft,
  CheckCircle2,
  Lock,
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

// Subcomponent: Inner Stripe Card Form inside <Elements>
interface StripeCardFormProps {
  property: Property;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  hasPet: boolean;
  specialRequests: string;
  agreedToRules: boolean;
  submitting: boolean;
  setSubmitting: (val: boolean) => void;
  setError: (val: string | null) => void;
  onBookingCreated: (booking: Booking) => void;
}

const StripeCardForm: React.FC<StripeCardFormProps> = ({
  property,
  checkInDate,
  checkOutDate,
  guestCount,
  hasPet,
  specialRequests,
  agreedToRules,
  submitting,
  setSubmitting,
  setError,
  onBookingCreated,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isElementReady, setIsElementReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agreedToRules) {
      setError('Please agree to the ground rules and cancellation policy to proceed.');
      return;
    }

    if (!stripe || !elements) {
      setError('Stripe payment is still initializing. Please wait a moment.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Confirm payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment processing failed. Please check your card.');
        setSubmitting(false);
        return;
      }

      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        setError('Payment was not completed. Please try again.');
        setSubmitting(false);
        return;
      }

      // 2. Submit reservation to backend with confirmed payment_intent_id
      const res = await bookingApi.createBooking({
        property_id: property.id,
        check_in: checkInDate,
        check_out: checkOutDate,
        guests_count: guestCount,
        has_pet: hasPet,
        special_requests: specialRequests || undefined,
        payment_method: 'stripe_card',
        payment_intent_id: paymentIntent.id,
      });

      if (res.success && res.data) {
        onBookingCreated(res.data);
      } else {
        setError(res.message || 'Payment succeeded, but reservation creation failed. Please contact support.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during payment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form id="stripeForm" onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Lock size={13} className="text-emerald-600" />
            Secure Card Payment (Stripe)
          </span>
          <span className="text-[10px] text-slate-400 font-semibold uppercase">256-bit SSL</span>
        </div>
        <PaymentElement onReady={() => setIsElementReady(true)} />
      </div>

      <button
        type="submit"
        disabled={submitting || !stripe || !isElementReady}
        className="w-full py-4 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 active:scale-[0.99] text-white font-bold text-base rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Processing Payment...</span>
          </>
        ) : (
          <span>Pay & Confirm Reservation</span>
        )}
      </button>
    </form>
  );
};

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
  const [paymentMode, setPaymentMode] = useState<'stripe' | 'demo'>('stripe');
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  // Stripe state
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);

  // Initialize Stripe and fetch PaymentIntent when modal opens
  useEffect(() => {
    if (!isOpen || !property) return;

    let isMounted = true;

    const setupStripe = async () => {
      setLoadingIntent(true);
      setError(null);
      try {
        // 1. Get publishable key
        let pubKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
        if (!pubKey) {
          const cfg = await paymentApi.getConfig();
          if (cfg.success && cfg.data?.publishable_key) {
            pubKey = cfg.data.publishable_key;
          }
        }

        if (pubKey) {
          setStripePromise(loadStripe(pubKey));
        }

        // 2. Create PaymentIntent on backend
        const intentRes = await paymentApi.createPaymentIntent({
          property_id: property.id,
          check_in: checkInDate,
          check_out: checkOutDate,
          guests_count: guestCount,
          has_pet: hasPet,
        });

        if (!isMounted) return;

        if (intentRes.success && intentRes.data?.client_secret) {
          setClientSecret(intentRes.data.client_secret);
        } else {
          // If Stripe intent failed, fall back gracefully to demo option
          setPaymentMode('demo');
        }
      } catch (err: any) {
        console.warn('Could not initialize Stripe intent:', err);
        if (isMounted) {
          setPaymentMode('demo');
        }
      } finally {
        if (isMounted) setLoadingIntent(false);
      }
    };

    setupStripe();

    return () => {
      isMounted = false;
    };
  }, [isOpen, property?.id, checkInDate, checkOutDate, guestCount, hasPet]);

  if (!isOpen) return null;

  // Demo fallback booking handler
  const handleDemoBooking = async (e: React.FormEvent) => {
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
        payment_method: 'demo',
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

  // Resolve cover image with resilient dummy fallback
  const rawCoverImage = property.images && property.images.length > 0
    ? (property.images.find((img) => img.is_primary)?.image_path || property.images[0].image_path)
    : null;
  const imageUrl = getSafePropertyImageUrl(rawCoverImage, property.id, property.property_type);

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

            {/* Voucher preview */}
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
                <span className="text-slate-500">Payment Gateway</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {completedBooking.transactions?.[0]?.payment_gateway || 'Stripe'}
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
                  onSuccess(completedBooking);
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
            {/* Left 7 Columns: Form & Payment */}
            <div className="md:col-span-7 space-y-6">
              {/* Error Notice */}
              {error && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Trip Summary Section */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900">Your trip details</h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Dates</span>
                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 mt-1">
                      <Calendar size={13} className="text-rose-500" />
                      {checkInDate} → {checkOutDate}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {pricing.nights} night stay
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Guests</span>
                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5 mt-1">
                      <Users size={13} className="text-rose-500" />
                      {guestCount} {guestCount === 1 ? 'Guest' : 'Guests'}
                    </span>
                    {hasPet && (
                      <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">
                        Pet included
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Payment method</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('stripe')}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        paymentMode === 'stripe'
                          ? 'bg-rose-100 text-rose-700 border border-rose-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Credit Card (Stripe)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMode('demo')}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        paymentMode === 'demo'
                          ? 'bg-rose-100 text-rose-700 border border-rose-300'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Instant Demo
                    </button>
                  </div>
                </div>

                {/* Stripe Elements Form */}
                {paymentMode === 'stripe' ? (
                  loadingIntent ? (
                    <div className="p-8 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500">
                      <Loader2 size={24} className="animate-spin text-rose-500" />
                      <span className="text-xs font-semibold">Connecting to Stripe secure gateway...</span>
                    </div>
                  ) : stripePromise && clientSecret ? (
                    <div className="space-y-3">
                      <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                        <div className="flex items-center gap-2">
                          <Lock size={13} className="text-blue-600 shrink-0" />
                          <span><strong>Stripe Card Test:</strong> Use <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">4242 •••• •••• 4242</code></span>
                        </div>
                        <span className="text-[11px] text-blue-600 font-medium">Any future Exp & 3-digit CVC</span>
                      </div>
                      <Elements stripe={stripePromise} options={{ clientSecret }}>
                        <StripeCardForm
                          property={property}
                          checkInDate={checkInDate}
                          checkOutDate={checkOutDate}
                          guestCount={guestCount}
                          hasPet={hasPet}
                          specialRequests={specialRequests}
                          agreedToRules={agreedToRules}
                          submitting={submitting}
                          setSubmitting={setSubmitting}
                          setError={setError}
                          onBookingCreated={setCompletedBooking}
                        />
                      </Elements>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs">
                      Unable to initialize Stripe card form. Please use the "Instant Demo" option to book.
                    </div>
                  )
                ) : (
                  /* Demo payment option */
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <p className="text-xs text-slate-600">
                      Test instant booking authorization without charging real payment credentials.
                    </p>
                    <button
                      type="button"
                      onClick={handleDemoBooking}
                      disabled={submitting}
                      className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Confirming reservation...</span>
                        </>
                      ) : (
                        <span>Confirm Instant Booking (Demo)</span>
                      )}
                    </button>
                  </div>
                )}
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
            </div>

            {/* Right 5 Columns: Price Summary Card */}
            <div className="md:col-span-5">
              <div className="p-5 bg-slate-50/70 border border-slate-200 rounded-3xl space-y-5 sticky top-0">
                {/* Property Card Header */}
                <div className="flex gap-3 pb-4 border-b border-slate-200">
                  <img
                    src={imageUrl}
                    alt={property.title}
                    className="w-20 h-20 object-cover rounded-2xl border shrink-0 bg-slate-100"
                    onError={(e) => {
                      if (e.currentTarget.src !== DEFAULT_PROPERTY_FALLBACK) {
                        e.currentTarget.src = DEFAULT_PROPERTY_FALLBACK;
                      }
                    }}
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
                <div className="space-y-3 text-xs">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Price Details
                  </h4>

                  <div className="flex justify-between text-slate-600">
                    <span>${property.price_per_night} × {pricing.nights} nights</span>
                    <span>${pricing.base_total}</span>
                  </div>

                  {(pricing.cleaning_fee ?? 0) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Cleaning fee</span>
                      <span>${pricing.cleaning_fee}</span>
                    </div>
                  )}

                  {(pricing.pet_fee ?? 0) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Pet fee</span>
                      <span>${pricing.pet_fee}</span>
                    </div>
                  )}

                  {(pricing.extra_guest_fee ?? 0) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Extra guest fee</span>
                      <span>${pricing.extra_guest_fee}</span>
                    </div>
                  )}

                  {(pricing.discount_amount ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>{pricing.discount_label || 'Discount'}</span>
                      <span>-${pricing.discount_amount}</span>
                    </div>
                  )}

                  {(pricing.tax_amount ?? 0) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Taxes ({pricing.tax_percent}%)</span>
                      <span>${pricing.tax_amount}</span>
                    </div>
                  )}

                  {(pricing.security_deposit ?? 0) > 0 && (
                    <div className="flex justify-between text-slate-500 italic">
                      <span>Security deposit (held)</span>
                      <span>${pricing.security_deposit}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-3 flex justify-between font-extrabold text-sm text-slate-900">
                    <span>Total ({pricing.currency})</span>
                    <span className="text-rose-600">${pricing.total}</span>
                  </div>
                </div>

                {/* Protection Badge */}
                <div className="p-3 bg-white border border-slate-200 rounded-2xl flex items-start gap-2.5">
                  <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold text-slate-800 block">StayFinder Protection</span>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      Your payment is encrypted and held securely until 24 hours after check-in.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
