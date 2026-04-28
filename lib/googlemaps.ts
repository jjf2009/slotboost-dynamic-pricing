// Google Maps Distance Matrix client
// Note: @googlemaps/google-maps-services-js must be installed

export function getMapsClient() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Client } = require('@googlemaps/google-maps-services-js')
  return new Client()
}

export const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY!
