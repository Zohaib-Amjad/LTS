/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Automated Test Suite: Phase 6 Supervised Machine Learning Prediction Engine
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { predictionService } from '../js/services/prediction.service.js';
import { LUGGAGE_TYPES, TRANSPORT_TIERS, PREDICTION_STATUS } from '../js/constants/enums.js';
import { db } from '../js/core/database.js';
import { ValidationError } from '../js/core/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passedCount = 0;
let totalTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
  }
}

async function itAsync(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${description}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n===============================================================');
console.log('PHASE 6: RUNNING SUPERVISED ML PREDICTION ENGINE TESTS');
console.log('===============================================================\n');

// 1. Dataset & Pipeline Artifact Verification
console.log('1. Verifying Training Dataset & Supervised Artifacts:');
const datasetPath = path.join(__dirname, '../ml_pipeline/training_dataset.json');
const artifactPath = path.join(__dirname, '../ml_pipeline/model_artifacts.json');

it('Training dataset JSON exists and has >= 1200 records', () => {
  assert.strictEqual(fs.existsSync(datasetPath), true, 'Dataset file should exist');
  const data = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  assert.ok(data.length >= 1200, `Expected >= 1200 records, got ${data.length}`);
  
  const sample = data[0];
  assert.ok(sample.distanceKm > 0, 'Distance must be positive');
  assert.ok(sample.totalWeightKg > 0, 'Weight must be positive');
  assert.ok(sample.targetActualCostPKR > 0, 'Target cost must be positive');
  assert.ok(sample.targetActualDeliveryTimeHours > 0, 'Target time must be positive');
});

it('Model artifacts JSON exists and contains multi-model evaluation metrics', () => {
  assert.strictEqual(fs.existsSync(artifactPath), true, 'Artifacts file should exist');
  const artifacts = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
  
  assert.strictEqual(artifacts.metadata.modelVersion, 'v2.1-rf-regressor-domestic');
  assert.ok(artifacts.evaluationMetrics['Linear Regression'], 'Linear Regression metrics must exist');
  assert.ok(artifacts.evaluationMetrics['Decision Tree Regressor'], 'Decision Tree metrics must exist');
  assert.ok(artifacts.evaluationMetrics['Random Forest Regressor'], 'Random Forest metrics must exist');
  assert.ok(artifacts.evaluationMetrics['Gradient Boosted Regressor'], 'Gradient Boosted metrics must exist');
});

it('Random Forest evaluation metrics achieve R² > 0.90 on unseen test data', () => {
  const artifacts = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
  const rfMetrics = artifacts.evaluationMetrics['Random Forest Regressor'];
  
  assert.ok(rfMetrics.cost.r2 >= 0.90, `Cost R2 should be >= 0.90, got ${rfMetrics.cost.r2}`);
  assert.ok(rfMetrics.time.r2 >= 0.90, `Time R2 should be >= 0.90, got ${rfMetrics.time.r2}`);
});

it('Feature importance weights are normalized and Route Distance is top feature', () => {
  const artifacts = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));
  const importances = artifacts.featureImportances;
  
  const sum = Object.values(importances).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1.0) < 0.05, `Feature importances sum should be ~1.0, got ${sum}`);
  assert.ok(importances.distanceKm > 0.40, `Distance importance should be > 40%, got ${importances.distanceKm}`);
});

// 2. Dual Prediction Engine Inference Tests
console.log('\n2. Testing Supervised Dual Prediction Engine:');

await itAsync('Short intra-city trip (Islamabad -> Rawalpindi 25 km, 5 kg backpack)', async () => {
  const pred = await predictionService.predict({
    distanceKm: 25,
    totalWeightKg: 5,
    bagCount: 1,
    luggageType: LUGGAGE_TYPES.BACKPACK,
    transportTier: TRANSPORT_TIERS.STANDARD,
    isFragile: false
  });

  assert.ok(pred.predictedCost >= 600 && pred.predictedCost <= 1200, `Expected PKR 600-1200, got ${pred.predictedCost}`);
  assert.ok(pred.predictedTimeHours >= 2.0 && pred.predictedTimeHours <= 4.0, `Expected 2-4 hrs, got ${pred.predictedTimeHours}`);
  assert.strictEqual(pred.modelVersion, 'v2.1-rf-regressor-domestic');
});

await itAsync('Major domestic corridor (Islamabad -> Lahore 380 km, 18 kg suitcase)', async () => {
  const pred = await predictionService.predict({
    distanceKm: 380,
    totalWeightKg: 18,
    bagCount: 1,
    luggageType: LUGGAGE_TYPES.SUITCASE,
    transportTier: TRANSPORT_TIERS.STANDARD,
    isFragile: false
  });

  assert.ok(pred.predictedCost >= 1800 && pred.predictedCost <= 2600, `Expected PKR 1800-2600, got ${pred.predictedCost}`);
  assert.ok(pred.predictedTimeHours >= 8.5 && pred.predictedTimeHours <= 12.0, `Expected 8.5-12 hrs, got ${pred.predictedTimeHours}`);
  assert.ok(pred.confidenceScore > 0.90, 'Confidence score should be > 0.90');
});

await itAsync('Cross-country express haul (Lahore -> Karachi 1210 km, 30 kg, Express Tier)', async () => {
  const standardPred = await predictionService.predict({
    distanceKm: 1210,
    totalWeightKg: 30,
    bagCount: 2,
    luggageType: LUGGAGE_TYPES.BOX,
    transportTier: TRANSPORT_TIERS.STANDARD,
    isFragile: false
  });

  const expressPred = await predictionService.predict({
    distanceKm: 1210,
    totalWeightKg: 30,
    bagCount: 2,
    luggageType: LUGGAGE_TYPES.BOX,
    transportTier: TRANSPORT_TIERS.EXPRESS,
    isFragile: false
  });

  // Express should have higher cost and faster transit time than standard
  assert.ok(expressPred.predictedCost > standardPred.predictedCost, 'Express tier cost must exceed standard cost');
  assert.ok(expressPred.predictedTimeHours < standardPred.predictedTimeHours, 'Express transit time must be faster than standard');
});

await itAsync('Fragile high-value item adds risk handling markup', async () => {
  const normalPred = await predictionService.predict({
    distanceKm: 380,
    totalWeightKg: 15,
    bagCount: 1,
    luggageType: LUGGAGE_TYPES.SUITCASE,
    transportTier: TRANSPORT_TIERS.STANDARD,
    isFragile: false
  });

  const fragilePred = await predictionService.predict({
    distanceKm: 380,
    totalWeightKg: 15,
    bagCount: 1,
    luggageType: LUGGAGE_TYPES.SUITCASE,
    transportTier: TRANSPORT_TIERS.STANDARD,
    isFragile: true
  });

  assert.ok(fragilePred.predictedCost > normalPred.predictedCost, 'Fragile shipment must have higher fare due to padding/care');
});

// 3. Model Versioning & Relational Database Logging
console.log('\n3. Testing Model Versioning & Relational Audit Logging:');

await itAsync('Inference record persisted in database with model version & features snapshot', async () => {
  const pred = await predictionService.predict({
    customerId: 'USR-2026-CUST01',
    distanceKm: 530,
    totalWeightKg: 22,
    bagCount: 2,
    luggageType: LUGGAGE_TYPES.BAG,
    transportTier: TRANSPORT_TIERS.STANDARD,
    isFragile: false
  });

  const saved = db.tables.predictions.findById(pred.id);
  assert.ok(saved, 'Prediction must be found in database');
  assert.strictEqual(saved.modelVersion, 'v2.1-rf-regressor-domestic');
  assert.strictEqual(saved.status, PREDICTION_STATUS.COMPLETED);
  assert.strictEqual(saved.inputFeatures.distanceKm, 530);
  assert.strictEqual(saved.inputFeatures.totalWeightKg, 22);
  assert.ok(saved.createdAt, 'Timestamp must be recorded');
});

it('Admin Analytics method aggregates prediction metrics correctly', () => {
  const analytics = predictionService.getAnalytics();
  assert.ok(analytics.totalPredictions > 0, 'Total predictions should be > 0');
  assert.ok(analytics.averagePredictedCost > 0, 'Average cost should be > 0');
  assert.ok(analytics.averagePredictedDeliveryTimeHours > 0, 'Average time should be > 0');
  assert.strictEqual(analytics.activeModelVersion, 'v2.1-rf-regressor-domestic');
  assert.ok(analytics.recentPredictions.length > 0, 'Recent predictions list should not be empty');
});

// 4. Validation & Edge Cases
console.log('\n4. Testing Feature Validation & Error Handling:');

await itAsync('Null input features vector throws ValidationError', async () => {
  let thrown = false;
  try {
    await predictionService.predict(null);
  } catch (err) {
    if (err instanceof ValidationError) thrown = true;
  }
  assert.strictEqual(thrown, true, 'Null input must throw ValidationError');
});

await itAsync('Zero or negative route distance throws ValidationError', async () => {
  let thrown = false;
  try {
    await predictionService.predict({ distanceKm: 0, totalWeightKg: 10 });
  } catch (err) {
    if (err instanceof ValidationError) thrown = true;
  }
  assert.strictEqual(thrown, true, 'Zero distance must throw ValidationError');
});

await itAsync('Zero or negative weight throws ValidationError', async () => {
  let thrown = false;
  try {
    await predictionService.predict({ distanceKm: 100, totalWeightKg: -5 });
  } catch (err) {
    if (err instanceof ValidationError) thrown = true;
  }
  assert.strictEqual(thrown, true, 'Negative weight must throw ValidationError');
});

console.log('\n===============================================================');
console.log(`PHASE 6 ML RESULTS: ${passedCount} PASSED, ${totalTests - passedCount} FAILED`);
console.log('===============================================================\n');

if (passedCount !== totalTests) {
  process.exit(1);
}
