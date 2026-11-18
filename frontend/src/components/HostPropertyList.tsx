import React, { useState, useEffect } from 'react';
import { propertyApi } from '../services/propertyApi';
import type { Property } from '../types/property';
import { CreatePropertyModal } from './CreatePropertyModal';
import {
  Plus,
  Building2,
  Trash2,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Upload,
  X
} from 'lucide-react';

interface HostPropertyListProps {
  onSelectProperty?: (property: Property) => void;
}

export const HostPropertyList: React.FC<HostPropertyListProps> = ({ onSelectProperty }) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals & Action States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedForPhotos, setSelectedForPhotos] = useState<Property | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoActionError, setPhotoActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchProperties(currentPage);
  }, [currentPage]);

  const fetchProperties = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await propertyApi.getMyProperties(page);
      if (res.success && res.data) {
        setProperties(res.data.data);
        setCurrentPage(res.data.current_page);
        setLastPage(res.data.last_page);
        setTotalCount(res.data.total);
      } else {
        setProperties([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load your listings.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (propertyId: number, newStatus: 'draft' | 'published' | 'unlisted') => {
    try {
      const res = await propertyApi.changePropertyStatus(propertyId, newStatus);
      if (res.success && res.data) {
        setProperties((prev) =>
          prev.map((p) => (p.id === propertyId ? { ...p, status: newStatus } : p))
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update property status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
      return;
    }
    try {
      setDeletingId(id);
      const res = await propertyApi.deleteProperty(id);
      if (res.success) {
        setProperties((prev) => prev.filter((p) => p.id !== id));
        setTotalCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete listing.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploadPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedForPhotos || !e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);

    try {
      setUploadingPhotos(true);
      setPhotoActionError(null);
      const res = await propertyApi.uploadPropertyImages(selectedForPhotos.id, files);
      if (res.success && res.data) {
        // Update local property with new images
        const updated = res.data;
        setSelectedForPhotos(updated);
        setProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
    } catch (err: any) {
      setPhotoActionError(err.message || 'Failed to upload photos.');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!selectedForPhotos) return;
    try {
      const res = await propertyApi.deletePropertyImage(selectedForPhotos.id, imageId);
      if (res.success && res.data) {
        const updated = res.data;
        setSelectedForPhotos(updated);
        setProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete image');
    }
  };

  const handleSetPrimaryImage = async (imageId: number) => {
    if (!selectedForPhotos) return;
    try {
      const res = await propertyApi.setPrimaryImage(selectedForPhotos.id, imageId);
      if (res.success && res.data) {
        const updated = res.data;
        setSelectedForPhotos(updated);
        setProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to set cover photo');
    }
  };

  return (
    <div className="host-property-list-section">
      {/* Header with Title and Create Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Your Properties & Stays</h2>
          <p className="text-sm text-gray-500">
            Manage your listings, adjust visibility, upload photos, and update rates ({totalCount} total)
          </p>
        </div>
        <button
          className="btn btn-primary flex items-center gap-2"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus size={18} /> List New Property
        </button>
      </div>

      {/* Main Content State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Loader2 className="animate-spin mb-3" size={32} />
          <p>Loading your properties...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300 p-8">
          <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-semibold text-gray-800">No properties listed yet</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mt-1 mb-6">
            Start earning with StayFinder by creating your first listing. Complete the 6-step wizard in under 3 minutes.
          </p>
          <button
            className="btn btn-primary inline-flex items-center gap-2"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={18} /> Create Your First Listing
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-4">Listing</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Price / Night</th>
                  <th className="py-3.5 px-4">Capacity</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {properties.map((property) => {
                  const coverImage = property.images && property.images.length > 0
                    ? (property.images.find((img) => img.is_primary)?.image_path || property.images[0].image_path)
                    : null;
                  const imageUrl = coverImage
                    ? (coverImage.startsWith('http') ? coverImage : `/storage/${coverImage}`)
                    : 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=300&q=80';

                  return (
                    <tr key={property.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={imageUrl}
                            alt={property.title}
                            className="w-14 h-14 object-cover rounded-lg border border-gray-100 flex-shrink-0"
                          />
                          <div>
                            <span className="font-semibold text-gray-900 block line-clamp-1">
                              {property.title}
                            </span>
                            <span className="text-xs text-gray-400 capitalize">
                              {property.property_type} · {property.room_type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {property.city}, {property.country}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        ${property.price_per_night}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {property.max_guests} guests · {property.bedrooms} beds
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          className={`text-xs font-semibold rounded-full px-2.5 py-1 border transition-colors ${
                            property.status === 'published'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : property.status === 'unlisted'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-gray-100 text-gray-600 border-gray-300'
                          }`}
                          value={property.status}
                          onChange={(e) =>
                            handleStatusChange(property.id, e.target.value as any)
                          }
                        >
                          <option value="published">Published</option>
                          <option value="unlisted">Unlisted</option>
                          <option value="draft">Draft</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                            title="Manage Photos"
                            onClick={() => setSelectedForPhotos(property)}
                          >
                            <ImageIcon size={16} />
                          </button>
                          {onSelectProperty && (
                            <button
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md"
                              title="Preview guest view"
                              onClick={() => onSelectProperty(property)}
                            >
                              <ExternalLink size={16} />
                            </button>
                          )}
                          <button
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md disabled:opacity-50"
                            title="Delete listing"
                            disabled={deletingId === property.id}
                            onClick={() => handleDelete(property.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <span className="text-xs text-gray-500">
                Page {currentPage} of {lastPage}
              </span>
              <div className="flex items-center gap-2">
                <button
                  className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 disabled:opacity-40"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  className="p-1.5 rounded border border-gray-200 bg-white text-gray-600 disabled:opacity-40"
                  disabled={currentPage >= lastPage}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Photo Management Modal */}
      {selectedForPhotos && (
        <div className="modal-overlay" onClick={() => setSelectedForPhotos(null)}>
          <div
            className="modal-container p-6 max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Manage Photos: {selectedForPhotos.title}
                </h3>
                <p className="text-xs text-gray-500">
                  Click 'Set as Cover' or upload new photos. High resolution landscape photos recommended.
                </p>
              </div>
              <button
                className="icon-action-btn"
                onClick={() => setSelectedForPhotos(null)}
              >
                <X size={20} />
              </button>
            </div>

            {photoActionError && (
              <div className="p-3 mb-4 rounded bg-rose-50 text-rose-700 text-xs border border-rose-200">
                {photoActionError}
              </div>
            )}

            {/* Existing Photos Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6 max-h-72 overflow-y-auto p-1">
              {selectedForPhotos.images && selectedForPhotos.images.length > 0 ? (
                selectedForPhotos.images.map((img) => {
                  const url = img.image_path.startsWith('http')
                    ? img.image_path
                    : `/storage/${img.image_path}`;
                  return (
                    <div
                      key={img.id}
                      className={`relative group rounded-lg overflow-hidden border ${
                        img.is_primary ? 'ring-2 ring-rose-500' : 'border-gray-200'
                      }`}
                    >
                      <img
                        src={url}
                        alt="Property photo"
                        className="w-full h-28 object-cover"
                      />
                      {img.is_primary && (
                        <span className="absolute top-1 left-1 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                          Cover
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {!img.is_primary && (
                          <button
                            className="bg-white/90 hover:bg-white text-gray-800 text-[11px] font-semibold px-2 py-1 rounded shadow"
                            onClick={() => handleSetPrimaryImage(img.id)}
                          >
                            Set Cover
                          </button>
                        )}
                        <button
                          className="bg-rose-600 hover:bg-rose-700 text-white p-1.5 rounded shadow"
                          title="Delete photo"
                          onClick={() => handleDeleteImage(img.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="col-span-full text-center text-sm text-gray-400 py-6">
                  No photos uploaded for this listing yet.
                </p>
              )}
            </div>

            {/* Upload Area */}
            <div className="pt-3 border-t">
              <label className="btn btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer">
                {uploadingPhotos ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Uploading Photos...
                  </>
                ) : (
                  <>
                    <Upload size={16} /> Upload Additional Photos
                  </>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploadingPhotos}
                  onChange={handleUploadPhotos}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Listing Creation Wizard Modal */}
      <CreatePropertyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          fetchProperties(1);
        }}
      />
    </div>
  );
};
