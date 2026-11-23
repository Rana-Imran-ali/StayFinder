import React, { useState, useEffect } from 'react';
import { propertyApi } from '../services/propertyApi';
import type { Amenity, CreatePropertyPayload } from '../types/property';
import { LocationSelector } from './LocationSelector';
import { MapLocationPicker } from './MapLocationPicker';
import {
  X,
  AlertCircle,
  Upload,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Sparkles
} from 'lucide-react';

interface CreatePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const PROPERTY_TYPES: Array<CreatePropertyPayload['property_type']> = [
  'apartment',
  'house',
  'villa',
  'cabin',
  'cottage',
  'loft',
  'hotel',
];

const ROOM_TYPES: Array<{ value: CreatePropertyPayload['room_type']; label: string }> = [
  { value: 'entire_place', label: 'Entire place' },
  { value: 'private_room', label: 'Private room' },
  { value: 'shared_room', label: 'Shared room' },
];

export const CreatePropertyModal: React.FC<CreatePropertyModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;

  // Form State
  const [formData, setFormData] = useState<CreatePropertyPayload>({
    title: '',
    description: '',
    property_type: 'apartment',
    room_type: 'entire_place',
    price_per_night: 120,
    weekend_price: 140,
    cleaning_fee: 35,
    min_nights: 2,
    address: '',
    city: '',
    state: '',
    country: 'United States',
    postal_code: '',
    max_guests: 4,
    bedrooms: 2,
    beds: 2,
    bathrooms: 1,
    instant_bookable: true,
    cancellation_policy: 'flexible',
    amenities: [],
  });

  const [availableAmenities, setAvailableAmenities] = useState<Record<string, Amenity[]>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loadingAmenities, setLoadingAmenities] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAmenities();
    }
  }, [isOpen]);

  const loadAmenities = async () => {
    try {
      setLoadingAmenities(true);
      const res = await propertyApi.getAmenities();
      if (res.success && res.data) {
        setAvailableAmenities(res.data);
      }
    } catch (err: any) {
      console.warn('Could not load amenities catalog:', err);
    } finally {
      setLoadingAmenities(false);
    }
  };

  if (!isOpen) return null;

  const handleInputChange = (field: keyof CreatePropertyPayload, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrorMessage(null);
  };

  const toggleAmenity = (id: number) => {
    const existing = formData.amenities || [];
    if (existing.includes(id)) {
      handleInputChange('amenities', existing.filter((item) => item !== id));
    } else {
      handleInputChange('amenities', [...existing, id]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      const newUrls = filesArray.map((f) => URL.createObjectURL(f));
      setSelectedFiles((prev) => [...prev, ...filesArray]);
      setPreviewUrls((prev) => [...prev, ...newUrls]);
    }
  };

  const removeSelectedFile = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLoadDummyPhotos = () => {
    const titles = [
      { text: 'Living Room & Ocean Terrace', color1: '#0f172a', color2: '#2563eb' },
      { text: 'Master Bedroom King Suite', color1: '#064e3b', color2: '#10b981' },
      { text: 'Gourmet Chef Kitchen', color1: '#7c2d12', color2: '#f97316' },
      { text: 'Luxury Spa Bathroom', color1: '#4c1d95', color2: '#a855f7' },
    ];

    titles.forEach((item, index) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 1200, 800);
        gradient.addColorStop(0, item.color1);
        gradient.addColorStop(1, item.color2);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1200, 800);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        for (let i = 0; i < 1200; i += 60) {
          ctx.fillRect(i, 0, 30, 800);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 50px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.text, 600, 380);

        ctx.font = '28px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        ctx.fillText('StayFinder Demo Photo • Verified Listing', 600, 440);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `sample-photo-${index + 1}.png`, { type: 'image/png' });
            const url = URL.createObjectURL(file);
            setSelectedFiles((prev) => [...prev, file]);
            setPreviewUrls((prev) => [...prev, url]);
          }
        }, 'image/png');
      }
    });
  };

  // Step Validation
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.title.trim()) {
          setErrorMessage('Please provide a descriptive listing title.');
          return false;
        }
        if (!formData.description.trim() || formData.description.length < 20) {
          setErrorMessage('Description must be at least 20 characters.');
          return false;
        }
        return true;
      case 2:
        if (!formData.address.trim() || !formData.city.trim() || !formData.country.trim()) {
          setErrorMessage('Address, City, and Country are required.');
          return false;
        }
        return true;
      case 3:
        if (formData.max_guests < 1 || formData.bedrooms < 0 || formData.beds < 1 || formData.bathrooms < 0.5) {
          setErrorMessage('Please provide valid guest capacity, bedrooms, beds and bathrooms.');
          return false;
        }
        return true;
      case 6:
        if (formData.price_per_night < 1) {
          setErrorMessage('Price per night must be at least $1.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setErrorMessage(null);
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    try {
      setSubmitting(true);
      setErrorMessage(null);

      // 1. Create property listing
      const res = await propertyApi.createProperty(formData);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'Failed to create listing.');
      }

      const createdPropertyId = res.data.id;

      // 2. Upload photos if selected
      if (selectedFiles.length > 0) {
        try {
          await propertyApi.uploadPropertyImages(createdPropertyId, selectedFiles);
        } catch (imgErr: any) {
          console.warn('Listing was created but photo upload encountered an issue:', imgErr);
        }
      }

      onCreated();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while publishing your property.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container create-property-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="text-xl font-bold text-gray-900">List Your Space on StayFinder</h2>
            <p className="text-sm text-gray-500">Step {currentStep} of {totalSteps}: {getStepTitle(currentStep)}</p>
          </div>
          <button className="icon-action-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="wizard-progress-bar">
          <div
            className="wizard-progress-fill"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Error banner */}
        {errorMessage && (
          <div className="form-error-banner flex items-center gap-2 m-4 p-3 rounded-lg bg-rose-50 text-rose-700 text-sm border border-rose-200">
            <AlertCircle size={18} className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step Body */}
        <div className="modal-scrollable-content wizard-body">
          {currentStep === 1 && (
            <div className="wizard-step-content space-y-4">
              <div className="form-group">
                <label className="form-label">Listing Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Modern Sunset Loft with Skyline Views"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  maxLength={150}
                />
                <span className="text-xs text-gray-400">Catchy titles attract more guests</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Property Type *</label>
                  <select
                    className="form-input capitalize"
                    value={formData.property_type}
                    onChange={(e) => handleInputChange('property_type', e.target.value as any)}
                  >
                    {PROPERTY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Room Type *</label>
                  <select
                    className="form-input"
                    value={formData.room_type}
                    onChange={(e) => handleInputChange('room_type', e.target.value as any)}
                  >
                    {ROOM_TYPES.map((rt) => (
                      <option key={rt.value} value={rt.value}>
                        {rt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea
                  className="form-textarea"
                  rows={4}
                  placeholder="Describe the atmosphere, standout features, neighborhood highlights, and what makes your stay unique..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
                <span className="text-xs text-gray-400">At least 20 characters</span>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="wizard-step-content space-y-4">
              <p className="text-xs text-gray-500 mb-1">
                Choose your country, state, and city from the verified platform database, or type an address to pinpoint on the interactive map.
              </p>

              <LocationSelector
                countryId={formData.country_id}
                stateId={formData.state_id}
                cityId={formData.city_id}
                countryName={formData.country}
                stateName={formData.state}
                cityName={formData.city}
                address={formData.address}
                postalCode={formData.postal_code}
                latitude={formData.latitude}
                longitude={formData.longitude}
                onChange={(loc) => {
                  setFormData((prev) => ({
                    ...prev,
                    country_id: loc.country_id,
                    state_id: loc.state_id,
                    city_id: loc.city_id,
                    country: loc.country,
                    state: loc.state,
                    city: loc.city,
                    address: loc.address,
                    postal_code: loc.postal_code,
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                  }));
                }}
              />

              <div className="mt-4 pt-2 border-t border-gray-100">
                <label className="form-label text-xs font-semibold text-gray-700 block mb-1.5">
                  Pin Exact Location on Map
                </label>
                <MapLocationPicker
                  latitude={formData.latitude ?? null}
                  longitude={formData.longitude ?? null}
                  onChange={(lat, lng) => {
                    setFormData((prev) => ({ ...prev, latitude: lat, longitude: lng }));
                  }}
                  addressLabel={formData.address ? `${formData.address}, ${formData.city}` : undefined}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="wizard-step-content space-y-4">
              <p className="text-sm text-gray-600 mb-2">
                Share how many guests can stay comfortably in your property.
              </p>

              <div className="counter-row">
                <div>
                  <span className="font-semibold block text-gray-800">Maximum Guests</span>
                  <span className="text-xs text-gray-400">Total number of people allowed</span>
                </div>
                <div className="counter-controls">
                  <button
                    type="button"
                    className="counter-btn"
                    onClick={() => handleInputChange('max_guests', Math.max(1, formData.max_guests - 1))}
                  >
                    -
                  </button>
                  <span className="counter-val">{formData.max_guests}</span>
                  <button
                    type="button"
                    className="counter-btn"
                    onClick={() => handleInputChange('max_guests', formData.max_guests + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="counter-row">
                <div>
                  <span className="font-semibold block text-gray-800">Bedrooms</span>
                  <span className="text-xs text-gray-400">Number of private sleeping rooms</span>
                </div>
                <div className="counter-controls">
                  <button
                    type="button"
                    className="counter-btn"
                    onClick={() => handleInputChange('bedrooms', Math.max(0, formData.bedrooms - 1))}
                  >
                    -
                  </button>
                  <span className="counter-val">{formData.bedrooms}</span>
                  <button
                    type="button"
                    className="counter-btn"
                    onClick={() => handleInputChange('bedrooms', formData.bedrooms + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="counter-row">
                <div>
                  <span className="font-semibold block text-gray-800">Beds</span>
                  <span className="text-xs text-gray-400">Total beds available</span>
                </div>
                <div className="counter-controls">
                  <button
                    type="button"
                    className="counter-btn"
                    onClick={() => handleInputChange('beds', Math.max(1, formData.beds - 1))}
                  >
                    -
                  </button>
                  <span className="counter-val">{formData.beds}</span>
                  <button
                    type="button"
                    className="counter-btn"
                    onClick={() => handleInputChange('beds', formData.beds + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="counter-row">
                <div>
                  <span className="font-semibold block text-gray-800">Bathrooms</span>
                  <span className="text-xs text-gray-400">Full or half bathrooms</span>
                </div>
                <div className="counter-controls">
                  <button
                    type="button"
                    className="counter-btn"
                    onClick={() => handleInputChange('bathrooms', Math.max(0.5, formData.bathrooms - 0.5))}
                  >
                    -
                  </button>
                  <span className="counter-val">{formData.bathrooms}</span>
                  <button
                    type="button"
                    className="counter-btn"
                    onClick={() => handleInputChange('bathrooms', formData.bathrooms + 0.5)}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="wizard-step-content space-y-4">
              <p className="text-sm text-gray-600">
                Select the amenities your space offers to travelers.
              </p>

              {loadingAmenities ? (
                <div className="py-8 flex justify-center items-center text-gray-500">
                  <Loader2 className="animate-spin mr-2" size={20} /> Loading amenities catalog...
                </div>
              ) : Object.keys(availableAmenities).length > 0 ? (
                Object.entries(availableAmenities).map(([category, items]) => (
                  <div key={category} className="amenity-category-block">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                      {category}
                    </h4>
                    <div className="amenities-selection-grid">
                      {items.map((amenity) => {
                        const isSelected = (formData.amenities || []).includes(amenity.id);
                        return (
                          <div
                            key={amenity.id}
                            className={`amenity-select-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleAmenity(amenity.id)}
                          >
                            <span className="text-sm font-medium">{amenity.name}</span>
                            {isSelected && <Check size={16} className="text-rose-600" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No amenities found in catalog.</p>
              )}
            </div>
          )}

          {currentStep === 5 && (
            <div className="wizard-step-content space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Upload photos of your space. High quality photos significantly increase reservations!
                </p>
                <button
                  type="button"
                  onClick={handleLoadDummyPhotos}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-colors flex items-center gap-1.5 shrink-0"
                  title="Quickly fill sample dummy photos for testing"
                >
                  <Sparkles size={14} className="text-rose-500" />
                  <span>Fill Sample Photos</span>
                </button>
              </div>

              <label className="upload-dropzone">
                <Upload size={32} className="text-rose-500 mb-2" />
                <span className="font-semibold text-gray-700">Click to upload photos</span>
                <span className="text-xs text-gray-400 mt-1">PNG, JPG, WEBP up to 5MB each</span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>

              {previewUrls.length > 0 && (
                <div className="photos-preview-grid">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="preview-item">
                      <img src={url} alt={`Preview ${idx + 1}`} />
                      {idx === 0 && <span className="cover-tag">Cover Photo</span>}
                      <button
                        type="button"
                        className="delete-photo-btn"
                        onClick={() => removeSelectedFile(idx)}
                        title="Remove photo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 6 && (
            <div className="wizard-step-content space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Price per Night ($ USD) *</label>
                  <div className="input-with-icon">
                    <span className="icon-prefix">$</span>
                    <input
                      type="number"
                      className="form-input pl-8"
                      min={1}
                      value={formData.price_per_night}
                      onChange={(e) => handleInputChange('price_per_night', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Cleaning Fee ($ USD)</label>
                  <div className="input-with-icon">
                    <span className="icon-prefix">$</span>
                    <input
                      type="number"
                      className="form-input pl-8"
                      min={0}
                      value={formData.cleaning_fee || 0}
                      onChange={(e) => handleInputChange('cleaning_fee', Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Weekend Nightly Price ($ USD)</label>
                  <div className="input-with-icon">
                    <span className="icon-prefix">$</span>
                    <input
                      type="number"
                      className="form-input pl-8"
                      min={0}
                      placeholder="Optional"
                      value={formData.weekend_price ?? ''}
                      onChange={(e) => handleInputChange('weekend_price', e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Minimum Stay (Nights)</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    value={formData.min_nights || 1}
                    onChange={(e) => handleInputChange('min_nights', Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Cancellation Policy</label>
                <select
                  className="form-input capitalize"
                  value={formData.cancellation_policy}
                  onChange={(e) => handleInputChange('cancellation_policy', e.target.value as any)}
                >
                  <option value="flexible">Flexible: Full refund 1 day prior to arrival</option>
                  <option value="moderate">Moderate: Full refund 5 days prior to arrival</option>
                  <option value="strict">Strict: Full refund within 48 hours of booking</option>
                </select>
              </div>

              <div className="checkbox-toggle-card">
                <div>
                  <h4 className="font-semibold text-gray-800">Instant Book</h4>
                  <p className="text-xs text-gray-500">
                    Guests who meet your requirements can book automatically without waiting for host approval.
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-rose-600 rounded"
                  checked={formData.instant_bookable}
                  onChange={(e) => handleInputChange('instant_bookable', e.target.checked)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="modal-footer flex items-center justify-between p-4 border-t border-gray-100">
          {currentStep > 1 ? (
            <button
              type="button"
              className="btn btn-secondary flex items-center gap-1"
              onClick={handleBack}
              disabled={submitting}
            >
              <ChevronLeft size={18} /> Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              className="btn btn-primary flex items-center gap-1"
              onClick={handleNext}
            >
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary flex items-center gap-2"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Publishing...
                </>
              ) : (
                <>
                  <Check size={18} /> Publish Listing
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function getStepTitle(step: number): string {
  switch (step) {
    case 1:
      return 'Property Basics';
    case 2:
      return 'Location';
    case 3:
      return 'Guest Capacity';
    case 4:
      return 'Amenities';
    case 5:
      return 'Photos';
    case 6:
      return 'Pricing & Policies';
    default:
      return '';
  }
}
