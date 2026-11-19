import React, { useState, useEffect } from 'react';
import type { Property } from '../types/property';
import type { PropertyPricingRules, SeasonalPriceRule, CreateSeasonalRulePayload } from '../types/pricing';
import { pricingApi } from '../services/pricingApi';
import {
  X,
  DollarSign,
  Calendar,
  Percent,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Layers,
} from 'lucide-react';

interface HostPricingSettingsModalProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export const HostPricingSettingsModal: React.FC<HostPricingSettingsModalProps> = ({
  property,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'base' | 'fees' | 'seasonal'>('base');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pricing rules state
  const [rules, setRules] = useState<Partial<PropertyPricingRules>>({
    price_per_night: property.price_per_night,
    weekend_price: property.weekend_price ?? null,
    cleaning_fee: property.cleaning_fee ?? 0,
    extra_guest_fee: property.extra_guest_fee ?? 0,
    extra_guest_threshold: property.extra_guest_threshold ?? 2,
    pet_fee: property.pet_fee ?? 0,
    security_deposit: property.security_deposit ?? 0,
    weekly_discount_percent: property.weekly_discount_percent ?? 0,
    monthly_discount_percent: property.monthly_discount_percent ?? 0,
    tax_percent: property.tax_percent ?? 0,
    min_nights: property.min_nights ?? 1,
    max_nights: property.max_nights ?? 30,
    currency: property.currency || 'USD',
  });

  // Seasonal rules state
  const [seasonalRules, setSeasonalRules] = useState<SeasonalPriceRule[]>([]);
  const [showAddSeason, setShowAddSeason] = useState(false);
  const [newSeason, setNewSeason] = useState<CreateSeasonalRulePayload>({
    name: '',
    start_date: '',
    end_date: '',
    price_per_night: property.price_per_night,
    weekend_price: property.weekend_price ?? null,
    min_nights: property.min_nights ?? 2,
    is_active: true,
  });

  useEffect(() => {
    if (isOpen) {
      loadPricingData();
    }
  }, [isOpen, property.id]);

  const loadPricingData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pricingRes, seasonalRes] = await Promise.all([
        pricingApi.getPricingRules(property.id),
        pricingApi.getSeasonalPrices(property.id),
      ]);

      if (pricingRes.success && pricingRes.data?.pricing) {
        setRules(pricingRes.data.pricing);
      }
      if (seasonalRes.success && seasonalRes.data) {
        setSeasonalRules(seasonalRes.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load pricing data.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await pricingApi.updatePricingRules(property.id, rules);
      if (res.success) {
        setSuccessMsg('Pricing rules saved successfully.');
        if (onUpdated) onUpdated();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save pricing rules.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddSeasonalRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeason.name || !newSeason.start_date || !newSeason.end_date) {
      setError('Please provide season name, start date, and end date.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await pricingApi.createSeasonalPrice(property.id, newSeason);
      if (res.success && res.data) {
        const createdRule = res.data;
        setSeasonalRules((prev) => [...prev, createdRule]);
        setShowAddSeason(false);
        setNewSeason({
          name: '',
          start_date: '',
          end_date: '',
          price_per_night: rules.price_per_night || 100,
          weekend_price: rules.weekend_price || null,
          min_nights: rules.min_nights || 2,
          is_active: true,
        });
        setSuccessMsg('Seasonal price rule added.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create seasonal price rule.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSeason = async (ruleId: number) => {
    if (!confirm('Are you sure you want to delete this seasonal pricing rule?')) return;
    try {
      const res = await pricingApi.deleteSeasonalPrice(property.id, ruleId);
      if (res.success) {
        setSeasonalRules((prev) => prev.filter((r) => r.id !== ruleId));
        setSuccessMsg('Seasonal price rule deleted.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete seasonal rule.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-500">
              <DollarSign size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Pricing & Stay Rules</h2>
              <p className="text-xs text-slate-500">{property.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 gap-6 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('base')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'base'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign size={16} />
            Base & Stay Rules
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fees')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'fees'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={16} />
            Fees & Discounts
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('seasonal')}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'seasonal'
                ? 'border-rose-500 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles size={16} />
            Seasonal Pricing ({seasonalRules.length})
          </button>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-16 flex items-center justify-center text-slate-400 gap-2">
              <Loader2 size={24} className="animate-spin text-rose-500" />
              <span>Loading pricing rules...</span>
            </div>
          ) : activeTab === 'base' ? (
            <form id="rulesForm" onSubmit={handleSaveRules} className="space-y-6">
              {/* Standard Rates */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <DollarSign size={16} className="text-emerald-600" />
                  Nightly Rates
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Standard Nightly Price ($) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={rules.price_per_night || ''}
                      onChange={(e) => setRules({ ...rules, price_per_night: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm"
                    />
                    <span className="text-[11px] text-slate-400">Sun - Thu base rate</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Weekend Nightly Price ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Optional premium rate"
                      value={rules.weekend_price ?? ''}
                      onChange={(e) => setRules({ ...rules, weekend_price: e.target.value ? parseFloat(e.target.value) : null })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm"
                    />
                    <span className="text-[11px] text-slate-400">Applies to Friday & Saturday nights</span>
                  </div>
                </div>
              </div>

              {/* Stay rules */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Calendar size={16} className="text-blue-600" />
                  Stay Limits
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Minimum Stay (Nights) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={rules.min_nights || 1}
                      onChange={(e) => setRules({ ...rules, min_nights: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Maximum Stay (Nights)
                    </label>
                    <input
                      type="number"
                      min={rules.min_nights || 1}
                      value={rules.max_nights ?? ''}
                      onChange={(e) => setRules({ ...rules, max_nights: e.target.value ? parseInt(e.target.value, 10) : null })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </form>
          ) : activeTab === 'fees' ? (
            <form id="rulesForm" onSubmit={handleSaveRules} className="space-y-6">
              {/* Additional Fees */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Layers size={16} className="text-purple-600" />
                  Additional Charges & Security
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Cleaning Fee ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={rules.cleaning_fee ?? 0}
                      onChange={(e) => setRules({ ...rules, cleaning_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Pet Fee ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={rules.pet_fee ?? 0}
                      onChange={(e) => setRules({ ...rules, pet_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Security Deposit ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={rules.security_deposit ?? 0}
                      onChange={(e) => setRules({ ...rules, security_deposit: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                    <span className="text-[10px] text-slate-400">Refundable upon checkout</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Extra Guest Fee ($ per guest/night)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={rules.extra_guest_fee ?? 0}
                      onChange={(e) => setRules({ ...rules, extra_guest_fee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Extra Guest Threshold
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={rules.extra_guest_threshold ?? 2}
                      onChange={(e) => setRules({ ...rules, extra_guest_threshold: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                    <span className="text-[10px] text-slate-400">Charge applies above this guest count</span>
                  </div>
                </div>
              </div>

              {/* Discounts & Taxes */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Percent size={16} className="text-amber-600" />
                  Long-Stay Discounts & Taxes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Weekly Discount (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={rules.weekly_discount_percent ?? 0}
                      onChange={(e) => setRules({ ...rules, weekly_discount_percent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                    <span className="text-[10px] text-slate-400">Stays 7+ nights</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Monthly Discount (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={rules.monthly_discount_percent ?? 0}
                      onChange={(e) => setRules({ ...rules, monthly_discount_percent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                    <span className="text-[10px] text-slate-400">Stays 28+ nights</span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Occupancy Tax (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={rules.tax_percent ?? 0}
                      onChange={(e) => setRules({ ...rules, tax_percent: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm"
                    />
                  </div>
                </div>
              </div>
            </form>
          ) : (
            /* Seasonal Pricing tab */
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Seasonal & Holiday Rules</h3>
                  <p className="text-xs text-slate-500">
                    Custom rates that automatically take precedence during specific date ranges.
                  </p>
                </div>
                {!showAddSeason && (
                  <button
                    type="button"
                    onClick={() => setShowAddSeason(true)}
                    className="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus size={15} />
                    Add Season
                  </button>
                )}
              </div>

              {/* Add form */}
              {showAddSeason && (
                <form
                  onSubmit={handleAddSeasonalRule}
                  className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4 animate-fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      New Seasonal Rule
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddSeason(false)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3">
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Season Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Summer Peak 2026"
                        value={newSeason.name}
                        onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Start Date *</label>
                      <input
                        type="date"
                        required
                        value={newSeason.start_date}
                        onChange={(e) => setNewSeason({ ...newSeason, start_date: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">End Date *</label>
                      <input
                        type="date"
                        required
                        value={newSeason.end_date}
                        onChange={(e) => setNewSeason({ ...newSeason, end_date: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Nightly Price ($) *</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newSeason.price_per_night}
                        onChange={(e) => setNewSeason({ ...newSeason, price_per_night: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 text-xs border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Weekend Price ($)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Optional"
                        value={newSeason.weekend_price ?? ''}
                        onChange={(e) => setNewSeason({ ...newSeason, weekend_price: e.target.value ? parseFloat(e.target.value) : null })}
                        className="w-full px-3 py-1.5 text-xs border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">Min Nights</label>
                      <input
                        type="number"
                        min="1"
                        value={newSeason.min_nights ?? 2}
                        onChange={(e) => setNewSeason({ ...newSeason, min_nights: parseInt(e.target.value, 10) || 1 })}
                        className="w-full px-3 py-1.5 text-xs border rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddSeason(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      Save Rule
                    </button>
                  </div>
                </form>
              )}

              {/* List */}
              <div className="space-y-2.5">
                {seasonalRules.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs border border-dashed rounded-xl">
                    No seasonal pricing rules configured yet.
                  </div>
                ) : (
                  seasonalRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-sm hover:border-slate-300 transition-all"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{rule.name}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-700 font-semibold rounded-full border border-purple-200">
                            Active
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {rule.start_date} to {rule.end_date}
                          {rule.min_nights && ` • Min ${rule.min_nights} nights`}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-slate-900">
                            ${rule.price_per_night} / night
                          </div>
                          {rule.weekend_price && (
                            <div className="text-[11px] text-slate-400">
                              Weekend: ${rule.weekend_price}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSeason(rule.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete Season"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-xl font-semibold transition-colors"
          >
            Close
          </button>
          {activeTab !== 'seasonal' && (
            <button
              type="submit"
              form="rulesForm"
              disabled={saving}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : null}
              Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
