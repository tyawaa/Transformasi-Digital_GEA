import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

// Aplikasi ini untuk HP. Di browser layar lebar, buka di dalam bingkai HP (public/demo.html)
// agar semua layar tampil seukuran HP. Tambahkan ?full ke URL untuk melewati bingkai.
if (
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  window.self === window.top &&
  window.innerWidth > 600 &&
  !window.location.search.includes('full')
) {
  window.location.replace('/demo.html' + window.location.search);
}

import App from './App';
import DesignSystemPreview from './src/design/DesignSystemPreview';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// EXPO_PUBLIC_SCREEN=design-system membuka halaman uji design system (hanya untuk pengembangan).
registerRootComponent(
  process.env.EXPO_PUBLIC_SCREEN === 'design-system' ? DesignSystemPreview : App,
);
