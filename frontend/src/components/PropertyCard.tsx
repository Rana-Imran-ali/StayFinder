import React, { useState } from 'react';
import type { Property } from '../types/property';
import { Star, Heart, Users, Bed, Bath, Zap } from 'lucide-react';
import { getSafePropertyImageUrl, DEFAULT_PROPERTY_FALLBACK } from '../utils/dummyImages';
import { useAuth } from '../context/AuthContext';
import { favoritesApi } from '../services/favoritesApi';

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
  onBookNow?: (property: Property) => void;
  /** Called when user clicks Reserve — adds to wishlist & navigates there */
  onAddToWishlist?: (property: Property) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  onSelect,
  onBookNow,
  onAddToWishlist,
}) => {
  const { isAuthenticated } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFav, setIsTogglingFav] = useState(false);
  const [reserveMsg, setReserveMsg] = useState<string | null>(null);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      alert('Please log in to save properties to your wishlist.');
      return;
    }
    if (isTogglingFav) return;
    setIsTogglingFav(true);
    try {
      const res = await favoritesApi.toggleFavorite(property.id);
      setIsFavorite(res.is_favorited);
    } catch {
      setIsFavorite(!isFavorite);
    } finally {
      setIsTogglingFav(false);
    }
  };

  const handleReserve = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // If a dedicated "Book Now" override exists (e.g. from WishlistView), use it
    if (onBookNow) {
      onBookNow(property);
      return;
    }

    // Default: add to wishlist flow
    if (!isAuthenticated) {
      alert('Please log in to save properties to your wishlist.');
      return;
    }
    if (isTogglingFav) return;
    setIsTogglingFav(true);
    try {
      const res = await favoritesApi.toggleFavorite(property.id);
      setIsFavorite(res.is_favorited);
      if (res.is_favorited) {
        setReserveMsg('Added to Wishlist! ❤️');
        setTimeout(() => setReserveMsg(null), 2500);
        if (onAddToWishlist) onAddToWishlist(property);
      } else {
        setReserveMsg('Removed from Wishlist');
        setTimeout(() => setReserveMsg(null), 2000);
      }
    } catch {
      setReserveMsg('Could not update wishlist. Try again.');
      setTimeout(() => setReserveMsg(null), 2500);
    } finally {
      setIsTogglingFav(false);
    }
  };

  // Extract cover image with resilient dummy fallback
  const rawCoverImage = property.images && property.images.length > 0
    ? (property.images.find((img) => img.is_primary)?.image_path || property.images[0].image_path)
    : null;

  const imageUrl = getSafePropertyImageUrl(rawCoverImage, property.id, property.property_type);

  const typeLabel = property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1);

  return (
    <div className="stay-card property-card-clickable" onClick={() => onSelect(property)}>
      <div className="stay-image-container">
        <img
          src={imageUrl}
          alt={property.title}
          className="stay-image"
          onError={(e) => {
            if (e.currentTarget.src !== DEFAULT_PROPERTY_FALLBACK) {
              e.currentTarget.src = DEFAULT_PROPERTY_FALLBACK;
            }
          }}
        />
        <span className="stay-badge">{typeLabel}</span>
        {property.instant_bookable && (
          <span className="stay-badge-secondary flex items-center gap-1">
            <Zap size={11} className="fill-current" /> Instant Book
          </span>
        )}
        <button
          className={`fav-btn ${isFavorite ? 'active' : ''}`}
          onClick={handleFavoriteClick}
          title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
        >
          <Heart
            size={18}
            fill={isFavorite ? '#e11d48' : 'none'}
            color={isFavorite ? '#e11d48' : '#ffffff'}
          />
        </button>
      </div>

      <div className="stay-details">
        <div className="stay-header-row">
          <h3 className="property-card-title">{property.title}</h3>
          <div className="stay-rating">
            <Star size={15} fill="#f59e0b" color="#f59e0b" />
            <span>{(property as any).avg_rating > 0 ? (property as any).avg_rating : 'New'}</span>
          </div>
        </div>

        <p className="stay-location">
          {property.city}, {property.country}
        </p>

        <div className="property-specs-pills">
          <span className="spec-pill">
            <Users size={13} /> {property.max_guests} guests
          </span>
          <span className="spec-pill">
            <Bed size={13} /> {property.bedrooms} bed
          </span>
          <span className="spec-pill">
            <Bath size={13} /> {property.bathrooms} bath
          </span>
        </div>

        <div className="stay-price-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p className="stay-price">
              <span className="price-num">${property.price_per_night}</span> / night
            </p>
            {property.cleaning_fee > 0 && (
              <span className="cleaning-fee-tag">+${property.cleaning_fee} fee</span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            {reserveMsg && (
              <span style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {reserveMsg}
              </span>
            )}
            <button
              className="card-reserve-btn"
              onClick={handleReserve}
              disabled={isTogglingFav}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                backgroundColor: isTogglingFav ? '#f87171' : '#FF385C',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: 'none',
                cursor: isTogglingFav ? 'wait' : 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => !isTogglingFav && (e.currentTarget.style.backgroundColor = '#E00B41')}
              onMouseLeave={(e) => !isTogglingFav && (e.currentTarget.style.backgroundColor = '#FF385C')}
            >
              {isTogglingFav ? 'Saving…' : onBookNow ? 'Book Now' : 'Reserve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
