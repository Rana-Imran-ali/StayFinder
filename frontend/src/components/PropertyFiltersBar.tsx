import React, { useState, useEffect, useRef } from 'react';
import { propertyApi } from '../services/propertyApi';
import { locationApi } from '../services/locationApi';
import type { PropertyFilterParams, Amenity } from '../types/property';
import type { Country, City, LocationSearchResult } from '../types/location';
import {
  Search,
  SlidersHorizontal,
  X,
  Check,
  RotateCcw,
  Home,
  Building,
  Sparkles,
  Trees,
  Globe,
  MapPin,
  Loader2,
} from 'lucide-react';

interface PropertyFiltersBarProps {
  onFilterChange: (filters: PropertyFilterParams) => void;
  activeFilters?: PropertyFilterParams;
}

const PROPERTY_TYPES = [
  { label: 'All Stays', value: 'all', icon: Sparkles },
  { label: 'Villas', value: 'villa', icon: Home },
  { label: 'Apartments', value: 'apartment', icon: Building },
  { label: 'Houses', value: 'house', icon: Home },
  { label: 'Cabins', value: 'cabin', icon: Trees },
  { label: 'Cottages', value: 'cottage', icon: Home },
  { label: 'Lofts', value: 'loft', icon: Building },
];

export const PropertyFiltersBar: React.FC<PropertyFiltersBarProps> = ({
  onFilterChange,
  activeFilters = {},
}) => {
  const [search, setSearch] = useState(activeFilters.search || '');
  const [propertyType, setPropertyType] = useState(activeFilters.property_type || 'all');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Search autocomplete state
  const [searchSuggestions, setSearchSuggestions] = useState<LocationSearchResult[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // Advanced Filters State
  const [minPrice, setMinPrice] = useState<string>(activeFilters.min_price?.toString() || '');
  const [maxPrice, setMaxPrice] = useState<string>(activeFilters.max_price?.toString() || '');
  const [guests, setGuests] = useState<number>(activeFilters.guests || 1);
  const [selectedAmenities, setSelectedAmenities] = useState<number[]>(activeFilters.amenities || []);
  const [selectedCountryId, setSelectedCountryId] = useState<number | undefined>(activeFilters.country_id);
  const [selectedCityId, setSelectedCityId] = useState<number | undefined>(activeFilters.city_id);
  const [distanceRadius, setDistanceRadius] = useState<number | undefined>(activeFilters.radius);

  // Catalogs
  const [amenitiesCatalog, setAmenitiesCatalog] = useState<Record<string, Amenity[]>>({});
  const [countriesCatalog, setCountriesCatalog] = useState<Country[]>([]);
  const [citiesCatalog, setCitiesCatalog] = useState<City[]>([]);

  useEffect(() => {
    // Load amenities
    propertyApi.getAmenities().then((res) => {
      if (res.data) setAmenitiesCatalog(res.data);
    }).catch(() => {});

    // Load active countries
    locationApi.getCountries().then((res) => {
      if (res.data) setCountriesCatalog(res.data);
    }).catch(() => {});
  }, []);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestionsDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When selected country changes, load cities
  useEffect(() => {
    if (selectedCountryId) {
      locationApi.getCitiesByCountry(selectedCountryId).then((res) => {
        if (res.data) setCitiesCatalog(res.data);
      }).catch(() => setCitiesCatalog([]));
    } else {
      locationApi.getCities({ popular: true }).then((res) => {
        if (res.data) setCitiesCatalog(res.data);
      }).catch(() => setCitiesCatalog([]));
    }
  }, [selectedCountryId]);

  const handleSearchInputChange = async (val: string) => {
    setSearch(val);
    if (val.trim().length >= 2) {
      try {
        setIsSearchingSuggestions(true);
        const res = await locationApi.searchLocations(val);
        if (res.data && res.data.length > 0) {
          setSearchSuggestions(res.data);
          setShowSuggestionsDropdown(true);
        } else {
          setSearchSuggestions([]);
          setShowSuggestionsDropdown(false);
        }
      } catch {
        setSearchSuggestions([]);
      } finally {
        setIsSearchingSuggestions(false);
      }
    } else {
      setSearchSuggestions([]);
      setShowSuggestionsDropdown(false);
    }
  };

  const handleSelectSuggestion = (item: LocationSearchResult) => {
    setSearch(item.title);
    setShowSuggestionsDropdown(false);
    onFilterChange({
      ...activeFilters,
      search: item.name,
      country_id: item.country_id,
      city_id: item.city_id,
      page: 1,
    });
  };

  const handleClearSearch = () => {
    setSearch('');
    setSearchSuggestions([]);
    setShowSuggestionsDropdown(false);
    onFilterChange({
      ...activeFilters,
      search: undefined,
      country_id: undefined,
      city_id: undefined,
      page: 1,
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestionsDropdown(false);
    onFilterChange({
      ...activeFilters,
      search: search || undefined,
      country_id: selectedCountryId,
      city_id: selectedCityId,
      radius: distanceRadius,
      property_type: propertyType === 'all' ? undefined : propertyType,
      min_price: minPrice ? parseFloat(minPrice) : undefined,
      max_price: maxPrice ? parseFloat(maxPrice) : undefined,
      guests: guests > 1 ? guests : undefined,
      amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
      page: 1,
    });
  };

  const handleTypeSelect = (type: string) => {
    setPropertyType(type);
    onFilterChange({
      ...activeFilters,
      property_type: type === 'all' ? undefined : type,
      page: 1,
    });
  };

  const toggleAmenity = (id: number) => {
    setSelectedAmenities((prev) =>
      prev.includes(id) ? prev.filter((aId) => aId !== id) : [...prev, id]
    );
  };

  const resetFilters = () => {
    setSearch('');
    setPropertyType('all');
    setMinPrice('');
    setMaxPrice('');
    setGuests(1);
    setSelectedAmenities([]);
    setSelectedCountryId(undefined);
    setSelectedCityId(undefined);
    setDistanceRadius(undefined);
    onFilterChange({});
    setShowFilterModal(false);
  };

  const applyAdvancedFilters = () => {
    onFilterChange({
      ...activeFilters,
      search: search || undefined,
      country_id: selectedCountryId,
      city_id: selectedCityId,
      radius: distanceRadius,
      property_type: propertyType === 'all' ? undefined : propertyType,
      min_price: minPrice ? parseFloat(minPrice) : undefined,
      max_price: maxPrice ? parseFloat(maxPrice) : undefined,
      guests: guests > 1 ? guests : undefined,
      amenities: selectedAmenities.length > 0 ? selectedAmenities : undefined,
      page: 1,
    });
    setShowFilterModal(false);
  };

  const hasActiveAdvanced =
    minPrice !== '' ||
    maxPrice !== '' ||
    guests > 1 ||
    selectedAmenities.length > 0 ||
    selectedCountryId !== undefined ||
    selectedCityId !== undefined ||
    distanceRadius !== undefined;

  return (
    <div className="property-filters-container">
      {/* Top Search Bar & Filters Trigger */}
      <div className="search-filter-row" ref={searchWrapperRef}>
        <div className="relative flex-1">
          <form className="search-pill-wrapper flex items-center" onSubmit={handleSearchSubmit}>
            <Search size={18} className="search-icon flex-shrink-0" />
            <input
              type="text"
              className="search-input w-full"
              placeholder="Search by city, country, or destination..."
              value={search}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onFocus={() => searchSuggestions.length > 0 && setShowSuggestionsDropdown(true)}
            />
            {isSearchingSuggestions && (
              <Loader2 size={16} className="animate-spin text-gray-400 mr-2" />
            )}
            {search && (
              <button
                type="button"
                className="mr-2 text-gray-400 hover:text-gray-700 p-0.5 rounded-full hover:bg-gray-100"
                onClick={handleClearSearch}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
            <button type="submit" className="search-pill-btn">
              Search
            </button>
          </form>

          {/* Autocomplete Dropdown */}
          {showSuggestionsDropdown && searchSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-1.5 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b">
                Suggested Locations
              </div>
              <div className="max-h-60 overflow-y-auto">
                {searchSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    className="px-3.5 py-2.5 text-sm hover:bg-rose-50 hover:text-rose-700 cursor-pointer flex items-center justify-between border-b last:border-b-0 border-gray-100 transition-colors"
                    onClick={() => handleSelectSuggestion(item)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                        <MapPin size={14} />
                      </div>
                      <span className="font-medium text-gray-900">{item.title}</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-1.5 py-0.5 rounded bg-gray-100">
                      {item.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          className={`filter-toggle-btn ${hasActiveAdvanced ? 'has-active' : ''}`}
          onClick={() => setShowFilterModal(true)}
        >
          <SlidersHorizontal size={17} />
          <span>Filters</span>
          {hasActiveAdvanced && <span className="active-dot" />}
        </button>
      </div>

      {/* Property Type Category Chips */}
      <div className="category-chips-row">
        {PROPERTY_TYPES.map((t) => {
          const Icon = t.icon;
          const isSelected = propertyType === t.value;
          return (
            <button
              key={t.value}
              className={`category-chip ${isSelected ? 'selected' : ''}`}
              onClick={() => handleTypeSelect(t.value)}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Advanced Filter Modal */}
      {showFilterModal && (
        <div className="modal-overlay" onClick={() => setShowFilterModal(false)}>
          <div
            className="modal-content modal-large filter-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header flex-between">
              <h2>Filters, Locations & Amenities</h2>
              <button
                className="modal-close-inline"
                onClick={() => setShowFilterModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="filter-modal-body">
              {/* Destination & Location Filters */}
              <div className="filter-section">
                <h3>Destination & Country</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  <div className="form-group">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">
                      <Globe size={13} className="inline mr-1 text-rose-500" /> Country
                    </label>
                    <select
                      className="form-input text-xs"
                      value={selectedCountryId || ''}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : undefined;
                        setSelectedCountryId(val);
                        setSelectedCityId(undefined);
                      }}
                    >
                      <option value="">Any Country</option>
                      {countriesCatalog.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="text-xs font-semibold text-gray-600 block mb-1">
                      <MapPin size={13} className="inline mr-1 text-rose-500" /> City / Region
                    </label>
                    <select
                      className="form-input text-xs"
                      value={selectedCityId || ''}
                      onChange={(e) => setSelectedCityId(e.target.value ? Number(e.target.value) : undefined)}
                    >
                      <option value="">Any City</option>
                      {citiesCatalog.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name} {city.is_popular ? '★' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-xs font-semibold text-gray-600 block mb-1">
                    Nearby Search Radius (Kilometers)
                  </label>
                  <div className="flex items-center gap-2">
                    {[15, 30, 50, 100].map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                          distanceRadius === r
                            ? 'bg-rose-600 text-white border-rose-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
                        }`}
                        onClick={() => setDistanceRadius(distanceRadius === r ? undefined : r)}
                      >
                        Within {r} km
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price Range */}
              <div className="filter-section">
                <h3>Price Range (Per Night)</h3>
                <div className="price-inputs-grid">
                  <div className="form-group">
                    <label>Minimum Price ($)</label>
                    <input
                      type="number"
                      className="standard-input"
                      placeholder="0"
                      min="0"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Maximum Price ($)</label>
                    <input
                      type="number"
                      className="standard-input"
                      placeholder="1000+"
                      min="0"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Guest Count */}
              <div className="filter-section">
                <h3>Guests & Capacity</h3>
                <div className="stepper-row">
                  <div>
                    <h4>Guests</h4>
                    <p className="text-muted text-xs">Ages 13 or above</p>
                  </div>
                  <div className="stepper-controls">
                    <button
                      type="button"
                      className="stepper-btn"
                      disabled={guests <= 1}
                      onClick={() => setGuests((g) => Math.max(1, g - 1))}
                    >
                      -
                    </button>
                    <span className="stepper-count">{guests}+</span>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setGuests((g) => g + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Amenities Grid */}
              <div className="filter-section">
                <h3>Popular Amenities</h3>
                {Object.keys(amenitiesCatalog).length === 0 ? (
                  <p className="text-muted text-sm">Loading amenities catalog...</p>
                ) : (
                  <div className="amenities-category-blocks">
                    {Object.entries(amenitiesCatalog).map(([category, items]) => (
                      <div key={category} className="amenity-cat-group">
                        <h4 className="amenity-cat-title text-capitalize">{category}</h4>
                        <div className="amenities-checkboxes-grid">
                          {items.map((amenity) => {
                            const isChecked = selectedAmenities.includes(amenity.id);
                            return (
                              <div
                                key={amenity.id}
                                className={`amenity-card-toggle ${isChecked ? 'active' : ''}`}
                                onClick={() => toggleAmenity(amenity.id)}
                              >
                                <div className="checkbox-box">
                                  {isChecked && <Check size={14} className="text-white" />}
                                </div>
                                <span className="amenity-name">{amenity.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="filter-modal-footer flex-between">
              <button
                type="button"
                className="btn-secondary link-style"
                onClick={resetFilters}
              >
                <RotateCcw size={15} />
                <span>Clear All</span>
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={applyAdvancedFilters}
              >
                Show Stays
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
