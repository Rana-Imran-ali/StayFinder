import React, { useState, useEffect } from 'react';
import type { Property } from '../types/property';
import { favoritesApi } from '../services/favoritesApi';
import { getSafePropertyImageUrl, DEFAULT_PROPERTY_FALLBACK } from '../utils/dummyImages';
import {
  Heart, Loader2, Sparkles, MapPin, Users, Bed, Bath,
  Star, Trash2, ShoppingBag,
} from 'lucide-react';

interface WishlistViewProps {
  onSelectProperty: (property: Property) => void;
  onExploreStays: () => void;
  /** Called when user clicks "Book Now" on a wishlist item → opens BookingPageView */
  onBookNow?: (property: Property) => void;
}

export const WishlistView: React.FC<WishlistViewProps> = ({
  onSelectProperty,
  onExploreStays,
  onBookNow,
}) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await favoritesApi.getFavorites();
      const list = Array.isArray(res) ? res : res?.data ?? [];
      setProperties(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load wishlisted stays.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (property: Property) => {
    if (removingId === property.id) return;
    setRemovingId(property.id);
    try {
      await favoritesApi.toggleFavorite(property.id);
      setProperties((prev) => prev.filter((p) => p.id !== property.id));
    } catch {
      // silently ignore
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div
      className="portal-container"
      style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem' }}
    >
      {/* Header */}
      <div className="portal-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Heart size={28} fill="#e11d48" color="#e11d48" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Your Wishlists & Saved Stays</h1>
        </div>
        <p style={{ color: '#666', marginTop: '0.25rem' }}>
          All your saved retreats, villas, and holiday homes in one place. When you're ready, hit{' '}
          <strong>Book Now</strong> to complete your reservation.
        </p>
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <Loader2 className="spinner" size={32} />
          <p style={{ marginTop: '0.75rem', color: '#888' }}>Loading your saved stays…</p>
        </div>

      ) : error ? (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          {error}
        </div>

      ) : properties.length === 0 ? (
        /* Empty state */
        <div
          style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            background: '#fafafa',
            borderRadius: '16px',
            border: '1px dashed #ddd',
          }}
        >
          <Sparkles size={40} color="#FF385C" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            No saved stays yet
          </h3>
          <p style={{ color: '#666', maxWidth: '400px', margin: '0 auto 1.5rem auto' }}>
            Click <strong>Reserve</strong> on any property to save it here and review it before booking.
          </p>
          <button className="btn-primary" onClick={onExploreStays}>
            Explore Stays
          </button>
        </div>

      ) : (
        /* Wishlist cards — expanded layout */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {properties.map((property) => {
            const rawCover =
              property.images && property.images.length > 0
                ? property.images.find((img) => img.is_primary)?.image_path ||
                  property.images[0].image_path
                : null;
            const imageUrl = getSafePropertyImageUrl(rawCover, property.id, property.property_type);
            const shortDesc = property.description
              ? property.description.length > 180
                ? property.description.slice(0, 180) + '…'
                : property.description
              : null;

            return (
              <div
                key={property.id}
                style={{
                  display: 'flex',
                  gap: '1.5rem',
                  background: '#fff',
                  borderRadius: '16px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                  overflow: 'hidden',
                  border: '1px solid #f0f0f0',
                  flexWrap: 'wrap',
                }}
              >
                {/* Image */}
                <div
                  style={{
                    width: '240px',
                    minWidth: '200px',
                    flexShrink: 0,
                    position: 'relative',
                    cursor: 'pointer',
                  }}
                  onClick={() => onSelectProperty(property)}
                >
                  <img
                    src={imageUrl}
                    alt={property.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', minHeight: '180px' }}
                    onError={(e) => {
                      if (e.currentTarget.src !== DEFAULT_PROPERTY_FALLBACK)
                        e.currentTarget.src = DEFAULT_PROPERTY_FALLBACK;
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      background: 'rgba(0,0,0,0.55)',
                      color: '#fff',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '20px',
                      textTransform: 'capitalize',
                    }}
                  >
                    {property.property_type}
                  </span>
                </div>

                {/* Details */}
                <div
                  style={{
                    flex: 1,
                    padding: '1.25rem 1.25rem 1.25rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    minWidth: '220px',
                  }}
                >
                  {/* Title + rating */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                      <h2
                        style={{ fontSize: '1.1rem', fontWeight: 700, cursor: 'pointer', flex: 1 }}
                        onClick={() => onSelectProperty(property)}
                      >
                        {property.title}
                      </h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                        <Star size={14} fill="#f59e0b" color="#f59e0b" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {(property as any).avg_rating > 0 ? (property as any).avg_rating : 'New'}
                        </span>
                      </div>
                    </div>

                    {/* Location */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#555', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                      <MapPin size={13} />
                      <span>{property.city}, {property.country}</span>
                    </div>

                    {/* Specs */}
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.6rem' }}>
                      {[
                        { icon: <Users size={13} />, label: `${property.max_guests} guests` },
                        { icon: <Bed size={13} />, label: `${property.bedrooms} bed${property.bedrooms !== 1 ? 's' : ''}` },
                        { icon: <Bath size={13} />, label: `${property.bathrooms} bath${property.bathrooms !== 1 ? 's' : ''}` },
                      ].map((spec) => (
                        <span
                          key={spec.label}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            background: '#f5f5f5',
                            borderRadius: '20px',
                            padding: '3px 10px',
                            fontSize: '0.78rem',
                            color: '#444',
                            fontWeight: 500,
                          }}
                        >
                          {spec.icon} {spec.label}
                        </span>
                      ))}
                    </div>

                    {/* Description */}
                    {shortDesc && (
                      <p style={{ marginTop: '0.65rem', fontSize: '0.875rem', color: '#666', lineHeight: 1.5 }}>
                        {shortDesc}
                      </p>
                    )}
                  </div>

                  {/* Price + actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      paddingTop: '0.5rem',
                      borderTop: '1px solid #f0f0f0',
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                        ${property.price_per_night}
                      </span>
                      <span style={{ color: '#888', fontSize: '0.875rem' }}> / night</span>
                      {property.cleaning_fee > 0 && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.78rem', color: '#888' }}>
                          +${property.cleaning_fee} fee
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                      {/* Remove from wishlist */}
                      <button
                        onClick={() => handleRemove(property)}
                        disabled={removingId === property.id}
                        title="Remove from wishlist"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.45rem 0.9rem',
                          borderRadius: '8px',
                          border: '1px solid #e11d48',
                          background: '#fff',
                          color: '#e11d48',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: removingId === property.id ? 'wait' : 'pointer',
                        }}
                      >
                        <Trash2 size={13} />
                        {removingId === property.id ? 'Removing…' : 'Remove'}
                      </button>

                      {/* Book Now — manually triggers checkout */}
                      {onBookNow && (
                        <button
                          onClick={() => onBookNow(property)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.5rem 1.1rem',
                            borderRadius: '8px',
                            background: '#FF385C',
                            color: '#fff',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#E00B41')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = '#FF385C')}
                        >
                          <ShoppingBag size={14} />
                          Book Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
