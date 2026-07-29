/**
 * Marco del landing (nativo): incrusta el landing animado con react-native-webview.
 * En web, Metro resuelve `LandingFrame.web.tsx` (iframe).
 */
import React from 'react';
import { WebView } from 'react-native-webview';

export function LandingFrame({ url }: { url: string }) {
  return (
    <WebView
      source={{ uri: url }}
      style={{ flex: 1, backgroundColor: '#F3ECDD' }}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      originWhitelist={['*']}
    />
  );
}
