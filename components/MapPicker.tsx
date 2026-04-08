'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  useMapsLibrary, 
  useMap,
  Pin
} from '@vis.gl/react-google-maps';

// --- Sub-Komponen: Search Box (Autocomplete) ---
// Gue tambahin prop 'variant' di sini
const PlaceAutocomplete = ({ 
  onPlaceSelect, 
  variant 
}: { 
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void, 
  variant: 'light' | 'dark' 
}) => {
  const [placeAutocomplete, setPlaceAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary('places');

  useEffect(() => {
    if (!places || !inputRef.current) return;
    const options = {
      fields: ['geometry', 'name', 'formatted_address'],
    };
    setPlaceAutocomplete(new places.Autocomplete(inputRef.current, options));
  }, [places]);

  useEffect(() => {
    if (!placeAutocomplete) return;
    placeAutocomplete.addListener('place_changed', () => {
      onPlaceSelect(placeAutocomplete.getPlace());
    });
  }, [onPlaceSelect, placeAutocomplete]);

  return (
    <input 
      ref={inputRef}
      className={`w-full p-3.5 rounded-2xl text-sm font-bold outline-none transition-all ${
        variant === 'dark' 
          ? "bg-slate-800 border border-slate-700 text-white focus:border-cyan-500 placeholder:text-slate-500" 
          : "bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-cyan-500/50 placeholder:text-slate-400"
      }`}
      placeholder="Cari nama tempat atau alamat..."
    />
  );
};

// --- Komponen Utama: MapPicker ---
interface MapPickerProps {
  currentLocation?: { address: string; lat: number; lng: number };
  onLocationChange: (loc: { address: string; lat: number; lng: number }) => void;
  variant?: 'light' | 'dark'; // <-- Tambahin prop opsional ini
}

export default function MapPicker({ currentLocation, onLocationChange, variant = 'light' }: MapPickerProps) {
  const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  const defaultCenter = { lat: -6.200000, lng: 106.816666 };
  const center = currentLocation?.lat ? { lat: currentLocation.lat, lng: currentLocation.lng } : defaultCenter;

  return (
    <div className="space-y-3">
      <APIProvider apiKey={API_KEY}>
        {/* 1. Input Pencarian (Sekarang pake variant) */}
        <PlaceAutocomplete 
          variant={variant} 
          onPlaceSelect={(place) => {
            if (place.geometry?.location) {
              onLocationChange({
                address: place.name || place.formatted_address || "",
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              });
            }
          }} 
        />

        {/* 2. Preview Map */}
        <div className={`w-full h-[200px] rounded-2xl overflow-hidden border relative shadow-inner ${
          variant === 'dark' ? "border-slate-700" : "border-slate-200"
        }`}>
          <Map
            center={center}
            defaultZoom={15}
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            mapId="bf51a910020a664"
          >
            {currentLocation?.lat && (
              <AdvancedMarker position={center}>
                <Pin background={'#06b6d4'} glyphColor={'#fff'} borderColor={'#0891b2'} />
              </AdvancedMarker>
            )}
          </Map>

          {/* Overlay info alamat (Ikut berubah warna dikit biar matching) */}
          {currentLocation?.address && (
            <div className={`absolute bottom-2 left-2 right-2 backdrop-blur-md p-2 rounded-xl border shadow-sm ${
              variant === 'dark' 
                ? "bg-slate-900/80 border-slate-700/50" 
                : "bg-white/80 border-slate-200/50"
            }`}>
              <p className={`text-[10px] font-bold truncate ${
                variant === 'dark' ? "text-cyan-400" : "text-slate-700"
              }`}>📍 {currentLocation.address}</p>
            </div>
          )}
        </div>
      </APIProvider>
    </div>
  );
}