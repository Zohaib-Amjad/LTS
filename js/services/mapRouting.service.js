/**
 * Free, keyless map routing for the local/FYP prototype.
 * Map tiles: OpenStreetMap. Geocoding: Nominatim. Road routes: OSRM demo service.
 * Public endpoints are best-effort; use a hosted/self-hosted routing backend for production.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const geocodeCache = new Map();
let lastGeocodeAt = 0;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function geocode(query) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) throw new Error('Enter both pickup and destination locations.');
  if (geocodeCache.has(normalized)) return geocodeCache.get(normalized);

  // Nominatim's public service asks clients to keep requests at or below 1 per second.
  const delay = Math.max(0, 1100 - (Date.now() - lastGeocodeAt));
  if (delay) await wait(delay);
  lastGeocodeAt = Date.now();

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set('q', `${query}, Pakistan`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'pk');
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Location lookup is unavailable right now.');
  const matches = await response.json();
  if (!matches.length) throw new Error(`Could not find “${query}” in Pakistan. Try a city and area name.`);

  const point = { lat: Number(matches[0].lat), lon: Number(matches[0].lon), label: matches[0].display_name };
  geocodeCache.set(normalized, point);
  return point;
}

export async function getRoadRoute(pickup, destination) {
  const from = await geocode(`${pickup.addressLine || ''} ${pickup.city || ''}`);
  const to = await geocode(`${destination.addressLine || ''} ${destination.city || ''}`);
  const url = `${OSRM_URL}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson&steps=false`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Road route service is unavailable right now.');
  const data = await response.json();
  const route = data.routes?.[0];
  if (data.code !== 'Ok' || !route?.geometry?.coordinates?.length) {
    throw new Error('No drivable road route was found for these locations.');
  }

  const durationHours = route.duration / 3600;
  return {
    distanceKm: Math.round(route.distance / 100) / 10,
    durationHours: Math.round(durationHours * 10) / 10,
    coordinates: route.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    pickup: [from.lat, from.lon],
    destination: [to.lat, to.lon],
    pickupLabel: from.label,
    destinationLabel: to.label
  };
}
