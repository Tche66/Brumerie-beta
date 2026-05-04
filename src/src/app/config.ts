/**
 * Application configuration
 */

export const APP_CONFIG = {
  // Application info
  name: 'Address-Web',
  version: '1.0.0',
  description: 'Solution d\'adressage numérique pour l\'Afrique',
  
  // Default map settings
  map: {
    defaultCenter: {
      lat: 5.3600,  // Abidjan
      lng: -4.0083
    },
    defaultZoom: 13,
    markerZoom: 16,
    maxZoom: 19,
    tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  
  // Address code format
  addressCode: {
    prefix: 'AW',
    cityCodeLength: 3,
    uniqueIdMin: 10000,
    uniqueIdMax: 99999,
  },
  
  // Storage
  storage: {
    key: 'addressweb_addresses',
    seedOnFirstLoad: true,
  },
  
  // Features
  features: {
    geolocation: true,
    shareWhatsApp: true,
    shareQRCode: true,
    googleMapsIntegration: true,
    debugTools: true,
  },
  
  // Cities supported (for auto-detection)
  cities: [
    {
      name: 'Abidjan',
      country: 'Côte d\'Ivoire',
      code: 'ABJ',
      bounds: {
        minLat: 5.0,
        maxLat: 5.6,
        minLng: -4.5,
        maxLng: -3.7,
      },
    },
    {
      name: 'Dakar',
      country: 'Sénégal',
      code: 'DKR',
      bounds: {
        minLat: 14.6,
        maxLat: 14.8,
        minLng: -17.5,
        maxLng: -17.3,
      },
    },
    {
      name: 'Lagos',
      country: 'Nigeria',
      code: 'LOS',
      bounds: {
        minLat: 6.4,
        maxLat: 6.6,
        minLng: 3.3,
        maxLng: 3.5,
      },
    },
    {
      name: 'Accra',
      country: 'Ghana',
      code: 'ACC',
      bounds: {
        minLat: 5.5,
        maxLat: 5.7,
        minLng: -0.3,
        maxLng: -0.1,
      },
    },
    {
      name: 'Kinshasa',
      country: 'RDC',
      code: 'KIN',
      bounds: {
        minLat: -4.4,
        maxLat: -4.2,
        minLng: 15.2,
        maxLng: 15.4,
      },
    },
    {
      name: 'Nairobi',
      country: 'Kenya',
      code: 'NBO',
      bounds: {
        minLat: -1.4,
        maxLat: -1.2,
        minLng: 36.7,
        maxLng: 36.9,
      },
    },
  ],
  
  // UI
  ui: {
    toastDuration: 3000,
    loadingDelay: 500,
    mapLoadDelay: 100,
    animationDuration: 150,
  },
};

export default APP_CONFIG;
