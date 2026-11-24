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
  CreditCard,
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
        setError(stripeError.message || 'Payment processing failed. Please check your card credentials.');
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
    <form id="stripeForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="stripe-card-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <CreditCard size={16} color="#e11d48" />
            Credit / Debit Card (Stripe Gateway)
          </span>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '2px 8px', borderRadius: '6px' }}>
            🔒 256-Bit SSL Encrypted
          </span>
        </div>

        <PaymentElement onReady={() => setIsElementReady(true)} />
      </div>

      <button
        type="submit"
        disabled={submitting || !stripe || !isElementReady}
        className="booking-pay-btn"
      >
        {submitting ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            <span>Authorizing Payment...</span>
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
  // Default smart dates: tomorrow -> +3 days
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
  const [agreedToRules, setAgreedToRules] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datesUnavailable, setDatesUnavailable] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<Booking | null>(null);

  // Pricing breakdown state
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);

  // Stripe state
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);

  // Advance dates by 4 days if dates are blocked
  const advanceToNextAvailableDates = () => {
    const cur = new Date(checkInDate);
    const nextIn = new Date(cur);
    nextIn.setDate(cur.getDate() + 4);
    const nextOut = new Date(nextIn);
    nextOut.setDate(nextIn.getDate() + 3);

    setCheckInDate(nextIn.toISOString().split('T')[0]);
    setCheckOutDate(nextOut.toISOString().split('T')[0]);
    setError(null);
    setDatesUnavailable(false);
  };

  // Coordinated Availability, Pricing & Stripe PaymentIntent Setup
  useEffect(() => {
    if (!property || !checkInDate || !checkOutDate) return;

    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      setError('Check-out date must be after check-in date.');
      setDatesUnavailable(true);
      return;
    }

    let isMounted = true;

    const loadStayAndPayment = async () => {
      setPricingLoading(true);
      setLoadingIntent(true);
      setError(null);
      setDatesUnavailable(false);

      try {
        // Step 1: Check availability and calculate live rates
        const res = await pricingApi.checkAvailability(property.id, {
          check_in: checkInDate,
          check_out: checkOutDate,
          guests: guestCount,
          has_pet: hasPet,
        });

        if (!isMounted) return;

        if (res.success && res.data?.breakdown) {
          setPricing(res.data.breakdown);
          if (res.data.breakdown.available === false) {
            setDatesUnavailable(true);
            setError('The selected dates are already booked or blocked by the host. Please select different dates.');
            setLoadingIntent(false);
            setPricingLoading(false);
            return;
          }
        } else if (res.message && (res.message.includes('unavailable') || res.message.includes('blocked') || res.message.includes('booked'))) {
          setDatesUnavailable(true);
          setError(res.message);
          setLoadingIntent(false);
          setPricingLoading(false);
          return;
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

        // Step 2: Initialize Stripe publishable key
        let pubKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
        if (!pubKey) {
          const cfg: any = await paymentApi.getConfig();
          pubKey = cfg.publishable_key || cfg.data?.publishable_key;
        }

        if (pubKey) {
          setStripePromise(loadStripe(pubKey));
        }

        // Step 3: Create Stripe PaymentIntent on backend
        const intentRes: any = await paymentApi.createPaymentIntent({
          property_id: property.id,
          check_in: checkInDate,
          check_out: checkOutDate,
          guests_count: guestCount,
          has_pet: hasPet,
        });

        if (!isMounted) return;

        const secret = intentRes.client_secret || intentRes.data?.client_secret;
        if (secret) {
          setClientSecret(secret);
          setError(null);
        } else {
          const msg = intentRes.message || 'Unable to connect to Stripe payment gateway.';
          if (msg.includes('unavailable') || msg.includes('blocked')) {
            setDatesUnavailable(true);
          }
          setError(msg);
        }
      } catch (err: any) {
        if (!isMounted) return;
        const msg = err.message || 'Could not connect to payment gateway.';
        if (msg.includes('unavailable') || msg.includes('blocked')) {
          setDatesUnavailable(true);
        }
        setError(msg);
      } finally {
        if (isMounted) {
          setPricingLoading(false);
          setLoadingIntent(false);
        }
      }
    };

    loadStayAndPayment();

    return () => {
      isMounted = false;
    };
  }, [property?.id, checkInDate, checkOutDate, guestCount, hasPet]);

  // Image fallback
  const rawCoverImage =
    property.images && property.images.length > 0
      ? property.images.find((img) => img.is_primary)?.image_path || property.images[0].image_path
      : null;
  const imageUrl = getSafePropertyImageUrl(rawCoverImage, property.id, property.property_type);

  // Confirmation View
  if (completedBooking) {
    return (
      <div className="booking-portal-container" style={{ maxWidth: '780px', margin: '3rem auto' }}>
        <div className="booking-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              background: '#ecfdf5',
              color: '#059669',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto',
            }}
          >
            <Sparkles size={36} />
          </div>

          <span className="stripe-ssl-badge" style={{ marginBottom: '0.75rem' }}>
            Reservation Confirmed & Paid
          </span>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem' }}>
            You are all set!
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '440px', margin: '0.5rem auto 1.5rem auto' }}>
            Your reservation at <strong>{property.title}</strong> has been secured and confirmed.
          </p>

          {/* Booking Summary Box */}
          <div
            style={{
              maxWidth: '460px',
              margin: '0 auto 2rem auto',
              padding: '1.25rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Confirmation Code</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a' }}>
                {completedBooking.booking_code}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#64748b' }}>Dates</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                {completedBooking.check_in} → {completedBooking.check_out} ({completedBooking.nights} nights)
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#64748b' }}>Guests</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                {completedBooking.guests_count} {completedBooking.guests_count === 1 ? 'Guest' : 'Guests'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#64748b' }}>Payment Gateway</span>
              <span style={{ fontWeight: 600, color: '#0f172a', textTransform: 'capitalize' }}>
                {completedBooking.transactions?.[0]?.payment_gateway || 'Stripe'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0', fontWeight: 800, fontSize: '0.95rem' }}>
              <span style={{ color: '#0f172a' }}>Total Paid</span>
              <span style={{ color: '#059669', fontSize: '1.1rem' }}>
                ${completedBooking.total_amount} {completedBooking.currency}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onSuccess(completedBooking)}
              className="booking-pay-btn"
              style={{ width: 'auto', padding: '0.85rem 1.75rem' }}
            >
              <CheckCircle2 size={18} />
              View Reservation in My Trips
            </button>
            <button
              type="button"
              onClick={onBack}
              style={{
                padding: '0.85rem 1.5rem',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '16px',
                fontWeight: 700,
                fontSize: '0.9rem',
                color: '#334155',
              }}
            >
              Explore More Stays
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-portal-container">
      {/* Navigation header */}
      <div className="booking-header-bar">
        <button onClick={onBack} className="booking-back-btn" title="Back to stays">
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Confirm and pay
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.15rem' }}>
            Secure card payment powered by Stripe & instant reservation confirmation
          </p>
        </div>
      </div>

      <div className="booking-page-grid">
        {/* Left Column: Trip details & Stripe Card Element */}
        <div className="booking-main-col">
          {error && (
            <div className={datesUnavailable ? 'booking-alert-warning' : 'booking-alert-error'}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span>{error}</span>
                {datesUnavailable && (
                  <button
                    type="button"
                    onClick={advanceToNextAvailableDates}
                    style={{
                      padding: '0.35rem 0.75rem',
                      background: '#b45309',
                      color: '#ffffff',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    Next Open Dates →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Section 1: Trip dates and guests */}
          <div className="booking-card">
            <div className="booking-card-header">
              <h2 className="booking-card-title">Your trip</h2>
            </div>

            <div className="booking-form-grid" style={{ marginBottom: '1.25rem' }}>
              <div>
                <label className="booking-field-label">Dates (Check-in → Check-out)</label>
                <div className="booking-dates-row">
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="booking-input"
                  />
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="booking-input"
                  />
                </div>
              </div>

              <div>
                <label className="booking-field-label">Guests</label>
                <select
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value))}
                  className="booking-select"
                >
                  {Array.from({ length: property.max_guests || 6 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'Guest' : 'Guests'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderTop: '1px solid #f1f5f9', fontSize: '0.85rem', color: '#475569' }}>
              <span>Bringing a pet?</span>
              <input
                type="checkbox"
                checked={hasPet}
                onChange={(e) => setHasPet(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#ff385c', cursor: 'pointer' }}
              />
            </div>

            <div style={{ paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
              <label className="booking-field-label">Message to Host (optional)</label>
              <textarea
                rows={2}
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Let your host know your arrival time or any special requests..."
                className="booking-textarea"
                style={{ resize: 'none' }}
              />
            </div>
          </div>

          {/* Section 2: Real Stripe Credit/Debit Card Form */}
          <div className="booking-card">
            <div className="booking-card-header">
              <div>
                <h2 className="booking-card-title">Payment details</h2>
                <p className="booking-card-subtitle">Pay securely with Credit / Debit card powered by Stripe</p>
              </div>
              <div className="stripe-ssl-badge">
                <ShieldCheck size={14} /> Stripe Protected
              </div>
            </div>

            {datesUnavailable ? (
              <div style={{ padding: '1.5rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '16px', color: '#92400e', fontSize: '0.85rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                <p style={{ fontWeight: 700 }}>Dates unavailable for this property</p>
                <p style={{ fontSize: '0.78rem', color: '#b45309' }}>
                  Please select open dates in the "Your trip" section above to load the secure card payment form.
                </p>
                <button
                  type="button"
                  onClick={advanceToNextAvailableDates}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#d97706',
                    color: '#ffffff',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                  }}
                >
                  Jump to Next Available Dates
                </button>
              </div>
            ) : loadingIntent ? (
              <div style={{ padding: '2.5rem', border: '1px dashed #cbd5e1', borderRadius: '16px', textAlign: 'center', background: '#f8fafc', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <Loader2 size={28} className="animate-spin text-rose-500" />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Connecting to Stripe secure gateway...</span>
              </div>
            ) : stripePromise && clientSecret ? (
              <div>
                <div className="stripe-info-pill">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lock size={14} color="#2563eb" />
                    <span><strong>Enter your card credentials below:</strong></span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600 }}>Stripe SSL 256-Bit</span>
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
              <div style={{ padding: '1.25rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', color: '#991b1b', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <p style={{ fontWeight: 700 }}>Unable to load Stripe payment form.</p>
                <p>{error || 'Please check your connection or verify Stripe credentials.'}</p>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setLoadingIntent(true);
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    padding: '0.5rem 1rem',
                    background: '#e11d48',
                    color: '#ffffff',
                    borderRadius: '10px',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                  }}
                >
                  Retry Stripe Connection
                </button>
              </div>
            )}
          </div>

          {/* Section 3: Ground Rules & Cancellation Policy */}
          <div className="booking-card" style={{ fontSize: '0.82rem', color: '#475569' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
              Ground rules & cancellation policy
            </h3>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', color: '#64748b', marginBottom: '1rem' }}>
              <li>Follow the host’s house rules (quiet hours, no smoking indoors).</li>
              <li>Treat the home with respect, as if it were your own.</li>
              <li>
                <strong>Cancellation policy:</strong>{' '}
                {property.cancellation_policy
                  ? property.cancellation_policy.charAt(0).toUpperCase() + property.cancellation_policy.slice(1)
                  : 'Flexible'}{' '}
                — full refund up to 48 hours before check-in.
              </li>
            </ul>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
              <input
                type="checkbox"
                checked={agreedToRules}
                onChange={(e) => setAgreedToRules(e.target.checked)}
                style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#ff385c', cursor: 'pointer' }}
              />
              <span>I agree to the House Rules, Ground Rules for guests, and Cancellation Policy.</span>
            </label>
          </div>
        </div>

        {/* Right Column: Sticky Property Summary & Live Price Breakdown */}
        <div>
          <div className="booking-summary-card">
            {/* Property preview snippet */}
            <div className="booking-prop-snippet">
              <img
                src={imageUrl}
                alt={property.title}
                className="booking-prop-img"
                onError={(e) => {
                  if (e.currentTarget.src !== DEFAULT_PROPERTY_FALLBACK) {
                    e.currentTarget.src = DEFAULT_PROPERTY_FALLBACK;
                  }
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#e11d48', background: '#fff1f2', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                  {property.property_type}
                </span>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                  {property.title}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: '#64748b' }}>
                  <MapPin size={12} />
                  <span>{property.city}, {property.country}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>
                  <Star size={12} fill="#f59e0b" color="#f59e0b" />
                  <span>{(property as any).avg_rating > 0 ? (property as any).avg_rating : 'New'}</span>
                  <span style={{ color: '#94a3b8' }}>({(property as any).reviews_count ?? 0} reviews)</span>
                </div>
              </div>
            </div>

            {/* Price Breakdown */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.75rem' }}>
                Price details
              </h4>

              {pricingLoading ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Loader2 size={16} className="animate-spin text-rose-500" />
                  <span>Calculating rates...</span>
                </div>
              ) : pricing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div className="booking-price-line">
                    <span>${property.price_per_night} × {pricing.nights} nights</span>
                    <span>${pricing.base_total}</span>
                  </div>

                  {(pricing.cleaning_fee ?? 0) > 0 && (
                    <div className="booking-price-line">
                      <span>Cleaning fee</span>
                      <span>${pricing.cleaning_fee}</span>
                    </div>
                  )}

                  {(pricing.pet_fee ?? 0) > 0 && (
                    <div className="booking-price-line">
                      <span>Pet fee</span>
                      <span>${pricing.pet_fee}</span>
                    </div>
                  )}

                  {(pricing.extra_guest_fee ?? 0) > 0 && (
                    <div className="booking-price-line">
                      <span>Extra guest fee</span>
                      <span>${pricing.extra_guest_fee}</span>
                    </div>
                  )}

                  {(pricing.discount_amount ?? 0) > 0 && (
                    <div className="booking-price-line" style={{ color: '#059669', fontWeight: 700 }}>
                      <span>{pricing.discount_label || 'Discount'}</span>
                      <span>-${pricing.discount_amount}</span>
                    </div>
                  )}

                  {(pricing.tax_amount ?? 0) > 0 && (
                    <div className="booking-price-line">
                      <span>Taxes ({pricing.tax_percent}%)</span>
                      <span>${pricing.tax_amount}</span>
                    </div>
                  )}

                  <div className="booking-total-line">
                    <span>Total (USD)</span>
                    <span className="booking-total-amount">${pricing.total}</span>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Select dates to view price breakdown.</div>
              )}
            </div>

            {/* StayFinder Protection Guarantee */}
            <div style={{ padding: '0.85rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.75rem', color: '#64748b' }}>
              <ShieldCheck size={18} color="#059669" style={{ flexShrink: 0 }} />
              <span>
                <strong>StayFinder Protection:</strong> Guaranteed booking with encrypted Stripe payment & refund protection.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
