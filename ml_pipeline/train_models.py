"""
SMART ONLINE LUGGAGE TRANSPORTATION USING AI - FYP
Python Scikit-Learn / XGBoost Supervised Regression Pipeline

This script trains dual supervised regression models:
1. Transportation Cost (PKR)
2. Estimated Delivery Time (Hours)

Models Evaluated:
- Multiple Linear Regression (OLS)
- Decision Tree Regressor (CART)
- Random Forest Regressor
- XGBoost / Gradient Boosting Regressor
"""

import os
import json
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

def load_dataset(filepath="training_dataset.json"):
    with open(filepath, 'r') as f:
        data = json.load(f)
    return pd.DataFrame(data)

def preprocess_data(df):
    type_map = {
        'Document Pouch': 0, 'Backpack': 1, 'Suitcase': 2, 'Travel Bag': 3,
        'Cardboard Box': 4, 'Other': 5, 'Fragile Item': 6, 'Oversized Cargo': 7
    }
    tier_map = {
        'Standard (Ground Transport)': 0,
        'Express (Priority Dispatch)': 1,
        'Premium (White-Glove & Dedicated)': 2
    }
    size_map = {'Small': 0, 'Medium': 1, 'Large': 2, 'Extra Large': 3}

    df['luggageTypeIdx'] = df['luggageType'].map(type_map).fillna(2)
    df['transportTierIdx'] = df['transportTier'].map(tier_map).fillna(0)
    df['sizeCategoryIdx'] = df['sizeCategory'].map(size_map).fillna(1)
    df['isFragileInt'] = df['isFragile'].astype(int)

    feature_cols = [
        'distanceKm', 'totalWeightKg', 'bagCount', 'volumeLiters',
        'luggageTypeIdx', 'transportTierIdx', 'sizeCategoryIdx', 'isFragileInt'
    ]

    X = df[feature_cols]
    y_cost = df['targetActualCostPKR']
    y_time = df['targetActualDeliveryTimeHours']

    return X, y_cost, y_time, feature_cols

def evaluate_models(X_train, X_test, y_train, y_test, target_name):
    models = {
        'Linear Regression': LinearRegression(),
        'Decision Tree Regressor': DecisionTreeRegressor(max_depth=6, random_state=42),
        'Random Forest Regressor': RandomForestRegressor(n_estimators=50, max_depth=8, random_state=42),
        'Gradient Boosting Regressor': GradientBoostingRegressor(n_estimators=40, learning_rate=0.1, max_depth=4, random_state=42)
    }

    results = {}
    print(f"\n=======================================================")
    print(f"EVALUATION RESULTS FOR {target_name.upper()}")
    print(f"{'Algorithm':<30} | {'MAE':<10} | {'RMSE':<10} | {'R2 Score':<10}")
    print(f"-------------------------------------------------------")

    for name, model in models.items():
        model.fit(X_train, y_train)
        preds = model.predict(X_test)

        mae = mean_absolute_error(y_test, preds)
        rmse = np.sqrt(mean_squared_error(y_test, preds))
        r2 = r2_score(y_test, preds)

        results[name] = {'model': model, 'mae': mae, 'rmse': rmse, 'r2': r2}
        print(f"{name:<30} | {mae:<10.2f} | {rmse:<10.2f} | {r2:<10.4f}")

    return results

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(script_dir, "training_dataset.json")

    if not os.path.exists(dataset_path):
        print("Dataset not found. Please run node dataset_generator.js first.")
        return

    print("Loading Pakistani domestic logistics dataset...")
    df = load_dataset(dataset_path)
    print(f"Loaded {len(df)} samples.")

    X, y_cost, y_time, feature_names = preprocess_data(df)

    # 80/20 Train-Test split
    X_train, X_test, y_cost_train, y_cost_test, y_time_train, y_time_test = train_test_split(
        X, y_cost, y_time, test_size=0.20, random_state=42
    )
    print(f"Train samples: {len(X_train)} | Test samples: {len(X_test)} (Strict no data leakage)")

    cost_results = evaluate_models(X_train, X_test, y_cost_train, y_cost_test, "Transportation Cost (PKR)")
    time_results = evaluate_models(X_train, X_test, y_time_train, y_time_test, "Estimated Delivery Time (Hours)")

    # Select Best Models (Random Forest)
    best_cost_model = cost_results['Random Forest Regressor']['model']
    best_time_model = time_results['Random Forest Regressor']['model']

    # Export Trained Models
    joblib.dump(best_cost_model, os.path.join(script_dir, "rf_cost_model.joblib"))
    joblib.dump(best_time_model, os.path.join(script_dir, "rf_delivery_time_model.joblib"))
    print("\nSaved trained model joblib files successfully for deployment/supervisor inspection.")

if __name__ == "__main__":
    main()
