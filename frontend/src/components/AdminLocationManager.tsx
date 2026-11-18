import React, { useState, useEffect } from 'react';
import { locationApi } from '../services/locationApi';
import type { Country, State, City } from '../types/location';
import {
  Globe,
  MapPin,
  Building,
  Plus,
  Trash2,
  Edit2,
  X,
  Star,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const AdminLocationManager: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'countries' | 'states' | 'cities'>('countries');

  // Lists State
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter state for states and cities
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<number | 'all'>('all');
  const [selectedStateFilter, setSelectedStateFilter] = useState<number | 'all'>('all');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [cRes, sRes, ctRes] = await Promise.all([
        locationApi.getCountries(true),
        locationApi.getStates(undefined, true),
        locationApi.getCities({ all: true }),
      ]);

      if (cRes.success && cRes.data) setCountries(cRes.data);
      if (sRes.success && sRes.data) setStates(sRes.data);
      if (ctRes.success && ctRes.data) setCities(ctRes.data);
    } catch (err: any) {
      console.warn('Could not load location records:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormError(null);
    if (activeSubTab === 'countries') {
      setFormData({ name: '', code: '', phone_code: '', currency: 'USD', latitude: '', longitude: '', is_active: true });
    } else if (activeSubTab === 'states') {
      setFormData({
        country_id: selectedCountryFilter !== 'all' ? selectedCountryFilter : (countries[0]?.id || ''),
        name: '',
        code: '',
        latitude: '',
        longitude: '',
        is_active: true,
      });
    } else {
      setFormData({
        country_id: selectedCountryFilter !== 'all' ? selectedCountryFilter : (countries[0]?.id || ''),
        state_id: selectedStateFilter !== 'all' ? selectedStateFilter : '',
        name: '',
        postal_code_pattern: '',
        latitude: '',
        longitude: '',
        is_popular: false,
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingItem(item);
    setFormError(null);
    setFormData({ ...item });
    setShowModal(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);

    try {
      if (activeSubTab === 'countries') {
        if (editingItem) {
          await locationApi.updateCountry(editingItem.id, formData);
          setActionSuccess(`Country ${formData.name} updated.`);
        } else {
          await locationApi.createCountry(formData);
          setActionSuccess(`Country ${formData.name} created.`);
        }
      } else if (activeSubTab === 'states') {
        if (editingItem) {
          await locationApi.updateState(editingItem.id, formData);
          setActionSuccess(`State ${formData.name} updated.`);
        } else {
          await locationApi.createState(formData);
          setActionSuccess(`State ${formData.name} created.`);
        }
      } else {
        if (editingItem) {
          await locationApi.updateCity(editingItem.id, formData);
          setActionSuccess(`City ${formData.name} updated.`);
        } else {
          await locationApi.createCity(formData);
          setActionSuccess(`City ${formData.name} created.`);
        }
      }

      setShowModal(false);
      await loadAllData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setFormError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) return;

    try {
      if (activeSubTab === 'countries') {
        await locationApi.deleteCountry(id);
      } else if (activeSubTab === 'states') {
        await locationApi.deleteState(id);
      } else {
        await locationApi.deleteCity(id);
      }
      setActionSuccess(`${name} deleted.`);
      await loadAllData();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete record.');
    }
  };

  // Filtered views
  const filteredStates = states.filter((s) =>
    selectedCountryFilter === 'all' ? true : s.country_id === selectedCountryFilter
  );

  const filteredCities = cities.filter((c) => {
    const matchCountry = selectedCountryFilter === 'all' ? true : c.country_id === selectedCountryFilter;
    const matchState = selectedStateFilter === 'all' ? true : c.state_id === selectedStateFilter;
    return matchCountry && matchState;
  });

  return (
    <div className="admin-location-manager-container p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="text-rose-500" size={22} />
            Location & Geographic Data Manager
          </h2>
          <p className="text-sm text-gray-500">
            Control platform countries, administrative states, cities, coordinates, and regional coverage.
          </p>
        </div>
        <button className="btn btn-primary flex items-center gap-2" onClick={handleOpenAddModal}>
          <Plus size={16} />
          <span>Add {activeSubTab === 'countries' ? 'Country' : activeSubTab === 'states' ? 'State' : 'City'}</span>
        </button>
      </div>

      {/* Success banner */}
      {actionSuccess && (
        <div className="my-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 my-5 border-b border-gray-200">
        <button
          className={`pb-3 px-3 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
            activeSubTab === 'countries'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
          onClick={() => setActiveSubTab('countries')}
        >
          <Globe size={16} />
          <span>Countries ({countries.length})</span>
        </button>
        <button
          className={`pb-3 px-3 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
            activeSubTab === 'states'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
          onClick={() => setActiveSubTab('states')}
        >
          <Building size={16} />
          <span>States / Provinces ({states.length})</span>
        </button>
        <button
          className={`pb-3 px-3 text-sm font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
            activeSubTab === 'cities'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
          onClick={() => setActiveSubTab('cities')}
        >
          <MapPin size={16} />
          <span>Cities ({cities.length})</span>
        </button>
      </div>

      {/* State & City Filter Bar */}
      {activeSubTab !== 'countries' && (
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
          <span className="font-semibold text-gray-700">Filter By Country:</span>
          <select
            className="form-input text-xs py-1"
            value={selectedCountryFilter}
            onChange={(e) => {
              const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
              setSelectedCountryFilter(val);
              setSelectedStateFilter('all');
            }}
          >
            <option value="all">All Countries</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>

          {activeSubTab === 'cities' && selectedCountryFilter !== 'all' && (
            <>
              <span className="font-semibold text-gray-700 ml-2">State:</span>
              <select
                className="form-input text-xs py-1"
                value={selectedStateFilter}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                  setSelectedStateFilter(val);
                }}
              >
                <option value="all">All States in Country</option>
                {states
                  .filter((s) => s.country_id === selectedCountryFilter)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </>
          )}
        </div>
      )}

      {/* Main Tables */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="animate-spin mb-2" size={28} />
          <p className="text-sm">Loading locations...</p>
        </div>
      ) : activeSubTab === 'countries' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
              <tr>
                <th className="py-3 px-4">Country Name</th>
                <th className="py-3 px-4">ISO Code</th>
                <th className="py-3 px-4">Currency</th>
                <th className="py-3 px-4">Coordinates (Lat, Lng)</th>
                <th className="py-3 px-4">States / Cities</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {countries.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/60">
                  <td className="py-3 px-4 font-semibold text-gray-900">{c.name}</td>
                  <td className="py-3 px-4 text-gray-600 font-mono">{c.code}</td>
                  <td className="py-3 px-4 text-gray-600 font-mono">{c.currency}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs font-mono">
                    {c.latitude ? `${c.latitude}, ${c.longitude}` : 'Not set'}
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-xs">
                    {c.states_count ?? 0} states · {c.cities_count ?? 0} cities · {c.properties_count ?? 0} stays
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        c.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {c.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                        title="Edit Country"
                        onClick={() => handleOpenEditModal(c)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete Country"
                        onClick={() => handleDelete(c.id, c.name)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : activeSubTab === 'states' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
              <tr>
                <th className="py-3 px-4">State / Province</th>
                <th className="py-3 px-4">Country</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Coordinates</th>
                <th className="py-3 px-4">Cities</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStates.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/60">
                  <td className="py-3 px-4 font-semibold text-gray-900">{s.name}</td>
                  <td className="py-3 px-4 text-gray-600">{s.country?.name}</td>
                  <td className="py-3 px-4 text-gray-600 font-mono">{s.code || '-'}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs font-mono">
                    {s.latitude ? `${s.latitude}, ${s.longitude}` : 'Not set'}
                  </td>
                  <td className="py-3 px-4 text-gray-600 text-xs">
                    {s.cities_count ?? 0} cities · {s.properties_count ?? 0} stays
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                        title="Edit State"
                        onClick={() => handleOpenEditModal(s)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete State"
                        onClick={() => handleDelete(s.id, s.name)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
              <tr>
                <th className="py-3 px-4">City Name</th>
                <th className="py-3 px-4">Country / State</th>
                <th className="py-3 px-4">Postal Pattern</th>
                <th className="py-3 px-4">Coordinates</th>
                <th className="py-3 px-4">Popular</th>
                <th className="py-3 px-4">Stays</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCities.map((city) => (
                <tr key={city.id} className="hover:bg-gray-50/60">
                  <td className="py-3 px-4 font-semibold text-gray-900">{city.name}</td>
                  <td className="py-3 px-4 text-gray-600 text-xs">
                    {city.country?.name} {city.state ? `· ${city.state.name}` : ''}
                  </td>
                  <td className="py-3 px-4 text-gray-500 text-xs font-mono">{city.postal_code_pattern || '-'}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs font-mono">
                    {city.latitude ? `${city.latitude}, ${city.longitude}` : 'Not set'}
                  </td>
                  <td className="py-3 px-4">
                    {city.is_popular ? (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold">
                        <Star size={13} className="fill-amber-400 text-amber-400" /> Featured
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-700 text-xs font-semibold">{city.properties_count ?? 0}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                        title="Edit City"
                        onClick={() => handleOpenEditModal(city)}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete City"
                        onClick={() => handleDelete(city.id, city.name)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container p-6 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b mb-4">
              <h3 className="font-bold text-gray-900 text-base">
                {editingItem ? 'Edit' : 'Add New'}{' '}
                {activeSubTab === 'countries' ? 'Country' : activeSubTab === 'states' ? 'State' : 'City'}
              </h3>
              <button className="icon-action-btn" onClick={() => setShowModal(false)}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-3">
              {/* Country Selection for State & City */}
              {activeSubTab !== 'countries' && (
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Country *</label>
                  <select
                    className="form-input text-xs"
                    value={formData.country_id || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        country_id: Number(e.target.value),
                        state_id: '',
                      })
                    }
                    required
                  >
                    <option value="">Select Country</option>
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* State Selection for City */}
              {activeSubTab === 'cities' && (
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">State / Province</label>
                  <select
                    className="form-input text-xs"
                    value={formData.state_id || ''}
                    onChange={(e) => setFormData({ ...formData, state_id: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">None / Direct to Country</option>
                    {states
                      .filter((s) => !formData.country_id || s.country_id === Number(formData.country_id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Name */}
              <div className="form-group">
                <label className="form-label text-xs font-semibold">Name *</label>
                <input
                  type="text"
                  className="form-input text-xs"
                  placeholder="e.g. Italy, California, or Positano"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Code */}
              {activeSubTab !== 'cities' && (
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">
                    {activeSubTab === 'countries' ? 'ISO Code (2/3 Letters) *' : 'State Code (e.g. CA, NY)'}
                  </label>
                  <input
                    type="text"
                    className="form-input text-xs uppercase"
                    maxLength={activeSubTab === 'countries' ? 3 : 10}
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required={activeSubTab === 'countries'}
                  />
                </div>
              )}

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-2">
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="form-input text-xs font-mono"
                    placeholder="34.052234"
                    value={formData.latitude ?? ''}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-xs font-semibold">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="form-input text-xs font-mono"
                    placeholder="-118.243685"
                    value={formData.longitude ?? ''}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-rose-600 rounded"
                    checked={formData.is_active ?? true}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  <span>Active in Platform</span>
                </label>

                {activeSubTab === 'cities' && (
                  <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-rose-600 rounded"
                      checked={formData.is_popular ?? false}
                      onChange={(e) => setFormData({ ...formData, is_popular: e.target.checked })}
                    />
                    <span>Featured Destination</span>
                  </label>
                )}
              </div>

              <div className="pt-4 border-t flex items-center justify-end gap-2">
                <button type="button" className="btn btn-secondary text-xs" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary text-xs" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
