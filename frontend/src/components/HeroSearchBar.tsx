import React, { useState, useEffect, useRef } from 'react';
import { locationApi } from '../services/locationApi';
import type { LocationSearchResult, City } from '../types/location';
import {
  MapPin,
  Calendar,
  Users,
  Search,
  X,
  Plus,
  Minus,
  Sparkles,
  Globe,
  Check,
  Loader2,
} from 'lucide-react';

interface HeroSearchBarProps {
  onSearch: (params: {
    search?: string;
    country_id?: number;
    state_id?: number;
    city_id?: number;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
  }) => void;
  initialSearch?: string;
  initialGuests?: number;
}

export const HeroSearchBar: React.FC<HeroSearchBarProps> = ({
  onSearch,
  initialSearch = '',
  initialGuests = 1,
}) => {
  // Active popover segment: 'where' | 'dates' | 'guests' | null
  const [activeSegment, setActiveSegment] = useState<'where' | 'dates' | 'guests' | null>(null);

  // Where state
  const [whereText, setWhereText] = useState(initialSearch);
  const [selectedLocation, setSelectedLocation] = useState<{
    country_id?: number;
    state_id?: number;
    city_id?: number;
  }>({});
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [popularCities, setPopularCities] = useState<City[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);

  // Dates state
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  // Guests state
  const [adults, setAdults] = useState(Math.max(1, initialGuests));
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  // Load popular destinations once for suggestion drawer
  useEffect(() => {
    locationApi.getPopularDestinations().then((res) => {
      if (res.data) setPopularCities(res.data);
    }).catch(() => {});
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveSegment(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Where input live search
  const handleWhereChange = async (val: string) => {
    setWhereText(val);
    setSelectedLocation({});

    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearchingLocation(true);
      const res = await locationApi.searchLocations(val);
      if (res.success && res.data) {
        setSearchResults(res.data);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleSelectLocationItem = (item: LocationSearchResult) => {
    setWhereText(item.title);
    setSelectedLocation({
      country_id: item.country_id,
      state_id: item.state_id ?? undefined,
      city_id: item.city_id ?? undefined,
    });
    setSearchResults([]);
    setActiveSegment('dates'); // advance smoothly to next step
  };

  const handleSelectPopularCity = (city: City) => {
    const title = `${city.name}, ${city.country?.name || ''}`;
    setWhereText(title);
    setSelectedLocation({
      country_id: city.country_id,
      state_id: city.state_id ?? undefined,
      city_id: city.id,
    });
    setActiveSegment('dates');
  };

  const handleClearWhere = (e: React.MouseEvent) => {
    e.stopPropagation();
    setWhereText('');
    setSelectedLocation({});
    setSearchResults([]);
  };

  // Quick Date Helpers
  const handleSetQuickDate = (daysFromNow: number, stayDuration: number) => {
    const start = new Date();
    start.setDate(start.getDate() + daysFromNow);
    const end = new Date(start);
    end.setDate(end.getDate() + stayDuration);

    setCheckIn(start.toISOString().split('T')[0]);
    setCheckOut(end.toISOString().split('T')[0]);
    setActiveSegment('guests');
  };

  const handleClearDates = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckIn('');
    setCheckOut('');
  };

  const totalGuests = adults + children;

  const handleSubmitSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveSegment(null);

    onSearch({
      search: whereText.trim() ? whereText.trim() : undefined,
      country_id: selectedLocation.country_id,
      state_id: selectedLocation.state_id,
      city_id: selectedLocation.city_id,
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      guests: totalGuests > 1 ? totalGuests : undefined,
    });
  };

  // Format date range label
  const getDateLabel = () => {
    if (checkIn && checkOut) {
      const d1 = new Date(checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const d2 = new Date(checkOut).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${d1} – ${d2}`;
    }
    if (checkIn) {
      return `From ${new Date(checkIn).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }
    return 'Add dates';
  };

  // Format guest label
  const getGuestLabel = () => {
    const parts = [];
    if (totalGuests === 1) parts.push('1 guest');
    else if (totalGuests > 1) parts.push(`${totalGuests} guests`);
    if (infants === 1) parts.push('1 infant');
    else if (infants > 1) parts.push(`${infants} infants`);

    return parts.length > 0 ? parts.join(', ') : 'Add guests';
  };

  return (
    <div className="hero-search-wrapper" ref={containerRef}>
      <div className={`hero-search-bar ${activeSegment ? 'is-active' : ''}`}>
        {/* Segment 1: Where */}
        <div
          className={`search-segment where-segment ${activeSegment === 'where' ? 'selected' : ''}`}
          onClick={() => setActiveSegment('where')}
        >
          <div className="segment-icon-box">
            <MapPin size={18} className="text-rose-500" />
          </div>
          <div className="segment-text-box">
            <span className="segment-label">Where</span>
            <input
              type="text"
              className="segment-input"
              placeholder="Search destinations"
              value={whereText}
              onChange={(e) => handleWhereChange(e.target.value)}
              onFocus={() => setActiveSegment('where')}
            />
          </div>
          {isSearchingLocation && (
            <Loader2 size={15} className="animate-spin text-gray-400 mr-1.5 flex-shrink-0" />
          )}
          {whereText && (
            <button
              type="button"
              className="segment-clear-btn"
              onClick={handleClearWhere}
              title="Clear destination"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="search-segment-divider" />

        {/* Segment 2: When / Dates */}
        <div
          className={`search-segment dates-segment ${activeSegment === 'dates' ? 'selected' : ''}`}
          onClick={() => setActiveSegment('dates')}
        >
          <div className="segment-icon-box">
            <Calendar size={18} className="text-rose-500" />
          </div>
          <div className="segment-text-box">
            <span className="segment-label">When</span>
            <span className={`segment-display-val ${checkIn ? 'has-val' : ''}`}>
              {getDateLabel()}
            </span>
          </div>
          {(checkIn || checkOut) && (
            <button
              type="button"
              className="segment-clear-btn"
              onClick={handleClearDates}
              title="Clear dates"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="search-segment-divider" />

        {/* Segment 3: Who / Guests */}
        <div
          className={`search-segment guests-segment ${activeSegment === 'guests' ? 'selected' : ''}`}
          onClick={() => setActiveSegment('guests')}
        >
          <div className="segment-icon-box">
            <Users size={18} className="text-rose-500" />
          </div>
          <div className="segment-text-box">
            <span className="segment-label">Who</span>
            <span className={`segment-display-val ${totalGuests > 1 || infants > 0 ? 'has-val' : ''}`}>
              {getGuestLabel()}
            </span>
          </div>
        </div>

        {/* Search Action Button */}
        <button
          type="button"
          className="search-submit-pill"
          onClick={() => handleSubmitSearch()}
          title="Search Stays"
        >
          <Search size={18} />
          <span className="search-pill-text">Search</span>
        </button>
      </div>

      {/* Popover Dropdown Panels */}
      {activeSegment === 'where' && (
        <div className="search-popover where-popover animate-in fade-in zoom-in-95 duration-150">
          {searchResults.length > 0 ? (
            <div className="popover-results-list">
              <span className="popover-heading">Matching Destinations</span>
              {searchResults.map((item, idx) => (
                <div
                  key={idx}
                  className="popover-item"
                  onClick={() => handleSelectLocationItem(item)}
                >
                  <div className="item-icon-bg">
                    <MapPin size={16} className="text-rose-600" />
                  </div>
                  <div className="item-details">
                    <span className="item-title">{item.title}</span>
                    <span className="item-subtitle uppercase">{item.type}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="popover-suggestions">
              <span className="popover-heading flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" /> Popular Destinations
              </span>
              <div className="popular-cities-grid">
                {popularCities.map((city) => (
                  <div
                    key={city.id}
                    className="city-chip-card"
                    onClick={() => handleSelectPopularCity(city)}
                  >
                    <div className="city-chip-icon">
                      <Globe size={16} className="text-rose-500" />
                    </div>
                    <div>
                      <span className="city-chip-name">{city.name}</span>
                      <span className="city-chip-country">{city.country?.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeSegment === 'dates' && (
        <div className="search-popover dates-popover animate-in fade-in zoom-in-95 duration-150">
          <span className="popover-heading">Select Travel Dates</span>

          <div className="date-pickers-row">
            <div className="date-picker-group">
              <label>CHECK-IN</label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
              />
            </div>
            <div className="date-picker-group">
              <label>CHECK-OUT</label>
              <input
                type="date"
                min={checkIn || new Date().toISOString().split('T')[0]}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
              />
            </div>
          </div>

          {/* Quick Date Shortcuts */}
          <div className="quick-dates-bar">
            <span className="text-xs text-gray-500 font-semibold block mb-2">Quick shortcuts:</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-quick-date"
                onClick={() => handleSetQuickDate(1, 3)}
              >
                This Weekend (3 days)
              </button>
              <button
                type="button"
                className="btn-quick-date"
                onClick={() => handleSetQuickDate(7, 7)}
              >
                Next Week (7 days)
              </button>
              <button
                type="button"
                className="btn-quick-date"
                onClick={() => handleSetQuickDate(30, 14)}
              >
                Next Month (14 days)
              </button>
            </div>
          </div>

          <div className="popover-footer">
            <button
              type="button"
              className="text-xs text-gray-500 hover:text-gray-900 font-semibold"
              onClick={() => {
                setCheckIn('');
                setCheckOut('');
              }}
            >
              Reset Dates
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm text-xs py-1 px-4"
              onClick={() => setActiveSegment('guests')}
            >
              Continue to Guests
            </button>
          </div>
        </div>
      )}

      {activeSegment === 'guests' && (
        <div className="search-popover guests-popover animate-in fade-in zoom-in-95 duration-150">
          <span className="popover-heading">Guests & Capacity</span>

          <div className="guest-counter-rows space-y-3 mt-2">
            {/* Adults */}
            <div className="guest-row">
              <div>
                <span className="guest-title">Adults</span>
                <span className="guest-sub">Age 13 or above</span>
              </div>
              <div className="counter-btn-group">
                <button
                  type="button"
                  className="round-counter-btn"
                  disabled={adults <= 1}
                  onClick={() => setAdults((a) => Math.max(1, a - 1))}
                >
                  <Minus size={14} />
                </button>
                <span className="counter-val-text">{adults}</span>
                <button
                  type="button"
                  className="round-counter-btn"
                  onClick={() => setAdults((a) => a + 1)}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Children */}
            <div className="guest-row">
              <div>
                <span className="guest-title">Children</span>
                <span className="guest-sub">Ages 2–12</span>
              </div>
              <div className="counter-btn-group">
                <button
                  type="button"
                  className="round-counter-btn"
                  disabled={children <= 0}
                  onClick={() => setChildren((c) => Math.max(0, c - 1))}
                >
                  <Minus size={14} />
                </button>
                <span className="counter-val-text">{children}</span>
                <button
                  type="button"
                  className="round-counter-btn"
                  onClick={() => setChildren((c) => c + 1)}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Infants */}
            <div className="guest-row">
              <div>
                <span className="guest-title">Infants</span>
                <span className="guest-sub">Under 2</span>
              </div>
              <div className="counter-btn-group">
                <button
                  type="button"
                  className="round-counter-btn"
                  disabled={infants <= 0}
                  onClick={() => setInfants((i) => Math.max(0, i - 1))}
                >
                  <Minus size={14} />
                </button>
                <span className="counter-val-text">{infants}</span>
                <button
                  type="button"
                  className="round-counter-btn"
                  onClick={() => setInfants((i) => i + 1)}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="popover-footer">
            <button
              type="button"
              className="text-xs text-gray-500 hover:text-gray-900 font-semibold"
              onClick={() => {
                setAdults(1);
                setChildren(0);
                setInfants(0);
              }}
            >
              Reset
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm text-xs py-1.5 px-4 flex items-center gap-1.5"
              onClick={() => handleSubmitSearch()}
            >
              <Check size={14} />
              <span>Apply & Search</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
