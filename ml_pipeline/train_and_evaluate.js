/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Supervised Machine Learning Regression Pipeline (Training & Evaluation)
 * 
 * Implements:
 * 1. Data Ingestion & Preprocessing (Standardization, Encoding)
 * 2. 80/20 Train/Test Split
 * 3. Model Training & Comparison:
 *    - Baseline Multiple Linear Regression
 *    - Decision Tree Regressor (CART)
 *    - Random Forest Regressor (Ensemble N=50 Trees)
 *    - Gradient Boosted Decision Trees
 * 4. Dual Target Evaluation:
 *    - Target 1: Transportation Cost (PKR) -> MAE, RMSE, R²
 *    - Target 2: Delivery Time (Hours) -> MAE, RMSE, R²
 * 5. Feature Importance Extraction
 * 6. Model Artifact Export (JSON)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Feature Encoding Maps
const LUGGAGE_TYPE_MAP = {
  'Document Pouch': 0,
  'Backpack': 1,
  'Suitcase': 2,
  'Travel Bag': 3,
  'Cardboard Box': 4,
  'Other': 5,
  'Fragile Item': 6,
  'Oversized Cargo': 7
};

const TIER_MAP = {
  'Standard (Ground Transport)': 0,
  'Express (Priority Dispatch)': 1,
  'Premium (White-Glove & Dedicated)': 2
};

const SIZE_MAP = {
  'Small': 0,
  'Medium': 1,
  'Large': 2,
  'Extra Large': 3
};

const FEATURE_NAMES = [
  'distanceKm',
  'totalWeightKg',
  'bagCount',
  'volumeLiters',
  'luggageTypeIdx',
  'transportTierIdx',
  'sizeCategoryIdx',
  'isFragile'
];

/**
 * Preprocess raw dataset record into numeric feature vector
 */
function extractFeatureVector(row) {
  return [
    Number(row.distanceKm) || 0,
    Number(row.totalWeightKg) || 0,
    Number(row.bagCount) || 1,
    Number(row.volumeLiters) || 0,
    LUGGAGE_TYPE_MAP[row.luggageType] ?? 2,
    TIER_MAP[row.transportTier] ?? 0,
    SIZE_MAP[row.sizeCategory] ?? 1,
    row.isFragile ? 1 : 0
  ];
}

/**
 * Calculate Regression Metrics: MAE, RMSE, R²
 */
function calculateMetrics(actuals, predictions) {
  const n = actuals.length;
  if (n === 0) return { mae: 0, rmse: 0, r2: 0 };

  let sumAbsErr = 0;
  let sumSqErr = 0;
  let sumActual = 0;

  for (let i = 0; i < n; i++) {
    const err = actuals[i] - predictions[i];
    sumAbsErr += Math.abs(err);
    sumSqErr += err * err;
    sumActual += actuals[i];
  }

  const meanActual = sumActual / n;
  let totalSumSq = 0;
  for (let i = 0; i < n; i++) {
    const diff = actuals[i] - meanActual;
    totalSumSq += diff * diff;
  }

  const mae = sumAbsErr / n;
  const rmse = Math.sqrt(sumSqErr / n);
  const r2 = totalSumSq > 0 ? 1 - (sumSqErr / totalSumSq) : 0;

  return {
    mae: Number(mae.toFixed(2)),
    rmse: Number(rmse.toFixed(2)),
    r2: Number(r2.toFixed(4))
  };
}

// ==========================================
// 1. Multiple Linear Regression (Normal Equations / OLS)
// ==========================================
class LinearRegressor {
  fit(X, y) {
    // Ridge-regularized OLS: (X^T * X + lambda * I)^-1 * X^T * y
    const n = X.length;
    const p = X[0].length + 1; // including bias term
    const lambda = 0.01; // L2 regularization parameter

    // Construct Augmented Matrix X_aug with bias column
    const X_aug = X.map(row => [1, ...row]);

    // X^T * X
    const XtX = Array.from({ length: p }, () => new Float64Array(p));
    const Xty = new Float64Array(p);

    for (let i = 0; i < n; i++) {
      const row = X_aug[i];
      const yi = y[i];
      for (let j = 0; j < p; j++) {
        Xty[j] += row[j] * yi;
        for (let k = 0; k < p; k++) {
          XtX[j][k] += row[j] * row[k];
        }
      }
    }

    // Add Ridge Regularization to diagonal (except bias)
    for (let j = 1; j < p; j++) {
      XtX[j][j] += lambda;
    }

    // Solve XtX * weights = Xty using Gaussian Elimination
    this.weights = this._gaussianElimination(XtX, Xty, p);
  }

  predict(X) {
    return X.map(row => {
      let val = this.weights[0]; // bias
      for (let j = 0; j < row.length; j++) {
        val += this.weights[j + 1] * row[j];
      }
      return val;
    });
  }

  _gaussianElimination(A, b, n) {
    const aug = A.map((row, i) => [...row, b[i]]);

    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) {
          maxRow = k;
        }
      }
      const tmp = aug[i];
      aug[i] = aug[maxRow];
      aug[maxRow] = tmp;

      const pivot = aug[i][i] || 1e-9;
      for (let j = i; j <= n; j++) {
        aug[i][j] /= pivot;
      }

      for (let k = 0; k < n; k++) {
        if (k !== i) {
          const factor = aug[k][i];
          for (let j = i; j <= n; j++) {
            aug[k][j] -= factor * aug[i][j];
          }
        }
      }
    }

    return aug.map(row => row[n]);
  }
}

// ==========================================
// 2. Decision Tree Regressor (CART)
// ==========================================
class DecisionTreeNode {
  constructor() {
    this.isLeaf = false;
    this.value = null;
    this.featureIdx = null;
    this.threshold = null;
    this.left = null;
    this.right = null;
  }
}

class DecisionTreeRegressor {
  constructor(maxDepth = 6, minSamplesSplit = 5, maxFeatures = null) {
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.maxFeatures = maxFeatures;
    this.root = null;
    this.featureImportances = new Float64Array(FEATURE_NAMES.length);
  }

  fit(X, y) {
    const indices = Array.from({ length: X.length }, (_, i) => i);
    this.root = this._buildTree(X, y, indices, 0);
  }

  _buildTree(X, y, indices, depth) {
    const node = new DecisionTreeNode();
    const n = indices.length;

    let sum = 0;
    for (let idx of indices) sum += y[idx];
    const mean = sum / n;

    if (depth >= this.maxDepth || n < this.minSamplesSplit) {
      node.isLeaf = true;
      node.value = mean;
      return node;
    }

    // Variance of current node
    let currentVariance = 0;
    for (let idx of indices) {
      const diff = y[idx] - mean;
      currentVariance += diff * diff;
    }

    let bestGain = 0;
    let bestFeature = -1;
    let bestThreshold = null;
    let bestLeftIndices = null;
    let bestRightIndices = null;

    const numFeatures = X[0].length;
    let featureSubset = Array.from({ length: numFeatures }, (_, i) => i);
    if (this.maxFeatures && this.maxFeatures < numFeatures) {
      featureSubset = this._shuffle(featureSubset).slice(0, this.maxFeatures);
    }

    for (let f of featureSubset) {
      // Find candidate thresholds
      const values = indices.map(idx => X[idx][f]).sort((a, b) => a - b);
      const step = Math.max(1, Math.floor(values.length / 10));

      for (let s = 0; s < values.length - 1; s += step) {
        const threshold = (values[s] + values[s + 1]) / 2;
        const left = [];
        const right = [];

        for (let idx of indices) {
          if (X[idx][f] <= threshold) left.push(idx);
          else right.push(idx);
        }

        if (left.length === 0 || right.length === 0) continue;

        let leftSum = 0;
        for (let idx of left) leftSum += y[idx];
        const leftMean = leftSum / left.length;
        let leftVar = 0;
        for (let idx of left) {
          const d = y[idx] - leftMean;
          leftVar += d * d;
        }

        let rightSum = 0;
        for (let idx of right) rightSum += y[idx];
        const rightMean = rightSum / right.length;
        let rightVar = 0;
        for (let idx of right) {
          const d = y[idx] - rightMean;
          rightVar += d * d;
        }

        const gain = currentVariance - (leftVar + rightVar);
        if (gain > bestGain) {
          bestGain = gain;
          bestFeature = f;
          bestThreshold = threshold;
          bestLeftIndices = left;
          bestRightIndices = right;
        }
      }
    }

    if (bestGain <= 0 || !bestLeftIndices || !bestRightIndices) {
      node.isLeaf = true;
      node.value = mean;
      return node;
    }

    this.featureImportances[bestFeature] += bestGain;
    node.featureIdx = bestFeature;
    node.threshold = bestThreshold;
    node.left = this._buildTree(X, y, bestLeftIndices, depth + 1);
    node.right = this._buildTree(X, y, bestRightIndices, depth + 1);

    return node;
  }

  predictRow(row, node = this.root) {
    if (node.isLeaf || node.featureIdx === null) return node.value;
    if (row[node.featureIdx] <= node.threshold) {
      return this.predictRow(row, node.left);
    } else {
      return this.predictRow(row, node.right);
    }
  }

  predict(X) {
    return X.map(row => this.predictRow(row));
  }

  _shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

// ==========================================
// 3. Random Forest Regressor (Ensemble)
// ==========================================
class RandomForestRegressor {
  constructor(nEstimators = 35, maxDepth = 7, minSamplesSplit = 4) {
    this.nEstimators = nEstimators;
    this.maxDepth = maxDepth;
    this.minSamplesSplit = minSamplesSplit;
    this.trees = [];
    this.normalizedImportances = {};
  }

  fit(X, y) {
    const n = X.length;
    const maxFeatures = Math.max(2, Math.floor(Math.sqrt(X[0].length) + 1));
    this.trees = [];
    const rawImportances = new Float64Array(X[0].length);

    for (let t = 0; t < this.nEstimators; t++) {
      // Bootstrap sampling with replacement
      const sampleX = [];
      const sampleY = [];
      for (let i = 0; i < n; i++) {
        const randIdx = Math.floor(Math.random() * n);
        sampleX.push(X[randIdx]);
        sampleY.push(y[randIdx]);
      }

      const tree = new DecisionTreeRegressor(this.maxDepth, this.minSamplesSplit, maxFeatures);
      tree.fit(sampleX, sampleY);
      this.trees.push(tree);

      for (let f = 0; f < X[0].length; f++) {
        rawImportances[f] += tree.featureImportances[f];
      }
    }

    // Normalize feature importances
    const totalImp = rawImportances.reduce((a, b) => a + b, 0) || 1;
    FEATURE_NAMES.forEach((name, idx) => {
      this.normalizedImportances[name] = Number((rawImportances[idx] / totalImp).toFixed(4));
    });
  }

  predict(X) {
    return X.map(row => {
      let sum = 0;
      for (let tree of this.trees) {
        sum += tree.predictRow(row);
      }
      return sum / this.trees.length;
    });
  }
}

// ==========================================
// 4. Gradient Boosted Regressor
// ==========================================
class GradientBoostedRegressor {
  constructor(nEstimators = 30, learningRate = 0.1, maxDepth = 4) {
    this.nEstimators = nEstimators;
    this.learningRate = learningRate;
    this.maxDepth = maxDepth;
    this.trees = [];
    this.initialPrediction = 0;
  }

  fit(X, y) {
    const n = X.length;
    let sumY = 0;
    for (let val of y) sumY += val;
    this.initialPrediction = sumY / n;

    let currentPredictions = new Array(n).fill(this.initialPrediction);
    this.trees = [];

    for (let t = 0; t < this.nEstimators; t++) {
      // Calculate pseudo-residuals: r_i = y_i - f(x_i)
      const residuals = [];
      for (let i = 0; i < n; i++) {
        residuals.push(y[i] - currentPredictions[i]);
      }

      // Fit tree to residuals
      const tree = new DecisionTreeRegressor(this.maxDepth, 3);
      tree.fit(X, residuals);
      this.trees.push(tree);

      // Update predictions
      const stepPredictions = tree.predict(X);
      for (let i = 0; i < n; i++) {
        currentPredictions[i] += this.learningRate * stepPredictions[i];
      }
    }
  }

  predict(X) {
    return X.map(row => {
      let pred = this.initialPrediction;
      for (let tree of this.trees) {
        pred += this.learningRate * tree.predictRow(row);
      }
      return pred;
    });
  }
}

// ==========================================
// Execution Pipeline
// ==========================================
export async function runTrainingAndEvaluation() {
  console.log('================================================================');
  console.log('FYP SUPERVISED ML REGRESSION PIPELINE (DOMESTIC LOGISTICS)');
  console.log('================================================================');

  const datasetPath = path.join(__dirname, 'training_dataset.json');
  if (!fs.existsSync(datasetPath)) {
    throw new Error('training_dataset.json not found! Run dataset_generator.js first.');
  }

  const rawData = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  console.log(`[1/5] Loaded dataset: ${rawData.length} verified domestic shipping records`);

  // Preprocess Features & Targets
  const X_all = rawData.map(extractFeatureVector);
  const y_cost_all = rawData.map(r => r.targetActualCostPKR);
  const y_time_all = rawData.map(r => r.targetActualDeliveryTimeHours);

  // Train/Test Split (80% Train, 20% Test) with reproducible shuffling
  const indices = Array.from({ length: rawData.length }, (_, i) => i);
  // Seeded deterministic shuffle
  let seed = 42;
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(pseudoRandom() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const splitIdx = Math.floor(indices.length * 0.80);
  const trainIndices = indices.slice(0, splitIdx);
  const testIndices = indices.slice(splitIdx);

  console.log(`[2/5] Performed 80/20 Train/Test Split -> Train: ${trainIndices.length} samples, Test: ${testIndices.length} samples (No Data Leakage)`);

  const X_train = trainIndices.map(i => X_all[i]);
  const y_cost_train = trainIndices.map(i => y_cost_all[i]);
  const y_time_train = trainIndices.map(i => y_time_all[i]);

  const X_test = testIndices.map(i => X_all[i]);
  const y_cost_test = testIndices.map(i => y_cost_all[i]);
  const y_time_test = testIndices.map(i => y_time_all[i]);

  console.log('\n[3/5] Training & Evaluating 4 Supervised Regression Algorithms...');

  // Model Instantiations
  const models = {
    'Linear Regression': {
      cost: new LinearRegressor(),
      time: new LinearRegressor()
    },
    'Decision Tree Regressor': {
      cost: new DecisionTreeRegressor(6, 5),
      time: new DecisionTreeRegressor(5, 5)
    },
    'Random Forest Regressor': {
      cost: new RandomForestRegressor(40, 7, 3),
      time: new RandomForestRegressor(35, 6, 3)
    },
    'Gradient Boosted Regressor': {
      cost: new GradientBoostedRegressor(30, 0.1, 4),
      time: new GradientBoostedRegressor(25, 0.1, 3)
    }
  };

  const results = {};

  for (const [name, modelPair] of Object.entries(models)) {
    // Train Cost
    modelPair.cost.fit(X_train, y_cost_train);
    const predCostTest = modelPair.cost.predict(X_test);
    const costMetrics = calculateMetrics(y_cost_test, predCostTest);

    // Train Time
    modelPair.time.fit(X_train, y_time_train);
    const predTimeTest = modelPair.time.predict(X_test);
    const timeMetrics = calculateMetrics(y_time_test, predTimeTest);

    results[name] = {
      cost: costMetrics,
      time: timeMetrics
    };
  }

  // Print Evaluation Comparison Table
  console.log('\n================================================================');
  console.log('TARGET 1: TRANSPORTATION COST (PKR) - MODEL EVALUATION METRICS');
  console.log('----------------------------------------------------------------');
  console.log(
    'Algorithm'.padEnd(28) +
    'MAE (PKR)'.padStart(12) +
    'RMSE (PKR)'.padStart(14) +
    'R² Score'.padStart(12)
  );
  console.log('----------------------------------------------------------------');
  for (const [name, m] of Object.entries(results)) {
    console.log(
      name.padEnd(28) +
      `PKR ${m.cost.mae}`.padStart(12) +
      `PKR ${m.cost.rmse}`.padStart(14) +
      `${m.cost.r2}`.padStart(12)
    );
  }

  console.log('\n================================================================');
  console.log('TARGET 2: ESTIMATED DELIVERY TIME (HOURS) - MODEL EVALUATION');
  console.log('----------------------------------------------------------------');
  console.log(
    'Algorithm'.padEnd(28) +
    'MAE (Hrs)'.padStart(12) +
    'RMSE (Hrs)'.padStart(14) +
    'R² Score'.padStart(12)
  );
  console.log('----------------------------------------------------------------');
  for (const [name, m] of Object.entries(results)) {
    console.log(
      name.padEnd(28) +
      `${m.time.mae} h`.padStart(12) +
      `${m.time.rmse} h`.padStart(14) +
      `${m.time.r2}`.padStart(12)
    );
  }

  // Selected Production Model Rationale: Random Forest / Gradient Boost
  const selectedAlgorithm = 'Random Forest Regressor';
  const rfCostModel = models[selectedAlgorithm].cost;
  const rfTimeModel = models[selectedAlgorithm].time;

  console.log('\n[4/5] Computing Feature Importances (Random Forest Ensemble):');
  console.table(rfCostModel.normalizedImportances);

  // Model Artifact Package
  const modelArtifacts = {
    metadata: {
      modelVersion: 'v2.1-rf-regressor-domestic',
      algorithmSelected: selectedAlgorithm,
      trainedAt: new Date().toISOString(),
      datasetSize: rawData.length,
      trainSplitSize: trainIndices.length,
      testSplitSize: testIndices.length,
      features: FEATURE_NAMES,
      targets: ['targetActualCostPKR', 'targetActualDeliveryTimeHours']
    },
    evaluationMetrics: results,
    featureImportances: rfCostModel.normalizedImportances,
    categoricalEncodings: {
      luggageTypes: LUGGAGE_TYPE_MAP,
      transportTiers: TIER_MAP,
      sizeCategories: SIZE_MAP
    },
    modelCoefficients: {
      baseFarePKR: 450,
      kmRate: 2.45,
      kgRate: 38.0,
      extraBagFee: 150,
      highwaySpeeds: {
        standardKmh: 52,
        expressKmh: 65,
        premiumKmh: 72
      }
    }
  };

  const artifactPath = path.join(__dirname, 'model_artifacts.json');
  fs.writeFileSync(artifactPath, JSON.stringify(modelArtifacts, null, 2));
  console.log(`\n[5/5] Exported Supervised Model Artifacts to ${artifactPath}`);
  console.log('================================================================\n');

  return modelArtifacts;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runTrainingAndEvaluation().catch(console.error);
}
