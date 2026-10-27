/**
 * Keyless city/address lookup and road routing for the FYP prototype.
 * Photon is the production-hosting fallback when Stadia domain authentication is not configured.
 * Public geocoding and OSRM endpoints remain best-effort; use a dedicated backend for production.
 */

const STADIA_SEARCH_URL = 'https://api.stadiamaps.com/geocoding/v1/search';
const STADIA_AUTOCOMPLETE_URL = 'https://api.stadiamaps.com/geocoding/v1/autocomplete';
const PHOTON_URL = 'https://photon.komoot.io/api/';
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const cityBoundaries = new Map();

async function fetchFeatures(url, signal) {
  const response = await fetch(url, { signal, headers: { Accept: 'application/geo+json, application/json' } });
  if (!response.ok) throw new Error('Location lookup is unavailable right now.');
  const data = await response.json();
  return data.features || [];
}

function normalizePlaceName(value) {
  return (value || '').normalize('NFKC').toLocaleLowerCase('en').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function cityMatches(value, city) {
  const normalizedValue = normalizePlaceName(value);
  const normalizedCity = normalizePlaceName(city);
  return normalizedValue === normalizedCity || normalizedValue.startsWith(`${normalizedCity} `);
}

function normalizePhotonFeature(feature, city) {
  const properties = feature.properties || {};
  const context = [properties.city, properties.locality, properties.district, properties.county, properties.state, properties.name]
    .filter(Boolean);
  if ((properties.countrycode || '').toLowerCase() !== 'pk' || !context.some(value => cityMatches(value, city))) return null;

  const title = properties.name || [properties.housenumber, properties.street].filter(Boolean).join(' ');
  if (!title) return null;
  const details = [properties.street, properties.district, properties.city || properties.locality, properties.state, properties.country]
    .filter(Boolean)
    .filter((value, index, values) => values.findIndex(other => normalizePlaceName(other) === normalizePlaceName(value)) === index);
  const label = [title, ...details.filter(value => normalizePlaceName(value) !== normalizePlaceName(title))].join(', ');
  return { label, name: title, context: details.join(', '), coordinates: feature.geometry?.coordinates };
}

async function searchWithPhoton(input, city, signal) {
  const url = new URL(PHOTON_URL);
  url.searchParams.set('q', `${input.trim() || city}, ${city}, Pakistan`);
  url.searchParams.set('limit', '20');
  url.searchParams.set('lang', 'en');
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Location lookup is unavailable right now.');
  const data = await response.json();
  const seen = new Set();
  return (data.features || []).map(feature => normalizePhotonFeature(feature, city)).filter(place => {
    if (!place) return false;
    const key = normalizePlaceName(place.label);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);
}

async function findPhotonCityCenter(city, signal) {
  const url = new URL(PHOTON_URL);
  url.searchParams.set('q', `${city}, Pakistan`);
  url.searchParams.set('limit', '20');
  url.searchParams.set('lang', 'en');
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('City lookup is unavailable right now.');
  const data = await response.json();
  const candidates = (data.features || []).filter(feature => {
    const properties = feature.properties || {};
    return (properties.countrycode || '').toLowerCase() === 'pk'
      && normalizePlaceName(properties.name) === normalizePlaceName(city)
      && Array.isArray(feature.geometry?.coordinates);
  });
  candidates.sort((a, b) => {
    const cityTypes = new Set(['city', 'town', 'village', 'municipality']);
    const aType = cityTypes.has(String(a.properties?.osm_value || '').toLowerCase()) ? 1 : 0;
    const bType = cityTypes.has(String(b.properties?.osm_value || '').toLowerCase()) ? 1 : 0;
    return bType - aType;
  });
  if (!candidates.length) throw new Error(`Could not find ${city}, Pakistan on the map.`);
  const center = candidates[0];
  center.properties = { ...center.properties, label: [city, center.properties?.state, 'Pakistan'].filter(Boolean).join(', ') };
  return center;
}

async function getCityBoundary(city, signal) {
  const normalizedCity = normalizePlaceName(city);
  if (!normalizedCity) throw new Error('Choose a city before entering its address.');
  if (!cityBoundaries.has(normalizedCity)) {
    const lookup = (async () => {
      try {
        const url = new URL(STADIA_SEARCH_URL);
        url.searchParams.set('text', `${city}, Pakistan`);
        url.searchParams.set('boundary.country', 'PAK');
        url.searchParams.set('layers', 'locality');
        url.searchParams.set('lang', 'en');
        url.searchParams.set('size', '10');
        const features = await fetchFeatures(url, signal);
        const match = features.find(feature => normalizePlaceName(feature.properties?.name) === normalizedCity && feature.properties?.gid);
        if (match) return { gid: match.properties.gid, center: match };
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        // Production Stadia requests need the deployed domain registered; continue with Photon.
      }
      return { gid: null, center: await findPhotonCityCenter(city, signal) };
    })();
    cityBoundaries.set(normalizedCity, lookup);
    lookup.catch(() => cityBoundaries.delete(normalizedCity));
  }
  return cityBoundaries.get(normalizedCity);
}

function pointFromFeature(feature) {
  const [lon, lat] = feature?.geometry?.coordinates || [];
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('The selected location has no route coordinates.');
  return { lat, lon, label: feature.properties?.label || feature.properties?.name || 'Selected location' };
}

export async function searchLocationSuggestions(input, city = '', signal) {
  const searchText = input.trim() || city.trim();
  if (searchText.length < 1) return [];
  try {
    const boundary = await getCityBoundary(city, signal);
    const query = input.trim() ? `${searchText}, ${city}, Pakistan` : `${city}, Pakistan`;
    if (boundary.gid) {
      const url = new URL(STADIA_AUTOCOMPLETE_URL);
      url.searchParams.set('text', query);
      url.searchParams.set('boundary.country', 'PAK');
      url.searchParams.set('boundary.gid', boundary.gid);
      url.searchParams.set('lang', 'en');
      url.searchParams.set('size', '10');
      url.searchParams.set('layers', 'address,venue,street');

      const features = await fetchFeatures(url, signal);
      const seen = new Set();
      const stadiaResults = features.map(feature => {
        const properties = feature.properties || {};
        const label = properties.label || [properties.name, properties.locality, properties.region].filter(Boolean).join(', ');
        const normalizedLabel = normalizePlaceName(label);
        if (!label || seen.has(normalizedLabel)) return null;
        seen.add(normalizedLabel);
        return { label, name: properties.name || label, context: [properties.locality, properties.region].filter(Boolean).join(', '), coordinates: feature.geometry?.coordinates };
      }).filter(Boolean).slice(0, 5);
      if (stadiaResults.length) return stadiaResults;
    }
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    // Fall back to Photon so autocomplete still works when Stadia auth or service is unavailable.
  }

  return searchWithPhoton(input, city, signal);
}

export async function resolveAddressWithinCity(address, city) {
  const boundary = await getCityBoundary(city);
  if (!address.trim()) return pointFromFeature(boundary.center);

  let point = null;
  if (boundary.gid) {
    try {
      const url = new URL(STADIA_SEARCH_URL);
      url.searchParams.set('text', `${address}, ${city}, Pakistan`);
      url.searchParams.set('boundary.country', 'PAK');
      url.searchParams.set('boundary.gid', boundary.gid);
      url.searchParams.set('layers', 'address,venue,street');
      url.searchParams.set('lang', 'en');
      url.searchParams.set('size', '5');
      const matches = await fetchFeatures(url);
      if (matches.length) point = pointFromFeature(matches[0]);
    } catch {
      // Use the same city-scoped fallback as the address suggestion dropdown.
    }
  }
  if (!point) {
    const matches = await searchWithPhoton(address, city);
    const match = matches.find(item => Array.isArray(item.coordinates));
    if (match) point = { lat: match.coordinates[1], lon: match.coordinates[0], label: match.label };
  }
  if (!point) {
    const error = new Error(`That address could not be verified inside ${city}. Choose a suggestion for ${city} or enter another address.`);
    error.code = 'ADDRESS_OUTSIDE_CITY';
    throw error;
  }
  return point;
}

export async function getRoadRoute(pickup, destination) {
  const resolveLocation = async location => {
    const [lon, lat] = location.coordinates || [];
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { lat, lon, label: location.addressLine || location.city || 'Selected location' };
    }
    return resolveAddressWithinCity(location.addressLine || '', location.city || '');
  };
  const from = await resolveLocation(pickup);
  const to = await resolveLocation(destination);
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
