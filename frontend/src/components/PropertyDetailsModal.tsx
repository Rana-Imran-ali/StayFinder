import React, { useState } from 'react';
import type { Property, PropertyImage } from '../types/property';
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
  Share2
} from 'lucide-react';

interface PropertyDetailsModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onReserveSuccess?: (property: Property) => void;
}

export const PropertyDetailsModal: React.FC<PropertyDetailsModalProps> = ({
  property,
  isOpen,
  onClose,
  onReserveSuccess,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [guestCount, setGuestCount] = useState(1);
  const [isReserved, setIsReserved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !property) return null;

  // Resolve image list
  const fallbackImages = [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
  ];

  const images: string[] =
    property.images && property.images.length > 0
      ? property.images.map((img: PropertyImage) =>
          img.image_path.startsWith('http') ? img.image_path : `/storage/${img.image_path}`
        )
      : fallbackImages;

  const currentImage = images[selectedImageIndex] || images[0];

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

  // Pricing calculation
  const nights = checkInDate && checkOutDate
    ? Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)))
    : 3;
  const baseTotal = nights * Number(property.price_per_night);
  const cleaningFee = Number(property.cleaning_fee) || 0;
  const serviceFee = Math.round(baseTotal * 0.12);
  const grandTotal = baseTotal + cleaningFee + serviceFee;

  const handleReserve = () => {
    setIsReserved(true);
    setTimeout(() => {
      if (onReserveSuccess) onReserveSuccess(property);
    }, 1200);
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
        <div className="modal-header-actions">
          <div className="property-modal-tags">
            <span className="badge badge-primary">{formattedType}</span>
            <span className="badge badge-secondary">{formattedRoomType}</span>
            {property.instant_bookable && (
              <span className="badge badge-instant">
                <Zap size={14} className="mr-1" /> Instant Book
              </span>
            )}
          </div>
          <div className="header-button-group">
            <button
              className="icon-action-btn"
              onClick={handleShare}
              title="Share listing"
            >
              <Share2 size={18} />
              {copiedLink && <span className="tooltip-copied">Copied!</span>}
            </button>
            <button
              className="icon-action-btn"
              onClick={onClose}
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-scrollable-content">
          <h1 className="modal-property-title">{property.title}</h1>
          <div className="modal-property-subtitle">
            <div className="location-info">
              <MapPin size={16} className="text-rose-500" />
              <span>
                {property.address ? `${property.address}, ` : ''}
                {property.city}, {property.state ? `${property.state}, ` : ''}{property.country}
              </span>
            </div>
            <div className="rating-pill">
              <Star size={16} className="fill-amber-400 text-amber-400" />
              <span className="font-semibold">4.95</span>
              <span className="text-gray-400">(28 reviews)</span>
            </div>
          </div>

          {/* Photo Gallery with Preview & Thumbnails */}
          <div className="gallery-section">
            <div className="gallery-main-viewer">
              <img
                src={currentImage}
                alt={property.title}
                className="gallery-active-image"
              />
              {images.length > 1 && (
                <>
                  <button
                    className="gallery-nav-btn prev-btn"
                    onClick={handlePrevImage}
                    title="Previous image"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    className="gallery-nav-btn next-btn"
                    onClick={handleNextImage}
                    title="Next image"
                  >
                    <ChevronRight size={22} />
                  </button>
                  <div className="gallery-counter">
                    {selectedImageIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="gallery-thumbnails-strip">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    className={`thumbnail-btn ${selectedImageIndex === idx ? 'selected' : ''}`}
                    onClick={() => setSelectedImageIndex(idx)}
                  >
                    <img src={img} alt={`Thumbnail ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2-Column Content Layout: Left Details, Right Booking Widget */}
          <div className="property-body-grid">
            <div className="property-main-column">
              {/* Host & Core Specs */}
              <div className="host-specs-card">
                <div className="host-avatar-info">
                  <div className="host-avatar-circle">
                    {property.host?.name ? property.host.name[0].toUpperCase() : 'H'}
                  </div>
                  <div>
                    <h3 className="host-name">
                      Hosted by {property.host?.name || 'Verified StayFinder Host'}
                    </h3>
                    <p className="host-status">
                      <ShieldCheck size={14} className="text-emerald-500 inline mr-1" />
                      Superhost · Verified Listing
                    </p>
                  </div>
                </div>

                <div className="specs-row-badges">
                  <div className="spec-badge">
                    <Users size={16} />
                    <span>{property.max_guests} Guests</span>
                  </div>
                  <div className="spec-badge">
                    <Bed size={16} />
                    <span>{property.bedrooms} Bedrooms ({property.beds} Beds)</span>
                  </div>
                  <div className="spec-badge">
                    <Bath size={16} />
                    <span>{property.bathrooms} Baths</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="detail-section">
                <h2 className="section-title">About this space</h2>
                <div className="description-text">
                  {property.description.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div className="detail-section">
                <h2 className="section-title">What this place offers</h2>
                {property.amenities && property.amenities.length > 0 ? (
                  <div className="amenities-grid-modern">
                    {property.amenities.map((amenity) => (
                      <div key={amenity.id} className="amenity-chip-item">
                        <Check size={18} className="text-emerald-500 flex-shrink-0" />
                        <span>{amenity.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted">Standard essentials included (Wifi, Heating, Hot water, Clean linens).</p>
                )}
              </div>

              {/* Location & Map Section */}
              <div className="detail-section">
                <h2 className="section-title">Where you'll be</h2>
                <div className="flex items-center gap-1.5 text-sm text-gray-700 mb-3">
                  <MapPin size={16} className="text-rose-500 flex-shrink-0" />
                  <span>
                    {property.address ? `${property.address}, ` : ''}
                    {property.city}, {property.state ? `${property.state}, ` : ''}{property.country}
                  </span>
                </div>

                {property.latitude && property.longitude && (
                  <div className="location-map-card rounded-xl overflow-hidden border border-gray-200 relative h-60 bg-gray-100 shadow-sm">
                    <iframe
                      title="Property Location Map"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${(Number(property.longitude) - 0.015).toFixed(4)}%2C${(Number(property.latitude) - 0.015).toFixed(4)}%2C${(Number(property.longitude) + 0.015).toFixed(4)}%2C${(Number(property.latitude) + 0.015).toFixed(4)}&layer=mapnik&marker=${property.latitude}%2C${property.longitude}`}
                      className="w-full h-full border-none pointer-events-none select-none"
                    />
                    <div className="absolute bottom-2 right-2 bg-white/90 text-gray-800 text-[11px] font-semibold px-2 py-0.5 rounded shadow">
                      Exact location provided after booking
                    </div>
                  </div>
                )}
              </div>

              {/* Policies & Details */}
              <div className="detail-section">
                <h2 className="section-title">Things to know</h2>
                <div className="policies-grid">
                  <div className="policy-card">
                    <h4>Cancellation Policy</h4>
                    <p className="capitalize font-medium text-gray-700">
                      {property.cancellation_policy} cancellation
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {property.cancellation_policy === 'flexible'
                        ? 'Full refund 1 day prior to arrival.'
                        : property.cancellation_policy === 'moderate'
                        ? 'Full refund up to 5 days before check-in.'
                        : 'Full refund only if cancelled within 48 hours of booking.'}
                    </p>
                  </div>
                  <div className="policy-card">
                    <h4>House Rules</h4>
                    <ul className="text-xs text-muted list-disc ml-4 mt-1 space-y-1">
                      <li>Check-in: After 3:00 PM</li>
                      <li>Check-out: Before 11:00 AM</li>
                      <li>No smoking allowed</li>
                      <li>Self check-in with keypad</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Booking Card */}
            <div className="property-sidebar-column">
              <div className="booking-card-widget">
                <div className="widget-header">
                  <div>
                    <span className="price-big">${property.price_per_night}</span>
                    <span className="price-period"> / night</span>
                  </div>
                  <div className="rating-mini">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <span>4.95</span>
                  </div>
                </div>

                <div className="widget-date-inputs">
                  <div className="date-input-group">
                    <label>CHECK-IN</label>
                    <input
                      type="date"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                    />
                  </div>
                  <div className="date-input-group">
                    <label>CHECK-OUT</label>
                    <input
                      type="date"
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="guests-select-group">
                  <label>GUESTS</label>
                  <select
                    value={guestCount}
                    onChange={(e) => setGuestCount(Number(e.target.value))}
                  >
                    {Array.from({ length: property.max_guests || 1 }, (_, i) => i + 1).map((num) => (
                      <option key={num} value={num}>
                        {num} {num === 1 ? 'guest' : 'guests'}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  className={`btn-reserve-primary ${isReserved ? 'reserved' : ''}`}
                  onClick={handleReserve}
                  disabled={isReserved}
                >
                  {isReserved ? (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles size={18} /> Reservation Requested!
                    </span>
                  ) : (
                    <span>{property.instant_bookable ? 'Instant Reserve' : 'Request to Book'}</span>
                  )}
                </button>

                <p className="no-charge-notice">You won't be charged yet</p>

                <div className="price-breakdown">
                  <div className="price-row">
                    <span>${property.price_per_night} × {nights} nights</span>
                    <span>${baseTotal}</span>
                  </div>
                  {cleaningFee > 0 && (
                    <div className="price-row">
                      <span>Cleaning fee</span>
                      <span>${cleaningFee}</span>
                    </div>
                  )}
                  <div className="price-row">
                    <span>StayFinder service fee</span>
                    <span>${serviceFee}</span>
                  </div>
                  <div className="price-divider" />
                  <div className="price-total-row">
                    <span>Total before taxes</span>
                    <span>${grandTotal}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
