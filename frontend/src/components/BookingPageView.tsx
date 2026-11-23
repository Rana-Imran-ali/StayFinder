import React, { useState, useEffect } from 'react';
import type { Property } from '../types/property';
import type { PricingBreakdown } from '../types/pricing';
import type { Booking } from '../types/booking';
import { pricingApi } from '../services/pricingApi';
import { bookingApi } from '../services/bookingApi';
import { paymentApi } from '../services/paymentApi';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getSafePropertyImageUrl, DEFAULT_PROPERTY_FALLBACK } from '../utils/dummyImages';
import {
  ShieldCheck,
  AlertCircle,
  Loader2,
  Sparkles,
  ChevronLeft,
  CheckCircle2,
  Lock,
  Star,
  MapPin,
} from 'lucide-react';

interface BookingPageViewProps {
  property: Property;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
  initialHasPet?: boolean;
  onBack: () => void;
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
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            <Lock size={15} className="text-emerald-600" />
            Credit / Debit Card (Stripe Gateway)
          </span>
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            256-Bit Encrypted
          </span>
        </div>
        <PaymentElement onReady={() => setIsElementReady(true)} />
      </div>

      <button
        type="submit"
        disabled={submitting || !stripe || !isElementReady}
        className="w-full py-4 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 active:scale-[0.99] text-white font-extrabold text-base rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            <span>Processing Payment...</span>
          </>
        ) : (
          <span>Pay & Confirm Reservation</span>
        )}
      </button>
    </form>
  );
};

export const BookingPageView: React.FC<BookingPageViewProps> = ({
  property,
  initialCheckIn,
  initialCheckOut,
  initialGuests = 1,
  initialHasPet = false,
  onBack,
  onSuccess,
}) => {
  // Default smart dates (tomorrow -> +3 days)
  const getDefaultDates = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const inDateStr = tomorrow.toISOString().split('T')[0];

    const checkout = new Date(tomorrow);
    checkout.setDate(tomorrow.getDate() + 3);
    const outDateStr = checkout.toISOString().split('T')[0];

    return { inDateStr, outDateStr };
  };

  const defaults = getDefaultDates();
  const [checkInDate, setCheckInDate] = useState(initialCheckIn || defaults.inDateStr);
  const [checkOutDate, setCheckOutDate] = useState(initialCheckOut || defaults.outDateStr);
  const [guestCount, setGuestCount] = useState(initialGuests);
  const [hasPet, setHasPet] = useState(initialHasPet);
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMode, setPaymentMode] = useState<'stripe' | 'demo'>('stripe');
  const [agreedToRules, setAgreedToRules] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  // Pricing breakdown state
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  // Stripe state
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);

  // 1. Calculate pricing whenever dates or guests change
  useEffect(() => {
    if (!property || !checkInDate || !checkOutDate) return;

    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      setError('Check-out date must be after check-in date.');
      return;
    }

    let isMounted = true;
    const fetchPricing = async () => {
      setPricingLoading(true);
      setError(null);
      try {
        const res = await pricingApi.checkAvailability(property.id, {
          check_in: checkInDate,
          check_out: checkOutDate,
          guests: guestCount,
          has_pet: hasPet,
        });

        if (!isMounted) return;

        if (res.success && res.data?.breakdown) {
          setPricing(res.data.breakdown);
        } else {
          // Fallback pricing calculation
          const n = Math.max(
            1,
            Math.round(
              (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          );
          const base = n * Number(property.price_per_night);
          const clean = Number(property.cleaning_fee) || 0;
          setPricing({
            nights: n,
            base_total: base,
            cleaning_fee: clean,
            pet_fee: 0,
            extra_guest_fee: 0,
            discount_amount: 0,
            tax_percent: 0,
            tax_amount: 0,
            total: base + clean,
            currency: property.currency || 'USD',
            available: true,
          });
        }
      } catch {
        if (!isMounted) return;
        const n = Math.max(
          1,
          Math.round(
            (new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );
        const base = n * Number(property.price_per_night);
        const clean = Number(property.cleaning_fee) || 0;
        setPricing({
          nights: n,
          base_total: base,
          cleaning_fee: clean,
          pet_fee: 0,
          extra_guest_fee: 0,
          discount_amount: 0,
          tax_percent: 0,
          tax_amount: 0,
          total: base + clean,
          currency: property.currency || 'USD',
          available: true,
        });
      } finally {
        if (isMounted) setPricingLoading(false);
      }
    };

    fetchPricing();
    return () => {
      isMounted = false;
    };
  }, [property?.id, checkInDate, checkOutDate, guestCount, hasPet]);

  // 2. Initialize Stripe and create PaymentIntent
  useEffect(() => {
    if (!property || !checkInDate || !checkOutDate) return;

    let isMounted = true;
    const setupStripe = async () => {
      setLoadingIntent(true);
      setError(null);
      try {
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
  }, [property?.id, checkInDate, checkOutDate, guestCount, hasPet]);

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

  // Image fallback
  const rawCoverImage =
    property.images && property.images.length > 0
      ? property.images.find((img) => img.is_primary)?.image_path || property.images[0].image_path
      : null;
  const imageUrl = getSafePropertyImageUrl(rawCoverImage, property.id, property.property_type);

  // Confirmation View
  if (completedBooking) {
    return (
      <div className="portal-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center shadow-xl border border-slate-200 space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Sparkles size={40} />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-700 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-200">
              Reservation Confirmed
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 mt-3">You are all set!</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Your reservation at <strong>{property.title}</strong> has been secured and confirmed.
            </p>
          </div>

          {/* Booking Voucher Summary */}
          <div className="max-w-md mx-auto p-5 bg-slate-50 border border-slate-200 rounded-2xl text-left space-y-3.5 shadow-sm">
            <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-200 pb-2.5">
              <span>Confirmation Reference</span>
              <span className="font-mono font-extrabold text-slate-900 text-sm">
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
              <span className="text-slate-500">Guests</span>
              <span className="font-semibold text-slate-800">
                {completedBooking.guests_count} {completedBooking.guests_count === 1 ? 'Guest' : 'Guests'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Payment Gateway</span>
              <span className="font-semibold text-slate-800 capitalize">
                {completedBooking.transactions?.[0]?.payment_gateway || 'Stripe'}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs border-t border-slate-200 pt-2.5">
              <span className="text-slate-700 font-bold">Total Paid</span>
              <span className="font-extrabold text-emerald-600 text-base">
                ${completedBooking.total_amount} {completedBooking.currency}
              </span>
            </div>
          </div>

          <div className="pt-4 flex justify-center gap-4">
            <button
              type="button"
              onClick={() => onSuccess(completedBooking)}
              className="px-8 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2"
            >
              <CheckCircle2 size={18} />
              View Reservation in My Trips
            </button>
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all"
            >
              Explore More Stays
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-container" style={{ maxWidth: '1180px', margin: '2rem auto', padding: '0 1.5rem' }}>
      {/* Navigation header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2.5 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-full shadow-sm transition-all"
          title="Back to stays"
        >
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Confirm and pay</h1>
          <p className="text-xs text-slate-500 mt-0.5">Secure payment & instant reservation confirmation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols): Trip details & Stripe payment */}
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2.5">
              <AlertCircle size={18} className="shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Trip dates and guests */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <h2 className="text-lg font-extrabold text-slate-900 border-b border-slate-100 pb-3">
              Your trip
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Dates
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Guests
                </label>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {Array.from({ length: property.max_guests || 6 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                Bringing a pet?
              </span>
              <input
                type="checkbox"
                checked={hasPet}
                onChange={(e) => setHasPet(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Message to Host (optional)
              </label>
              <textarea
                rows={2}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Let your host know your arrival time or any special requests..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              />
            </div>
          </div>

          {/* Section 2: Payment method selector */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900">Payment method</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('stripe')}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                    paymentMode === 'stripe'
                      ? 'bg-rose-50 text-rose-600 border border-rose-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Stripe Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('demo')}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                    paymentMode === 'demo'
                      ? 'bg-rose-50 text-rose-600 border border-rose-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Instant Demo
                </button>
              </div>
            </div>

            {/* Stripe Card Element Form */}
            {paymentMode === 'stripe' ? (
              loadingIntent ? (
                <div className="p-8 border border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-500 bg-slate-50/50">
                  <Loader2 size={26} className="animate-spin text-rose-500" />
                  <span className="text-xs font-semibold">Connecting to Stripe secure gateway...</span>
                </div>
              ) : stripePromise && clientSecret ? (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                    <div className="flex items-center gap-2">
                      <Lock size={14} className="text-blue-600 shrink-0" />
                      <span>
                        <strong>Test Card:</strong>{' '}
                        <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono font-bold">
                          4242 •••• •••• 4242
                        </code>
                      </span>
                    </div>
                    <span className="text-[11px] text-blue-700 font-medium">Any future Exp & 3-digit CVC</span>
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
                <div className="p-5 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs space-y-2">
                  <p className="font-semibold">Stripe is in demo mode or keys are initializing.</p>
                  <p>Switch to "Instant Demo" above to confirm the reservation immediately!</p>
                </div>
              )
            ) : (
              /* Demo Payment Option */
              <form onSubmit={handleDemoBooking} className="space-y-4">
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Instant Demo Mode Active
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Instantly creates a confirmed reservation in your database without charging a real card. Ideal for testing full booking and host flows.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-base rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Creating Reservation...</span>
                    </>
                  ) : (
                    <span>Confirm Booking (Demo Mode)</span>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Section 3: Ground Rules & Cancellation Policy */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs text-slate-600">
            <h3 className="font-bold text-sm text-slate-900">Ground rules & policy</h3>
            <ul className="space-y-2 list-disc pl-4 text-slate-500">
              <li>Follow the host’s house rules (quiet hours, no smoking indoors).</li>
              <li>Treat the home with respect, as if it were your own.</li>
              <li>
                <strong>Cancellation policy:</strong>{' '}
                {property.cancellation_policy
                  ? property.cancellation_policy.charAt(0).toUpperCase() +
                    property.cancellation_policy.slice(1)
                  : 'Flexible'}{' '}
                — full refund up to 48 hours before check-in.
              </li>
            </ul>

            <label className="flex items-start gap-2.5 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToRules}
                onChange={(e) => setAgreedToRules(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 mt-0.5 focus:ring-rose-500"
              />
              <span>I agree to the House Rules, Ground Rules for guests, and Cancellation Policy.</span>
            </label>
          </div>
        </div>

        {/* Right Column (5 cols): Floating Property Summary & Price Breakdown */}
        <div className="lg:col-span-5 sticky top-24">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 space-y-5">
            {/* Property preview snippet */}
            <div className="flex gap-4 items-center pb-5 border-b border-slate-100">
              <img
                src={imageUrl}
                alt={property.title}
                className="w-24 h-24 rounded-2xl object-cover shrink-0 shadow-sm"
                onError={(e) => {
                  if (e.currentTarget.src !== DEFAULT_PROPERTY_FALLBACK) {
                    e.currentTarget.src = DEFAULT_PROPERTY_FALLBACK;
                  }
                }}
              />
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                  {property.property_type}
                </span>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                  {property.title}
                </h3>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <MapPin size={12} />
                  <span>
                    {property.city}, {property.country}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <Star size={13} fill="#f59e0b" color="#f59e0b" />
                  <span>{(property as any).avg_rating > 0 ? (property as any).avg_rating : 'New'}</span>
                  <span className="text-slate-400">
                    ({(property as any).reviews_count ?? 0} reviews)
                  </span>
                </div>
              </div>
            </div>

            {/* Price Details Breakdown */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Price details</h4>

              {pricingLoading ? (
                <div className="py-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin text-rose-500" />
                  <span>Calculating rates...</span>
                </div>
              ) : pricing ? (
                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>
                      ${property.price_per_night} × {pricing.nights} nights
                    </span>
                    <span>${pricing.base_total}</span>
                  </div>

                  {(pricing.cleaning_fee ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Cleaning fee</span>
                      <span>${pricing.cleaning_fee}</span>
                    </div>
                  )}

                  {(pricing.pet_fee ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Pet fee</span>
                      <span>${pricing.pet_fee}</span>
                    </div>
                  )}

                  {(pricing.extra_guest_fee ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Extra guest fee</span>
                      <span>${pricing.extra_guest_fee}</span>
                    </div>
                  )}

                  {(pricing.discount_amount ?? 0) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>{pricing.discount_label || 'Special discount'}</span>
                      <span>-${pricing.discount_amount}</span>
                    </div>
                  )}

                  {(pricing.tax_amount ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Taxes ({pricing.tax_percent}%)</span>
                      <span>${pricing.tax_amount}</span>
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-sm font-extrabold text-slate-900">
                    <span>Total (USD)</span>
                    <span className="text-base text-rose-600 font-extrabold">${pricing.total}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">Select dates to view price breakdown.</div>
              )}
            </div>

            {/* Protection Guarantee */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-2.5 text-[11px] text-slate-500">
              <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
              <span>
                <strong>StayFinder Protection:</strong> Guaranteed booking with instant host notification and refund protection.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
