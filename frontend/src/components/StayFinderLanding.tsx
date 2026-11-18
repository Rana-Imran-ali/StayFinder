import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { propertyApi } from '../services/propertyApi';
import { locationApi } from '../services/locationApi';
import type { Property, PropertyFilterParams } from '../types/property';
import type { City } from '../types/location';
import { PropertyCard } from './PropertyCard';
import { PropertyFiltersBar } from './PropertyFiltersBar';
import { MapPropertyViewer } from './MapPropertyViewer';
import { HeroSearchBar } from './HeroSearchBar';
import {
  Loader2,
  Building2,
  Map,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';

interface StayFinderLandingProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onGoToProfile: () => void;
  onSelectProperty?: (property: Property) => void;
}

export const StayFinderLanding: React.FC<StayFinderLandingProps> = ({
  onOpenLogin,
  onOpenRegister,
  onGoToProfile,
  onSelectProperty,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [searchLocation, setSearchLocation] = useState('');
  const [filterParams, setFilterParams] = useState<PropertyFilterParams>({});
  const [properties, setProperties] = useState<Property[]>([]);
  const [popularCities, setPopularCities] = useState<City[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch properties whenever filter params change
  useEffect(() => {
    fetchProperties(filterParams);
  }, [filterParams]);

  // Load popular destinations once
  useEffect(() => {
    locationApi.getPopularDestinations().then((res) => {
      if (res.data) setPopularCities(res.data);
    }).catch(() => {});
  }, []);

  const fetchProperties = async (params: PropertyFilterParams) => {
    try {
      setLoading(true);
      const res = await propertyApi.getProperties(params);
      if (res.success && res.data) {
        setProperties(res.data.data);
        setTotalCount(res.data.total);
      } else {
        setProperties([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      console.warn('Could not load properties from backend:', err);
      setProperties([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleHeroSearchBarSearch = (params: {
    search?: string;
    country_id?: number;
    state_id?: number;
    city_id?: number;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
  }) => {
    setFilterParams((prev) => ({
      ...prev,
      search: params.search,
      country_id: params.country_id,
      state_id: params.state_id,
      city_id: params.city_id,
      guests: params.guests,
      page: 1,
    }));
  };

  const handleFilterChange = (newParams: PropertyFilterParams) => {
    setFilterParams(newParams);
  };

  const handleCityQuickSelect = (city: City) => {
    setFilterParams((prev) => ({
      ...prev,
      country_id: city.country_id,
      city_id: city.id,
      search: undefined,
    }));
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

          {/* User-Friendly Interactive Search Widget */}
          <HeroSearchBar
            onSearch={handleHeroSearchBarSearch}
            initialSearch={searchLocation}
          />

          {/* Popular Destinations Quick Chips */}
          {popularCities.length > 0 && (
            <div className="popular-destinations-bar flex items-center justify-center gap-2 mt-4 flex-wrap">
              <span className="text-xs text-white/80 font-medium flex items-center gap-1">
                <Sparkles size={13} className="text-amber-300" /> Popular:
              </span>
              {popularCities.slice(0, 6).map((city) => (
                <button
                  key={city.id}
                  type="button"
                  className="px-2.5 py-1 rounded-full text-xs bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-colors border border-white/20"
                  onClick={() => handleCityQuickSelect(city)}
                >
                  {city.name}, {city.country?.code}
                </button>
              ))}
            </div>
          )}
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

      {/* Live Property Filters Bar */}
      <section className="explore-filters-container">
        <PropertyFiltersBar
          onFilterChange={handleFilterChange}
          activeFilters={filterParams}
        />
      </section>

      {/* Properties Section with View Toggle */}
      <section className="featured-section">
        {!loading && (
          <div className="section-header flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Available Stays ({totalCount})</h2>
              <p className="text-sm text-gray-500">Explore handpicked properties verified by StayFinder</p>
            </div>

            {/* View Mode Toggle Button */}
            <div className="view-mode-toggle flex items-center bg-gray-100 p-1 rounded-full border border-gray-200">
              <button
                type="button"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid size={14} />
                <span>Grid</span>
              </button>
              <button
                type="button"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  viewMode === 'map'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                onClick={() => setViewMode('map')}
              >
                <Map size={14} />
                <span>Show Map</span>
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="animate-spin mb-3 text-rose-500" size={36} />
            <p className="text-base font-medium">Finding incredible places to stay...</p>
          </div>
        ) : viewMode === 'map' ? (
          <div className="mb-8">
            <MapPropertyViewer
              properties={properties}
              onSelectProperty={(prop) => {
                if (onSelectProperty) onSelectProperty(prop);
              }}
            />
          </div>
        ) : properties.length > 0 ? (
          <div className="stays-grid">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                onSelect={(prop) => {
                  if (onSelectProperty) onSelectProperty(prop);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 p-8 max-w-xl mx-auto my-8">
            <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-800">No properties found</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Try adjusting your destination search, clearing filters, or exploring other regions.
            </p>
            <button
              className="btn btn-secondary inline-flex items-center gap-2"
              onClick={() => {
                setSearchLocation('');
                setFilterParams({});
              }}
            >
              Reset all filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
