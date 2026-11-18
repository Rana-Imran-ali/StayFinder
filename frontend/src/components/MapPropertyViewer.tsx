import React, { useState } from 'react';
import type { Property } from '../types/property';
import { MapPin, Star, X, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';

interface MapPropertyViewerProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
  selectedProperty?: Property | null;
}

export const MapPropertyViewer: React.FC<MapPropertyViewerProps> = ({
  properties,
  onSelectProperty,
  selectedProperty,
}) => {
  const [activeProperty, setActiveProperty] = useState<Property | null>(selectedProperty || null);
  const [zoomLevel, setZoomLevel] = useState<number>(10);

  // Filter properties with valid coordinates
  const validStays = properties.filter(
    (p) => p.latitude !== null && p.longitude !== null && !isNaN(Number(p.latitude)) && !isNaN(Number(p.longitude))
  );

  // Compute center of valid stays or default to Amalfi Coast / Positano
  const centerLat = validStays.length > 0
    ? validStays.reduce((acc, p) => acc + Number(p.latitude), 0) / validStays.length
    : 40.6280;
  const centerLng = validStays.length > 0
    ? validStays.reduce((acc, p) => acc + Number(p.longitude), 0) / validStays.length
    : 14.4850;

  // OpenStreetMap bounds
  const delta = 0.35 * Math.pow(2, 10 - zoomLevel);
  const minLng = (centerLng - delta * 1.5).toFixed(4);
  const minLat = (centerLat - delta).toFixed(4);
  const maxLng = (centerLng + delta * 1.5).toFixed(4);
  const maxLat = (centerLat + delta).toFixed(4);

  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik`;

  return (
    <div className="map-property-viewer-container relative w-full h-[580px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm bg-slate-100">
      {/* OpenStreetMap Base Layer */}
      <iframe
        title="OpenStreetMap Explorer"
        src={embedUrl}
        className="w-full h-full border-none pointer-events-none select-none"
      />

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 bg-white/95 backdrop-blur-sm p-1 rounded-lg border border-gray-200 shadow-md">
        <button
          className="p-2 hover:bg-gray-100 rounded text-gray-700"
          onClick={() => setZoomLevel((z) => Math.min(15, z + 1))}
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        <button
          className="p-2 hover:bg-gray-100 rounded text-gray-700"
          onClick={() => setZoomLevel((z) => Math.max(4, z - 1))}
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
      </div>

      {/* Properties Count Badge */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-200 shadow-md text-xs font-semibold text-gray-800 flex items-center gap-1.5">
        <MapPin size={14} className="text-rose-500" />
        <span>{validStays.length} stays on map</span>
      </div>

      {/* Overlay Markers for each stay */}
      <div className="absolute inset-0 pointer-events-none">
        {validStays.map((stay) => {
          // Normalize coordinates into relative percentages inside current viewport
          const lng = Number(stay.longitude);
          const lat = Number(stay.latitude);

          const leftPercent = ((lng - Number(minLng)) / (Number(maxLng) - Number(minLng))) * 100;
          const topPercent = (1 - (lat - Number(minLat)) / (Number(maxLat) - Number(minLat))) * 100;

          // Only render pins if within visible viewport bounds
          if (leftPercent < 3 || leftPercent > 97 || topPercent < 3 || topPercent > 97) {
            return null;
          }

          const isSelected = activeProperty?.id === stay.id;

          return (
            <div
              key={stay.id}
              className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-110 z-20"
              style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
              onClick={() => setActiveProperty(stay)}
            >
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs shadow-lg transition-all ${
                  isSelected
                    ? 'bg-rose-600 text-white ring-2 ring-white scale-110 z-30'
                    : 'bg-white text-gray-900 border border-gray-300 hover:border-gray-900'
                }`}
              >
                <span>${stay.price_per_night}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stay Preview Card Popup when marker clicked */}
      {activeProperty && (
        <div className="absolute bottom-5 left-5 right-5 sm:left-auto sm:right-5 sm:w-80 z-30 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="relative">
            {/* Close button */}
            <button
              className="absolute top-2 right-2 z-10 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
              onClick={() => setActiveProperty(null)}
              title="Close Preview"
            >
              <X size={14} />
            </button>

            {/* Thumbnail */}
            {activeProperty.images && activeProperty.images.length > 0 ? (
              <img
                src={
                  activeProperty.images[0].image_path.startsWith('http')
                    ? activeProperty.images[0].image_path
                    : `/storage/${activeProperty.images[0].image_path}`
                }
                alt={activeProperty.title}
                className="w-full h-36 object-cover"
              />
            ) : (
              <div className="w-full h-36 bg-gray-100 flex items-center justify-center text-gray-400">
                <MapPin size={28} />
              </div>
            )}
            <span className="absolute bottom-2 left-2 bg-black/75 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize">
              {activeProperty.property_type}
            </span>
          </div>

          <div className="p-3.5">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">{activeProperty.title}</h4>
              <div className="flex items-center gap-1 text-xs font-semibold flex-shrink-0">
                <Star size={12} className="fill-amber-400 text-amber-400" />
                <span>4.95</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-1 line-clamp-1">
              {activeProperty.city}, {activeProperty.country}
            </p>

            <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900">${activeProperty.price_per_night}</span>
                <span className="text-xs text-gray-500"> / night</span>
              </div>
              <button
                className="btn btn-primary btn-sm flex items-center gap-1 text-xs py-1 px-2.5"
                onClick={() => onSelectProperty(activeProperty)}
              >
                <span>View Stay</span>
                <ExternalLink size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
