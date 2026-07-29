/**
 * Área de mapa (web): Google Maps real cuando hay API key configurada
 * (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY); si no, cae al lienzo SVG para que la
 * demo funcione igual sin clave.
 */
import React from 'react';
import { GoogleMap, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY, hasGoogleMaps } from '../config';
import { userLocation } from '../data/selectors';
import { colors } from '../theme/tokens';
import { MapCanvasSvg, MAP_HEIGHT } from './MapCanvasSvg';
import type { MapPin } from '../types';

const containerStyle = { width: '100%', height: MAP_HEIGHT };

function GoogleMapArea({ pins }: { pins: MapPin[] }) {
  const { isLoaded } = useJsApiLoader({
    id: 'cavalocal-gmaps',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  if (!isLoaded) return <MapCanvasSvg pins={pins} />;

  const center = { lat: userLocation.lat, lng: userLocation.lng };

  return (
    <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={14}>
      <MarkerF position={center} title="Tu ubicación" />
      {pins.map((pin) => (
        <MarkerF
          key={pin.id}
          position={{ lat: pin.lat, lng: pin.lng }}
          title={pin.label}
          label={{
            text: `$${pin.price.toFixed(2)}`,
            color: pin.highlighted ? colors.white : colors.ink,
            fontWeight: 'bold',
            fontSize: '12px',
          }}
        />
      ))}
    </GoogleMap>
  );
}

export function MapArea({ pins }: { pins: MapPin[] }) {
  if (!hasGoogleMaps) return <MapCanvasSvg pins={pins} />;
  return <GoogleMapArea pins={pins} />;
}
