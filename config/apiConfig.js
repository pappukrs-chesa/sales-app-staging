// Single source for the API gateway base URL.
//
// Switch environments by editing .env (or by setting EXPO_PUBLIC_APP_ENV in
// the shell / EAS build profile):
//   EXPO_PUBLIC_APP_ENV=development  → http://localhost:4000
//   EXPO_PUBLIC_APP_ENV=staging      → https://staging-api.chesadentalcare.com
//   EXPO_PUBLIC_APP_ENV=production   → https://api.chesadentalcare.com  (default)
//
// To override the URL fully (e.g. point at a tunnel), set
//   EXPO_PUBLIC_API_BASE_URL=https://my-custom-host
//
// Expo auto-loads .env, .env.development, and .env.production based on NODE_ENV.
// .env.staging is NOT auto-loaded — to use it: copy it to .env, or run
//   EXPO_PUBLIC_APP_ENV=staging npx expo start
//
// Note: 'development' resolves to http://localhost:4000, which from a phone
// running Expo Go does NOT reach your dev machine. To point dev at a local
// backend, create .env.development.local with EXPO_PUBLIC_API_BASE_URL set
// to your machine's LAN IP (e.g. http://192.168.1.10:4000).

const ENV_URLS = {
  development: 'http://localhost:4000',
  staging: 'https://staging-api.chesadentalcare.com',
  production: 'https://api.chesadentalcare.com',
};

const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || 'production';

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  ENV_URLS[APP_ENV] ||
  ENV_URLS.production;

export const APP_ENV_NAME = APP_ENV;
