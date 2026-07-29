/**
 * Marco del landing (web): incrusta el landing animado con un <iframe>.
 */
import React from 'react';

export function LandingFrame({ url }: { url: string }) {
  return (
    <iframe
      src={url}
      title="CavaLocal — Landing"
      style={{ border: 'none', width: '100%', height: '100%', display: 'block', backgroundColor: '#F3ECDD' }}
    />
  );
}
