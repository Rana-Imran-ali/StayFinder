import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, MapPin, Calendar, Users, Star, Heart } from 'lucide-react';

interface StayFinderLandingProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onGoToProfile: () => void;
}

const FEATURED_STAYS = [
  {
    id: 1,
    title: 'Cliffside Oceanfront Villa',
    location: 'Amalfi Coast, Italy',
    price: 340,
    rating: 4.98,
    reviews: 124,
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    tag: 'Superhost',
  },
  {
    id: 2,
    title: 'Modern Alpine Glass Cabin',
    location: 'Zermatt, Switzerland',
    price: 285,
    rating: 4.95,
    reviews: 89,
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    tag: 'Rare Find',
  },
  {
    id: 3,
    title: 'Santorini Sunset Cave Suite',
    location: 'Oia, Greece',
    price: 420,
    rating: 5.0,
    reviews: 215,
    image: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80',
    tag: 'Guest Favorite',
  },
  {
    id: 4,
    title: 'Kyoto Bamboo Garden Ryokan',
    location: 'Kyoto, Japan',
    price: 195,
    rating: 4.92,
    reviews: 74,
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    tag: 'Top Rated',
  },
];

export const StayFinderLanding: React.FC<StayFinderLandingProps> = ({
  onOpenLogin,
  onOpenRegister,
  onGoToProfile,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useState('');
  const [savedStays, setSavedStays] = useState<number[]>([]);

  const toggleFavorite = (id: number) => {
    setSavedStays((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Find your next unforgettable stay</h1>
          <p>
            Discover unique homes, beachfront villas, and cozy mountain cabins around the globe.
          </p>

          {/* Quick Search Widget */}
          <div className="search-bar-widget">
            <div className="search-field">
              <MapPin className="search-icon" size={18} />
              <div className="search-text">
                <span className="search-label">Where</span>
                <input
                  type="text"
                  placeholder="Search destinations"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>

            <div className="search-divider" />

            <div className="search-field">
              <Calendar className="search-icon" size={18} />
              <div className="search-text">
                <span className="search-label">Check in – Check out</span>
                <input type="text" placeholder="Add dates" readOnly />
              </div>
            </div>

            <div className="search-divider" />

            <div className="search-field">
              <Users className="search-icon" size={18} />
              <div className="search-text">
                <span className="search-label">Who</span>
                <input type="text" placeholder="Add guests" readOnly />
              </div>
            </div>

            <button className="search-action-btn">
              <Search size={18} />
              <span>Search</span>
            </button>
          </div>
        </div>
      </section>

      {/* User Welcome Banner if Authenticated */}
      {isAuthenticated && user && (
        <div className="welcome-banner">
          <div className="welcome-text">
            <h3>Welcome back, {user.name}!</h3>
            <p>
              Signed in as <strong>{user.email}</strong> • Role:{' '}
              <span className="badge badge-role">{user.roles?.[0]?.name || 'Customer'}</span>
            </p>
          </div>
          <button className="btn-secondary" onClick={onGoToProfile}>
            View Account Settings
          </button>
        </div>
      )}

      {/* Unauthenticated Quick Banner */}
      {!isAuthenticated && (
        <div className="auth-prompt-banner">
          <div>
            <h3>Sign in to manage your bookings and unlock exclusive host rates</h3>
            <p>Create an account in seconds or sign in with your phone or email.</p>
          </div>
          <div className="banner-btns">
            <button className="btn-secondary" onClick={onOpenLogin}>
              Sign In
            </button>
            <button className="btn-primary" onClick={onOpenRegister}>
              Create Free Account
            </button>
          </div>
        </div>
      )}

      {/* Featured Stays */}
      <section className="featured-section">
        <div className="section-header">
          <div>
            <h2>Featured Stays for You</h2>
            <p>Hand-picked, highest-rated accommodations with verified hosts</p>
          </div>
        </div>

        <div className="stays-grid">
          {FEATURED_STAYS.map((stay) => {
            const isFav = savedStays.includes(stay.id);
            return (
              <div key={stay.id} className="stay-card">
                <div className="stay-image-container">
                  <img src={stay.image} alt={stay.title} className="stay-image" />
                  <span className="stay-badge">{stay.tag}</span>
                  <button
                    className={`fav-btn ${isFav ? 'active' : ''}`}
                    onClick={() => toggleFavorite(stay.id)}
                  >
                    <Heart size={18} fill={isFav ? '#e11d48' : 'none'} color={isFav ? '#e11d48' : '#fff'} />
                  </button>
                </div>

                <div className="stay-details">
                  <div className="stay-header-row">
                    <h3>{stay.title}</h3>
                    <div className="stay-rating">
                      <Star size={15} fill="#f59e0b" color="#f59e0b" />
                      <span>{stay.rating}</span>
                    </div>
                  </div>
                  <p className="stay-location">{stay.location}</p>
                  <p className="stay-price">
                    <span className="price-num">${stay.price}</span> / night
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

