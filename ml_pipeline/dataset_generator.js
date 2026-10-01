/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Domestic Logistics Machine Learning Dataset Generator
 * Generates 1,200 realistic Pakistani inter-city luggage transportation records with realistic variance.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CITIES = [
  'Islamabad', 'Rawalpindi', 'Lahore', 'Karachi',
  'Peshawar', 'Multan', 'Faisalabad', 'Quetta'
];

const HIGHWAY_DISTANCES = {
  'Islamabad-Rawalpindi': 25,
  'Islamabad-Lahore': 380,
  'Islamabad-Karachi': 1410,
  'Islamabad-Peshawar': 185,
  'Islamabad-Multan': 535,
  'Islamabad-Faisalabad': 320,
  'Islamabad-Quetta': 900,
  'Rawalpindi-Lahore': 375,
  'Rawalpindi-Karachi': 1400,
  'Rawalpindi-Peshawar': 175,
  'Rawalpindi-Multan': 530,
  'Rawalpindi-Faisalabad': 315,
  'Lahore-Karachi': 1210,
  'Lahore-Peshawar': 510,
  'Lahore-Multan': 345,
  'Lahore-Faisalabad': 180,
  'Lahore-Quetta': 980,
  'Karachi-Peshawar': 1580,
  'Karachi-Multan': 890,
  'Karachi-Faisalabad': 1130,
  'Karachi-Quetta': 690,
  'Peshawar-Multan': 640,
  'Peshawar-Faisalabad': 440,
  'Multan-Faisalabad': 240,
  'Multan-Quetta': 600
};

const LUGGAGE_TYPES = ['Suitcase', 'Backpack', 'Cardboard Box', 'Travel Bag', 'Fragile Item', 'Oversized Cargo', 'Document Pouch', 'Other'];
const SIZES = ['Small', 'Medium', 'Large', 'Extra Large'];
const TIERS = ['Standard (Ground Transport)', 'Express (Priority Dispatch)', 'Premium (White-Glove & Dedicated)'];

function getDistance(c1, c2) {
  if (c1 === c2) return 25;
  const k1 = `${c1}-${c2}`;
  const k2 = `${c2}-${c1}`;
  return HIGHWAY_DISTANCES[k1] || HIGHWAY_DISTANCES[k2] || 350;
}

function generateDataset(sampleCount = 1200) {
  const dataset = [];

  for (let i = 0; i < sampleCount; i++) {
    const origin = CITIES[Math.floor(Math.random() * CITIES.length)];
    let destination = CITIES[Math.floor(Math.random() * CITIES.length)];
    while (destination === origin && Math.random() > 0.1) {
      destination = CITIES[Math.floor(Math.random() * CITIES.length)];
    }

    const distanceKm = getDistance(origin, destination);
    const luggageType = LUGGAGE_TYPES[Math.floor(Math.random() * LUGGAGE_TYPES.length)];
    const bagCount = Math.floor(1 + Math.random() * 4);
    const weightKg = Math.round((3 + Math.random() * 32) * 10) / 10;
    const isFragile = luggageType === 'Fragile Item' || Math.random() < 0.15;
    const tier = TIERS[Math.floor(Math.random() * TIERS.length)];

    // Derive volume based on weight with realistic variance
    const volumeLiters = Math.round((weightKg * (3.5 + Math.random() * 1.5)) * 10) / 10;
    let sizeCategory = 'Small';
    if (weightKg > 25 || volumeLiters > 100) sizeCategory = 'Extra Large';
    else if (weightKg >= 15 || volumeLiters >= 70) sizeCategory = 'Large';
    else if (weightKg >= 7 || volumeLiters >= 40) sizeCategory = 'Medium';

    // True Supervised Target 1: Transportation Cost (PKR)
    // Formula based on real logistics cost function + Gaussian noise
    const baseFare = 450;
    const kmRate = 2.45;
    const kgRate = 38.0;
    const bagFee = 150 * (bagCount - 1);

    const typeFactor = {
      'Document Pouch': 0.85,
      'Backpack': 0.95,
      'Suitcase': 1.00,
      'Travel Bag': 1.02,
      'Cardboard Box': 1.05,
      'Other': 1.05,
      'Fragile Item': 1.25,
      'Oversized Cargo': 1.40
    }[luggageType] || 1.0;

    const tierFactor = {
      'Standard (Ground Transport)': 1.00,
      'Express (Priority Dispatch)': 1.35,
      'Premium (White-Glove & Dedicated)': 1.70
    }[tier] || 1.0;

    const fragileMultiplier = isFragile ? 1.20 : 1.00;
    const randomNoiseCost = (Math.random() - 0.5) * 120; // Natural market variance

    const actualCost = Math.max(
      600,
      Math.round(((baseFare + (distanceKm * kmRate) + (weightKg * kgRate) + bagFee) * typeFactor * tierFactor * fragileMultiplier + randomNoiseCost) / 10) * 10
    );

    // True Supervised Target 2: Delivery Transit Time (Hours)
    let avgSpeed = 52;
    if (tier.includes('Express')) avgSpeed = 65;
    if (tier.includes('Premium')) avgSpeed = 72;

    const transitHours = distanceKm / avgSpeed;
    const handlingHours = 1.5 + (weightKg * 0.05) + (bagCount * 0.4) + (isFragile ? 0.8 : 0);
    const randomNoiseTime = (Math.random() - 0.5) * 0.8;
    const actualDeliveryTimeHours = Math.max(2.0, Math.round((transitHours + handlingHours + randomNoiseTime) * 10) / 10);

    dataset.push({
      sampleId: `DS-${1000 + i}`,
      originCity: origin,
      destinationCity: destination,
      distanceKm,
      totalWeightKg: weightKg,
      bagCount,
      luggageType,
      sizeCategory,
      volumeLiters,
      transportTier: tier,
      isFragile,
      targetActualCostPKR: actualCost,
      targetActualDeliveryTimeHours: actualDeliveryTimeHours
    });
  }

  return dataset;
}

const data = generateDataset(1200);
const outputPath = path.join(__dirname, 'training_dataset.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
console.log(`Generated ${data.length} supervised logistics records to ${outputPath}`);
