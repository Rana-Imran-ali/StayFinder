import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, ZoomIn, ZoomOut, Compass } from 'lucide-react';

interface MapLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  addressLabel?: string;
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  latitude,
  longitude,
  onChange,
  addressLabel,
}) => {
  // Default to Positano / Amalfi Coast (40.6280, 14.4850) or LA (34.0522, -118.2437) if not set
  const initialLat = latitude ?? 34.0522;
  const initialLng = longitude ?? -118.2437;

  const [currentLat, setCurrentLat] = useState<number>(initialLat);
  const [currentLng, setCurrentLng] = useState<number>(initialLng);
  const [zoomLevel, setZoomLevel] = useState<number>(14);

  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      setCurrentLat(latitude);
      setCurrentLng(longitude);
    }
  }, [latitude, longitude]);

  const handleManualCoordChange = (newLat: number, newLng: number) => {
    const clampedLat = Math.max(-90, Math.min(90, newLat));
    const clampedLng = Math.max(-180, Math.min(180, newLng));
    setCurrentLat(clampedLat);
    setCurrentLng(clampedLng);
    onChange(clampedLat, clampedLng);
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Approximate offset calculation based on zoom level
    const span = 360 / Math.pow(2, zoomLevel);
    const latSpan = span * (rect.height / 256);
    const lngSpan = span * (rect.width / 256);

    const xFraction = (x - rect.width / 2) / rect.width;
    const yFraction = (y - rect.height / 2) / rect.height;

    const newLng = currentLng + xFraction * lngSpan;
    const newLat = currentLat - yFraction * latSpan;

    handleManualCoordChange(parseFloat(newLat.toFixed(6)), parseFloat(newLng.toFixed(6)));
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lng = parseFloat(pos.coords.longitude.toFixed(6));
          handleManualCoordChange(lat, lng);
        },
        () => {
          alert('Could not retrieve your current location. Please allow location permissions in your browser.');
        }
      );
    }
  };

  // OpenStreetMap embed URL
  const osmBboxDelta = 0.015 * Math.pow(2, 14 - zoomLevel);
  const minLng = (currentLng - osmBboxDelta).toFixed(5);
  const minLat = (currentLat - osmBboxDelta).toFixed(5);
  const maxLng = (currentLng + osmBboxDelta).toFixed(5);
  const maxLat = (currentLat + osmBboxDelta).toFixed(5);
  const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${currentLat}%2C${currentLng}`;

  return (
    <div className="map-location-picker border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Map Control Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-700">
          <Compass size={15} className="text-rose-500" />
          <span className="font-semibold">Interactive Location Pin</span>
          {addressLabel && <span className="text-gray-400">· {addressLabel}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="p-1.5 hover:bg-white rounded border border-gray-200 text-gray-600 text-xs flex items-center gap-1"
            onClick={handleUseCurrentLocation}
            title="Use My Current GPS Position"
          >
            <Navigation size={13} className="text-blue-600" />
            <span className="hidden sm:inline">My Location</span>
          </button>
          <button
            type="button"
            className="p-1 hover:bg-white rounded border border-gray-200 text-gray-600"
            onClick={() => setZoomLevel((z) => Math.min(18, z + 1))}
            title="Zoom In"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            className="p-1 hover:bg-white rounded border border-gray-200 text-gray-600"
            onClick={() => setZoomLevel((z) => Math.max(8, z - 1))}
            title="Zoom Out"
          >
            <ZoomOut size={14} />
          </button>
        </div>
      </div>

      {/* Interactive Map Viewport */}
      <div className="relative w-full h-64 bg-slate-100 overflow-hidden cursor-crosshair" onClick={handleMapClick}>
        <iframe
          title="OpenStreetMap Picker"
          src={embedUrl}
          className="w-full h-full border-none pointer-events-none select-none"
        />

        {/* Pin Marker Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="flex flex-col items-center -translate-y-4 filter drop-shadow-md">
            <MapPin size={34} className="text-rose-600 fill-rose-600 animate-bounce" />
            <div className="w-2.5 h-1 bg-black/40 rounded-full blur-[1px] mt-[-3px]" />
          </div>
        </div>

        {/* Hint Pill */}
        <div className="absolute bottom-2 left-2 pointer-events-none bg-black/70 text-white text-[11px] px-2 py-0.5 rounded-full backdrop-blur-sm">
          Click map to adjust pin position
        </div>
      </div>

      {/* Coordinate Readouts & Manual Override */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50/50 border-t border-gray-200">
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
            Latitude (-90 to 90)
          </label>
          <input
            type="number"
            step="0.000001"
            min="-90"
            max="90"
            className="form-input text-xs py-1.5 font-mono"
            value={currentLat}
            onChange={(e) => handleManualCoordChange(parseFloat(e.target.value) || 0, currentLng)}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
            Longitude (-180 to 180)
          </label>
          <input
            type="number"
            step="0.000001"
            min="-180"
            max="180"
            className="form-input text-xs py-1.5 font-mono"
            value={currentLng}
            onChange={(e) => handleManualCoordChange(currentLat, parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>
    </div>
  );
};
