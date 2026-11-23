import React, { useState, useEffect } from 'react';
import type { Property } from '../types/property';
import type { PricingBreakdown } from '../types/pricing';
import type { Booking } from '../types/booking';
import { pricingApi } from '../services/pricingApi';
import { useAuth } from '../context/AuthContext';
import { CheckoutModal } from './CheckoutModal';
import { PropertyReviews } from './PropertyReviews';
import { getPropertyGalleryImages, DEFAULT_PROPERTY_FALLBACK } from '../utils/dummyImages';
import {
  X,
  MapPin,
  Users,
  Bed,
  Bath,
  Star,
  ShieldCheck,
  Check,
  Sparkles,
  Zap,
  ChevronLeft,
  ChevronRight,
  Share2,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface PropertyDetailsModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onReserveSuccess?: (property: Property) => void;
  onRequireLogin?: () => void;
  onStartBooking?: (
    property: Property,
    checkInDate: string,
    checkOutDate: string,
    guestCount: number,
    hasPet: boolean
  ) => void;
}

export const PropertyDetailsModal: React.FC<PropertyDetailsModalProps> = ({
  property,
  isOpen,
  onClose,
  onReserveSuccess,
  onRequireLogin,
  onStartBooking,
}) => {
  const { user } = useAuth();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Helper for smart default dates (tomorrow -> +3 days)
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

  const initialDates = getDefaultDates();
  const [checkInDate, setCheckInDate] = useState(initialDates.inDateStr);
  const [checkOutDate, setCheckOutDate] = useState(initialDates.outDateStr);
  const [guestCount, setGuestCount] = useState(1);
  const [hasPet, setHasPet] = useState(false);
  const [isReserved, setIsReserved] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Dynamic pricing & availability state
  const [pricingBreakdown, setPricingBreakdown] = useState<PricingBreakdown | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);

  // Reset & reinitialize dates when property opens
  useEffect(() => {
    if (isOpen && property) {
      const { inDateStr, outDateStr } = getDefaultDates();
      setCheckInDate(inDateStr);
      setCheckOutDate(outDateStr);
      setIsReserved(false);
      setIsCheckoutOpen(false);
    }
  }, [isOpen, property?.id]);

  // Auto-calculate pricing when dates/guests change
  useEffect(() => {
    if (!property || !checkInDate || !checkOutDate) {
      setPricingBreakdown(null);
      setAvailabilityError(null);
      return;
    }

    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      setAvailabilityError('Check-out date must be after check-in date.');
      setPricingBreakdown(null);
      return;
    }

    let isMounted = true;
    const calculatePricing = async () => {
      setCalculating(true);
      setAvailabilityError(null);
      try {
        const res = await pricingApi.checkAvailability(property.id, {
          check_in: checkInDate,
          check_out: checkOutDate,
          guests: guestCount,
          has_pet: hasPet,
        });

        if (!isMounted) return;

        if (res.success && res.data?.breakdown) {
          const breakdown = res.data.breakdown;
          if (!breakdown.available) {
            setAvailabilityError(
              'Selected dates include dates that are already blocked or booked.'
            );
            setPricingBreakdown(null);
          } else {
            setPricingBreakdown(breakdown);
            setAvailabilityError(null);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setAvailabilityError(err.message || 'Unable to calculate pricing for these dates.');
        setPricingBreakdown(null);
      } finally {
        if (isMounted) setCalculating(false);
      }
    };

    calculatePricing();

    return () => {
      isMounted = false;
    };
  }, [property?.id, checkInDate, checkOutDate, guestCount, hasPet]);

  if (!isOpen || !property) return null;

  // Resolve rich image list with curated dummy picture gallery
  const images: string[] = getPropertyGalleryImages(
    property.images,
    property.property_type,
    property.id
  );

  const currentImage = images[selectedImageIndex] || images[0] || DEFAULT_PROPERTY_FALLBACK;

  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Fallback initial calculation
  const nights = checkInDate && checkOutDate
    ? Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 3;
  const baseTotal = nights * Number(property.price_per_night);
  const cleaningFee = Number(property.cleaning_fee) || 0;

  const handleReserve = async () => {
    if (!user) {
      if (onRequireLogin) {
        onRequireLogin();
      } else {
        alert('Please sign in or create an account to book this stay.');
      }
      return;
    }
    if (!checkInDate || !checkOutDate) {
      setAvailabilityError('Please select both check-in and check-out dates.');
      return;
    }

    if (onStartBooking) {
      onStartBooking(property, checkInDate, checkOutDate, guestCount, hasPet);
      return;
    }

    if (!pricingBreakdown) {
      setCalculating(true);
      try {
        const res = await pricingApi.checkAvailability(property.id, {
          check_in: checkInDate,
          check_out: checkOutDate,
          guests: guestCount,
          has_pet: hasPet,
        });
        if (res.success && res.data?.breakdown) {
          setPricingBreakdown(res.data.breakdown);
          setIsCheckoutOpen(true);
        } else {
          const n = Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
          const base = n * Number(property.price_per_night);
          const clean = Number(property.cleaning_fee) || 0;
          setPricingBreakdown({
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
          setIsCheckoutOpen(true);
        }
      } catch {
        const n = Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
        const base = n * Number(property.price_per_night);
        const clean = Number(property.cleaning_fee) || 0;
        setPricingBreakdown({
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
        setIsCheckoutOpen(true);
      } finally {
        setCalculating(false);
      }
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handleBookingSuccess = (_booking: Booking) => {
    setIsReserved(true);
    setIsCheckoutOpen(false);
    onClose();
    if (onReserveSuccess) {
      onReserveSuccess(property);
    }
  };

  const formattedType =
    property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1);
  const formattedRoomType = property.room_type.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container property-details-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="modal-header-row">
          <div className="header-tags">
            <span className="badge badge-primary">{formattedType}</span>
            <span className="badge badge-secondary">{formattedRoomType}</span>
            {property.instant_bookable && (
              <span className="badge badge-accent">
                <Zap size={12} /> Instant Book
              </span>
            )}
          </div>
          <div className="header-actions">
            <button
              className="action-icon-btn"
              onClick={handleShare}
              title="Share listing"
            >
              <Share2 size={18} />
              {copiedLink && <span className="tooltip-copied">Copied!</span>}
            </button>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="modal-scroll-body">
          {/* Main Title & Rating */}
          <div className="property-title-section">
            <h1 className="property-title">{property.title}</h1>
            <div className="property-meta-row">
              <div className="rating-pill">
                <Star size={16} fill="#f59e0b" color="#f59e0b" />
                <span className="rating-score">{(property as any).avg_rating > 0 ? (property as any).avg_rating : 'New'}</span>
                <span className="review-count">({(property as any).reviews_count ?? 0} reviews)</span>
              </div>
              <span className="meta-dot">•</span>
              <div className="location-pill">
                <MapPin size={15} />
                <span>
                  {property.city ? `${property.city}, ` : ''}
                  {property.state ? `${property.state}, ` : ''}
                  {property.country || 'Global'}
                </span>
              </div>
              {property.status === 'published' && (
                <>
                  <span className="meta-dot">•</span>
                  <span className="verified-badge">
                    <ShieldCheck size={14} /> Verified Stay
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Image Gallery Hero */}
          <div className="gallery-section">
            <div className="main-image-wrapper">
              <img
                src={currentImage}
                alt={property.title}
                className="main-gallery-image"
                onError={(e) => {
                  if (e.currentTarget.src !== DEFAULT_PROPERTY_FALLBACK) {
                    e.currentTarget.src = DEFAULT_PROPERTY_FALLBACK;
                  }
                }}
              />
              {images.length > 1 && (
                <>
                  <button
                    className="gallery-nav-btn prev"
                    onClick={handlePrevImage}
                    title="Previous image"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    className="gallery-nav-btn next"
                    onClick={handleNextImage}
                    title="Next image"
                  >
                    <ChevronRight size={22} />
                  </button>
                  <div className="image-counter">
                    {selectedImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="thumbnail-strip">
                {images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    className={`thumb-btn ${idx === selectedImageIndex ? 'active' : ''}`}
                    onClick={() => setSelectedImageIndex(idx)}
                  >
                    <img
                      src={imgUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      onError={(e) => {
                        if (e.currentTarget.src !== DEFAULT_PROPERTY_FALLBACK) {
                          e.currentTarget.src = DEFAULT_PROPERTY_FALLBACK;
                        }
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Two-Column Details & Reservation Card */}
          <div className="property-columns-grid">
            {/* Left Column: Property Info & Amenities */}
            <div className="property-main-col">
              {/* Quick Specs Pill Row */}
              <div className="specs-card">
                <div className="spec-item">
                  <Users size={20} className="spec-icon" />
                  <div>
                    <span className="spec-value">{property.max_guests} Guests</span>
                    <span className="spec-label">Maximum capacity</span>
                  </div>
                </div>
                <div className="spec-divider" />
                <div className="spec-item">
                  <Bed size={20} className="spec-icon" />
                  <div>
                    <span className="spec-value">{property.bedrooms} Bedrooms</span>
                    <span className="spec-label">{property.beds} Beds total</span>
                  </div>
                </div>
                <div className="spec-divider" />
                <div className="spec-item">
                  <Bath size={20} className="spec-icon" />
                  <div>
                    <span className="spec-value">{property.bathrooms} Bathrooms</span>
                    <span className="spec-label">Full baths</span>
                  </div>
                </div>
              </div>

              {/* Host Snippet */}
              {property.host && (
                <div className="host-snippet-card">
                  <div className="host-avatar-wrapper">
                    {property.host.profile?.profile_photo ? (
                      <img
                        src={property.host.profile.profile_photo.startsWith('http')
                          ? property.host.profile.profile_photo
                          : `/storage/${property.host.profile.profile_photo}`
                        }
                        alt={property.host.name}
                        className="host-avatar"
                      />
                    ) : (
                      <div className="host-avatar-placeholder">
                        {property.host.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="host-info-text">
                    <h3>Hosted by {property.host.name}</h3>
                    <p>
                      Superhost • Fast response time (within an hour) • Verified identity
                    </p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="section-block">
                <h3 className="section-title">About this stay</h3>
                <p className="property-description-text">{property.description}</p>
              </div>

              {/* Amenities */}
              {property.amenities && property.amenities.length > 0 && (
                <div className="section-block">
                  <h3 className="section-title">What this place offers</h3>
                  <div className="amenities-grid">
                    {property.amenities.map((amenity) => (
                      <div key={amenity.id} className="amenity-pill-item">
                        <Check size={16} className="text-emerald-500" />
                        <span>{amenity.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* House Rules & Policies */}
              <div className="section-block">
                <h3 className="section-title">Stay Policies & Rules</h3>
                <div className="rules-grid">
                  <div className="rule-card">
                    <h4>Cancellation Policy</h4>
                    <p>
                      {property.cancellation_policy
                        ? property.cancellation_policy.charAt(0).toUpperCase() +
                          property.cancellation_policy.slice(1)
                        : 'Flexible'}
                    </p>
                    <span className="rule-subtext">Full refund up to 48h before check-in</span>
                  </div>
                  <div className="rule-card">
                    <h4>Check-in / Checkout</h4>
                    <p>Check-in: 3:00 PM - 9:00 PM</p>
                    <span className="rule-subtext">Checkout: 11:00 AM</span>
                  </div>
                </div>
              </div>

              {/* Guest Reviews & Ratings Section */}
              <div className="section-block">
                <PropertyReviews propertyId={property.id} hostId={property.host_id} />
              </div>
            </div>

            {/* Right Column: Reservation Booking Box */}
            <div className="property-side-col">
              <div className="sticky-booking-card">
                <div className="booking-card-header">
                  <div>
                    <span className="booking-price">${property.price_per_night}</span>
                    <span className="booking-per"> / night</span>
                  </div>
                  <div className="booking-rating">
                    <Star size={14} fill="#f59e0b" color="#f59e0b" />
                    <span>{(property as any).avg_rating > 0 ? (property as any).avg_rating : 'New'}</span>
                  </div>
                </div>

                {/* Date Selection Box */}
                <div className="booking-inputs-box">
                  <div className="date-inputs-row">
                    <div className="date-input-field">
                      <label>CHECK-IN</label>
                      <input
                        type="date"
                        value={checkInDate}
                        onChange={(e) => setCheckInDate(e.target.value)}
                        placeholder="Add date"
                      />
                    </div>
                    <div className="date-input-field">
                      <label>CHECKOUT</label>
                      <input
                        type="date"
                        value={checkOutDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                        placeholder="Add date"
                      />
                    </div>
                  </div>

                  <div className="guests-input-field">
                    <label>GUESTS</label>
                    <select
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                    >
                      {Array.from({ length: property.max_guests }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? 'Guest' : 'Guests'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pet-toggle-field p-2.5 flex items-center justify-between text-xs text-slate-600 border-t border-slate-100">
                    <span>Bringing a pet?</span>
                    <input
                      type="checkbox"
                      checked={hasPet}
                      onChange={(e) => setHasPet(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                    />
                  </div>
                </div>

                {/* Error Banner */}
                {availabilityError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 my-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{availabilityError}</span>
                  </div>
                )}

                {/* Reserve Action Button */}
                <button
                  className="reserve-btn"
                  onClick={handleReserve}
                  disabled={calculating}
                >
                  {calculating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin" />
                      Checking rates...
                    </span>
                  ) : isReserved ? (
                    <span className="flex items-center justify-center gap-2 text-emerald-100">
                      <Check size={18} /> Reserved!
                    </span>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>Reserve (Add to Wishlist)</span>
                    </>
                  )}
                </button>

                <p className="charged-notice">You won't be charged yet • Review & book from your Wishlist</p>

                {/* Live Price Breakdown calculation */}
                <div className="price-breakdown-table">
                  {pricingBreakdown ? (
                    <>
                      <div className="price-row">
                        <span>${property.price_per_night} × {pricingBreakdown.nights} nights</span>
                        <span>${pricingBreakdown.base_total}</span>
                      </div>
                      {(pricingBreakdown.cleaning_fee ?? 0) > 0 && (
                        <div className="price-row">
                          <span>Cleaning fee</span>
                          <span>${pricingBreakdown.cleaning_fee}</span>
                        </div>
                      )}
                      {(pricingBreakdown.pet_fee ?? 0) > 0 && (
                        <div className="price-row">
                          <span>Pet fee</span>
                          <span>${pricingBreakdown.pet_fee}</span>
                        </div>
                      )}
                      {(pricingBreakdown.extra_guest_fee ?? 0) > 0 && (
                        <div className="price-row">
                          <span>Extra guest fee</span>
                          <span>${pricingBreakdown.extra_guest_fee}</span>
                        </div>
                      )}
                      {(pricingBreakdown.discount_amount ?? 0) > 0 && (
                        <div className="price-row text-emerald-600 font-semibold">
                          <span>{pricingBreakdown.discount_label || 'Discount'}</span>
                          <span>-${pricingBreakdown.discount_amount}</span>
                        </div>
                      )}
                      {(pricingBreakdown.tax_amount ?? 0) > 0 && (
                        <div className="price-row">
                          <span>Taxes ({pricingBreakdown.tax_percent}%)</span>
                          <span>${pricingBreakdown.tax_amount}</span>
                        </div>
                      )}
                      <div className="price-divider" />
                      <div className="price-total-row">
                        <span>Total (USD)</span>
                        <span className="font-extrabold text-slate-900">${pricingBreakdown.total}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="price-row">
                        <span>${property.price_per_night} × {nights} nights (est.)</span>
                        <span>${baseTotal}</span>
                      </div>
                      {cleaningFee > 0 && (
                        <div className="price-row">
                          <span>Cleaning fee</span>
                          <span>${cleaningFee}</span>
                        </div>
                      )}
                      <div className="price-divider" />
                      <div className="price-total-row">
                        <span>Estimated Total</span>
                        <span>${baseTotal + cleaningFee}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 text-center mt-2">
                        Select check-in & check-out dates above for live seasonal rates & discounts.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout & Payment Modal */}
      {isCheckoutOpen && pricingBreakdown && (
        <CheckoutModal
          property={property}
          pricing={pricingBreakdown}
          checkInDate={checkInDate}
          checkOutDate={checkOutDate}
          guestCount={guestCount}
          hasPet={hasPet}
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
};
