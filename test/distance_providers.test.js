/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Phase 4 Location & Pluggable Distance Providers Verification Suite
 */

import { distanceService } from '../js/services/distance.service.js';
import { locationService, DOMESTIC_CITY_COORDINATES } from '../js/services/location.service.js';
import { HighwayMatrixDistanceProvider } from '../js/providers/distance/highwayMatrix.provider.js';
import { GeodesicDistanceProvider } from '../js/providers/distance/geodesic.provider.js';
import { MockDemoDistanceProvider } from '../js/providers/distance/mockDemo.provider.js';
import { ValidationError } from '../js/core/errorHandler.js';

let passed = 0;
let failed = 0;

function assert(cond, desc) {
  if (cond) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${desc}`);
    failed++;
  }
}

async function runDistanceTests() {
  console.log('===============================================================');
  console.log('PHASE 4: RUNNING LOCATION & DISTANCE PROVIDER VERIFICATION TESTS');
  console.log('===============================================================\n');

  // Test 1: Domestic City Coordinates & Metadata
  console.log('1. Testing Location Metadata & Coordinates:');
  const isbMeta = locationService.getCityMetadata('Islamabad');
  assert(isbMeta.lat === 33.7215 && isbMeta.lng === 73.0566, 'Islamabad exact coordinates verified');
  const khiMeta = locationService.getCityMetadata('Karachi');
  assert(khiMeta.lat === 24.8138 && khiMeta.lng === 67.0300, 'Karachi exact coordinates verified');

  const loc = locationService.createLocation({
    city: 'Multan',
    addressLine: 'Bosan Road, Near Chase Up',
    contactPerson: 'Farhan Zaidi',
    contactPhone: '+92 300 1122334'
  });
  assert(loc.id !== undefined, 'Location registered with ID');
  assert(loc.latitude === 30.1575, 'Auto-assigned domestic city latitude for Multan');

  // Test 2: Highway Matrix Distance Provider
  console.log('\n2. Testing Highway Matrix Distance Provider:');
  const highwayProvider = new HighwayMatrixDistanceProvider();
  
  const isbToLhr = await highwayProvider.calculateDistance({ city: 'Islamabad' }, { city: 'Lahore' });
  assert(isbToLhr.distanceKm === 380, `Islamabad → Lahore = ${isbToLhr.distanceKm} km (Expected 380 km)`);
  assert(isbToLhr.corridorName.includes('Motorway M-2'), `Corridor verified: ${isbToLhr.corridorName}`);
  assert(isbToLhr.drivingTimeHours > 0, `Driving time calculated: ${isbToLhr.drivingTimeHours} hrs`);

  const isbToKhi = await highwayProvider.calculateDistance({ city: 'Islamabad' }, { city: 'Karachi' });
  assert(isbToKhi.distanceKm === 1410, `Islamabad → Karachi = ${isbToKhi.distanceKm} km (Expected 1410 km)`);

  const lhrToPew = await highwayProvider.calculateDistance({ city: 'Lahore' }, { city: 'Peshawar' });
  assert(lhrToPew.distanceKm === 510, `Lahore → Peshawar = ${lhrToPew.distanceKm} km (Expected 510 km)`);

  // Test 3: Geodesic Haversine Provider
  console.log('\n3. Testing Geodesic Haversine Provider:');
  const geodesicProvider = new GeodesicDistanceProvider();
  const geoResult = await geodesicProvider.calculateDistance(
    { city: 'Islamabad', latitude: 33.7215, longitude: 73.0566 },
    { city: 'Lahore', latitude: 31.5204, longitude: 74.3587 }
  );
  assert(geoResult.distanceKm > 300 && geoResult.distanceKm < 400, `Road-scaled geodesic distance valid: ${geoResult.distanceKm} km`);
  assert(geoResult.distanceUnit === 'km', 'Distance unit is km');

  // Test 4: Distance Service Provider Pipeline & Valid Routes
  console.log('\n4. Testing Distance Service Orchestrator:');
  const pipelineResult = await distanceService.calculateRouteDistance(
    { city: 'Islamabad', addressLine: 'Sector F-7/2' },
    { city: 'Karachi', addressLine: 'Clifton Block 4' }
  );
  assert(pipelineResult.distanceKm === 1410, 'Distance service pipeline returned exact corridor distance (1410 km)');
  assert(pipelineResult.providerUsed === 'HighwayMatrixDistanceProvider', 'Selected primary highway provider');

  // Test 5: Validation - Same Pickup and Destination Address
  console.log('\n5. Testing Location Validation & Error Handling:');
  let sameAddressBlocked = false;
  try {
    await distanceService.calculateRouteDistance(
      { city: 'Islamabad', addressLine: 'House 12, Street 4, F-7' },
      { city: 'Islamabad', addressLine: 'House 12, Street 4, F-7' }
    );
  } catch (e) {
    if (e instanceof ValidationError) sameAddressBlocked = true;
  }
  assert(sameAddressBlocked, 'Identical pickup and destination address throws ValidationError');

  // Test 6: Validation - Missing Location Fields
  let missingFieldBlocked = false;
  try {
    await distanceService.calculateRouteDistance(
      { city: '' },
      { city: 'Lahore' }
    );
  } catch (e) {
    if (e instanceof ValidationError) missingFieldBlocked = true;
  }
  assert(missingFieldBlocked, 'Missing pickup city throws ValidationError');

  // Test 7: Provider Failure & Seamless Fallback
  console.log('\n6. Testing Provider Failure & Fallback Resilience:');
  const mockFailing = new MockDemoDistanceProvider({ shouldFail: true });
  let failCaught = false;
  try {
    await mockFailing.calculateDistance({ city: 'TestA' }, { city: 'TestB' });
  } catch (e) {
    failCaught = true;
  }
  assert(failCaught, 'Failing provider error handled');

  const mockWorking = new MockDemoDistanceProvider({ shouldFail: false });
  const mockRes = await mockWorking.calculateDistance({ city: 'UnknownCityA' }, { city: 'UnknownCityB' });
  assert(mockRes.distanceKm > 0, `Fallback mock provider generated positive distance: ${mockRes.distanceKm} km`);

  console.log('\n===============================================================');
  console.log(`PHASE 4 LOCATION & DISTANCE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) process.exit(1);
}

runDistanceTests().catch(e => {
  console.error('Fatal distance test error:', e);
  process.exit(1);
});
