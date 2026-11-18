import React, { useState, useEffect } from 'react';
import { locationApi } from '../services/locationApi';
import type { Country, State, City, LocationSearchResult } from '../types/location';
import { MapPin, Search, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface LocationSelectorProps {
  countryId?: number | null;
  stateId?: number | null;
  cityId?: number | null;
  countryName: string;
  stateName?: string;
  cityName: string;
  address: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
  onChange: (updates: {
    country_id?: number | null;
    state_id?: number | null;
    city_id?: number | null;
    country: string;
    state?: string;
    city: string;
    address: string;
    postal_code?: string;
    latitude?: number | null;
    longitude?: number | null;
  }) => void;
  showValidation?: boolean;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  countryId,
  stateId,
  cityId,
  countryName,
  stateName,
  cityName,
  address,
  postalCode,
  latitude,
  longitude,
  onChange,
  showValidation = true,
}) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Search autocomplete state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Validation state
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  // Load initial countries
  useEffect(() => {
    loadCountries();
  }, []);

  // When countryId changes, load states and cities
  useEffect(() => {
    if (countryId) {
      loadStates(countryId);
      loadCities(countryId, stateId ?? undefined);
    } else {
      setStates([]);
      setCities([]);
    }
  }, [countryId]);

  // When stateId changes within a country, re-filter cities
  useEffect(() => {
    if (countryId) {
      loadCities(countryId, stateId ?? undefined);
    }
  }, [stateId]);

  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      const res = await locationApi.getCountries();
      if (res.success && res.data) {
        setCountries(res.data);
      }
    } catch (err) {
      console.warn('Could not load countries:', err);
    } finally {
      setLoadingCountries(false);
    }
  };

  const loadStates = async (cid: number) => {
    try {
      setLoadingStates(true);
      const res = await locationApi.getStatesByCountry(cid);
      if (res.success && res.data) {
        setStates(res.data);
      } else {
        setStates([]);
      }
    } catch {
      setStates([]);
    } finally {
      setLoadingStates(false);
    }
  };

  const loadCities = async (cid: number, sid?: number) => {
    try {
      setLoadingCities(true);
      let res;
      if (sid) {
        res = await locationApi.getCitiesByState(sid);
      } else {
        res = await locationApi.getCitiesByCountry(cid);
      }
      if (res.success && res.data) {
        setCities(res.data);
      } else {
        setCities([]);
      }
    } catch {
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  // Search autocomplete handler
  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      const res = await locationApi.searchLocations(val);
      if (res.success && res.data) {
        setSearchResults(res.data);
        setShowSearchResults(true);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = (item: LocationSearchResult) => {
    const selectedCountry = countries.find((c) => c.id === item.country_id);

    onChange({
      country_id: item.country_id,
      state_id: item.state_id || null,
      city_id: item.city_id || null,
      country: selectedCountry ? selectedCountry.name : countryName,
      state: item.type === 'state' ? item.name : stateName,
      city: item.type === 'city' ? item.name : cityName,
      address,
      postal_code: postalCode,
      latitude: item.latitude || latitude,
      longitude: item.longitude || longitude,
    });

    setSearchQuery(item.title);
    setShowSearchResults(false);
    setValidationStatus('idle');
  };

  const handleCountrySelect = (cid: number) => {
    const found = countries.find((c) => c.id === cid);
    onChange({
      country_id: cid,
      state_id: null,
      city_id: null,
      country: found ? found.name : '',
      state: '',
      city: '',
      address,
      postal_code: postalCode,
      latitude: found?.latitude ?? null,
      longitude: found?.longitude ?? null,
    });
    setValidationStatus('idle');
  };

  const handleStateSelect = (sid: number | null) => {
    const foundState = states.find((s) => s.id === sid);
    onChange({
      country_id: countryId,
      state_id: sid,
      city_id: null,
      country: countryName,
      state: foundState ? foundState.name : '',
      city: '',
      address,
      postal_code: postalCode,
      latitude: foundState?.latitude ?? latitude,
      longitude: foundState?.longitude ?? longitude,
    });
    setValidationStatus('idle');
  };

  const handleCitySelect = (cid: number | null) => {
    const foundCity = cities.find((c) => c.id === cid);
    onChange({
      country_id: countryId,
      state_id: foundCity?.state_id || stateId,
      city_id: cid,
      country: countryName,
      state: foundCity?.state?.name || stateName,
      city: foundCity ? foundCity.name : '',
      address,
      postal_code: postalCode || foundCity?.postal_code_pattern || '',
      latitude: foundCity?.latitude ?? latitude,
      longitude: foundCity?.longitude ?? longitude,
    });
    setValidationStatus('idle');
  };

  const handleValidateLocation = async () => {
    if (!countryId || !address.trim()) {
      setValidationStatus('invalid');
      setValidationMessage('Country and street address are required to validate.');
      return;
    }

    try {
      setValidationStatus('validating');
      setValidationMessage(null);
      const res = await locationApi.validateLocation({
        country_id: countryId,
        state_id: stateId,
        city_id: cityId,
        address,
        postal_code: postalCode,
        latitude,
        longitude,
      });

      if (res.success && res.data) {
        setValidationStatus('valid');
        setValidationMessage(`Verified: ${res.data.formatted_address}`);
        if (res.data.latitude && res.data.longitude && (!latitude || !longitude)) {
          onChange({
            country_id: countryId,
            state_id: stateId,
            city_id: cityId,
            country: countryName,
            state: stateName,
            city: cityName,
            address,
            postal_code: postalCode,
            latitude: res.data.latitude,
            longitude: res.data.longitude,
          });
        }
      }
    } catch (err: any) {
      setValidationStatus('invalid');
      setValidationMessage(err.message || 'Location validation failed.');
    }
  };

  return (
    <div className="location-selector-component space-y-4">
      {/* Quick Location Autocomplete Search */}
      <div className="relative">
        <label className="form-label text-xs font-semibold text-gray-600 mb-1 block">
          Quick Destination Search
        </label>
        <div className="search-pill-wrapper flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <Search size={16} className="text-gray-400 mr-2 flex-shrink-0" />
          <input
            type="text"
            className="w-full bg-transparent border-none outline-none text-sm"
            placeholder="Type a city or destination (e.g. Positano, Amalfi, Zermatt, Los Angeles)..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
          />
          {isSearching && <Loader2 size={16} className="animate-spin text-gray-400 ml-2" />}
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 z-30 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
            {searchResults.map((item, idx) => (
              <div
                key={idx}
                className="px-3 py-2 text-sm hover:bg-rose-50 hover:text-rose-700 cursor-pointer flex items-center justify-between border-b last:border-b-0 border-gray-100"
                onClick={() => selectSearchResult(item)}
              >
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-rose-500" />
                  <span className="font-medium">{item.title}</span>
                </div>
                <span className="text-[11px] uppercase tracking-wider text-gray-400 px-1.5 py-0.5 rounded bg-gray-100">
                  {item.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Country, State, City Cascaded Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Country */}
        <div className="form-group">
          <label className="form-label text-xs font-semibold">Country *</label>
          <select
            className="form-input text-sm"
            value={countryId || ''}
            onChange={(e) => handleCountrySelect(Number(e.target.value))}
            disabled={loadingCountries}
          >
            <option value="">Select Country</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        {/* State / Province */}
        <div className="form-group">
          <label className="form-label text-xs font-semibold">
            State / Province {loadingStates && <Loader2 size={12} className="inline animate-spin ml-1" />}
          </label>
          <select
            className="form-input text-sm"
            value={stateId || ''}
            onChange={(e) => handleStateSelect(e.target.value ? Number(e.target.value) : null)}
            disabled={!countryId || states.length === 0}
          >
            <option value="">{states.length === 0 ? 'No states listed' : 'Select State / Province'}</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.code ? `(${s.code})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* City */}
        <div className="form-group">
          <label className="form-label text-xs font-semibold">
            City * {loadingCities && <Loader2 size={12} className="inline animate-spin ml-1" />}
          </label>
          <select
            className="form-input text-sm"
            value={cityId || ''}
            onChange={(e) => handleCitySelect(e.target.value ? Number(e.target.value) : null)}
            disabled={!countryId || cities.length === 0}
          >
            <option value="">{cities.length === 0 ? 'Select or type custom' : 'Select City'}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name} {city.is_popular ? '★' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Street Address & Postal Code */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 form-group">
          <label className="form-label text-xs font-semibold">Street Address *</label>
          <input
            type="text"
            className="form-input text-sm"
            placeholder="e.g. Via Panoramica 42 or 742 Evergreen Terrace"
            value={address}
            onChange={(e) =>
              onChange({
                country_id: countryId,
                state_id: stateId,
                city_id: cityId,
                country: countryName,
                state: stateName,
                city: cityName,
                address: e.target.value,
                postal_code: postalCode,
                latitude,
                longitude,
              })
            }
          />
        </div>

        <div className="form-group">
          <label className="form-label text-xs font-semibold">Postal / ZIP Code</label>
          <input
            type="text"
            className="form-input text-sm"
            placeholder="e.g. 84017 or 90210"
            value={postalCode || ''}
            onChange={(e) =>
              onChange({
                country_id: countryId,
                state_id: stateId,
                city_id: cityId,
                country: countryName,
                state: stateName,
                city: cityName,
                address,
                postal_code: e.target.value,
                latitude,
                longitude,
              })
            }
          />
        </div>
      </div>

      {/* Location Validation Button & Feedback Banner */}
      {showValidation && (
        <div className="pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              Ensure the selected location matches geographical boundaries.
            </span>
            <button
              type="button"
              className="btn btn-secondary text-xs py-1 px-3"
              onClick={handleValidateLocation}
              disabled={validationStatus === 'validating' || !countryId || !address.trim()}
            >
              {validationStatus === 'validating' ? (
                <>
                  <Loader2 size={13} className="animate-spin mr-1 inline" /> Validating...
                </>
              ) : (
                'Validate Address'
              )}
            </button>
          </div>

          {validationStatus === 'valid' && (
            <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
              <span>{validationMessage || 'Location verified successfully!'}</span>
            </div>
          )}

          {validationStatus === 'invalid' && (
            <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
              <span>{validationMessage || 'Invalid location. Please check country, state, and city.'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
