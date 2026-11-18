import React, { useState } from 'react';
import type { Property } from '../types/property';
import { Star, Heart, Users, Bed, Bath } from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property, onSelect }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  // Extract cover image
  const coverImage = property.images && property.images.length > 0
    ? (property.images.find((img) => img.is_primary)?.image_path || property.images[0].image_path)
    : null;

  const imageUrl = coverImage
    ? (coverImage.startsWith('http') ? coverImage : `/storage/${coverImage}`)
    : 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80';

  const typeLabel = property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1);

  return (
    <div className="stay-card property-card-clickable" onClick={() => onSelect(property)}>
      <div className="stay-image-container">
        <img src={imageUrl} alt={property.title} className="stay-image" />
        <span className="stay-badge">{typeLabel}</span>
        {property.instant_bookable && (
          <span className="stay-badge-secondary">Instant Book</span>
        )}
        <button
          className={`fav-btn ${isFavorite ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsFavorite(!isFavorite);
          }}
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
            <span>4.95</span>
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

        <div className="stay-price-row">
          <p className="stay-price">
            <span className="price-num">${property.price_per_night}</span> / night
          </p>
          {property.cleaning_fee > 0 && (
            <span className="cleaning-fee-tag">+${property.cleaning_fee} fee</span>
          )}
        </div>
      </div>
    </div>
  );
};
