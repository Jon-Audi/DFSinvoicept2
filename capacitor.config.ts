import type { CapacitorConfig } from '@capacitor/cli';

// Set your production URL here - this is your Vercel deployment URL
// Update this to your actual production domain
const PRODUCTION_URL = 'https://dfsinvoicept2.vercel.app';

// For development, you can switch to localhost
const DEV_URL = 'http://localhost:3000';

// Toggle this for development vs production builds
const USE_PRODUCTION = true;

const config: CapacitorConfig = {
  appId: 'com.delfenceinvoice.app',
  appName: 'DFS Invoice',
  webDir: 'www', // Placeholder directory - we use server URL instead

  // iOS-specific configuration
  ios: {
    // Content inset behavior for safe areas (iPhone notch, etc.)
    contentInset: 'automatic',
    // Allow mixed content (if needed for local dev)
    allowsLinkPreview: true,
    // Scroll behavior
    scrollEnabled: true,
    // Status bar style
    preferredContentMode: 'mobile',
  },

  // Server configuration - point to your live Vercel URL
  // This approach keeps all your server-side features working (Firebase, Server Actions, etc.)
  server: {
    // Use your deployed Vercel URL for production
    url: USE_PRODUCTION ? PRODUCTION_URL : DEV_URL,
    // Clear text traffic (only needed for http://localhost)
    cleartext: !USE_PRODUCTION,
    // Handle all navigation in-app
    androidScheme: 'https',
    iosScheme: 'https',
  },

  // Plugins configuration
  plugins: {
    // Splash screen configuration
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#ffffff',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    // Keyboard configuration for better form handling
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    // Status bar
    StatusBar: {
      style: 'dark',
      backgroundColor: '#ffffff',
    },
  },
};

export default config;
