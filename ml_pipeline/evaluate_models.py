"""
SMART ONLINE LUGGAGE TRANSPORTATION USING AI - FYP
Stand-alone Model Inference and Verification Tester
"""

import os
import json
import joblib
import numpy as np

def run_test_inference(distance_km, weight_kg, bag_count, luggage_type="Suitcase", tier="Standard (Ground Transport)", is_fragile=False):
    type_map = {
        'Document Pouch': 0, 'Backpack': 1, 'Suitcase': 2, 'Travel Bag': 3,
        'Cardboard Box': 4, 'Other': 5, 'Fragile Item': 6, 'Oversized Cargo': 7
    }
    tier_map = {
        'Standard (Ground Transport)': 0,
        'Express (Priority Dispatch)': 1,
        'Premium (White-Glove & Dedicated)': 2
    }
    
    volume_liters = weight_kg * 4.0
    size_idx = 2 if weight_kg >= 15 else 1
    
    features = [
        distance_km,
        weight_kg,
        bag_count,
        volume_liters,
        type_map.get(luggage_type, 2),
        tier_map.get(tier, 0),
        size_idx,
        1 if is_fragile else 0
    ]
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    cost_path = os.path.join(script_dir, "rf_cost_model.joblib")
    time_path = os.path.join(script_dir, "rf_delivery_time_model.joblib")
    
    if os.path.exists(cost_path) and os.path.exists(time_path):
        cost_model = joblib.load(cost_path)
        time_model = joblib.load(time_path)
        pred_cost = cost_model.predict([features])[0]
        pred_time = time_model.predict([features])[0]
        print(f"\n[Python Model Inference Results]")
        print(f"Route Distance: {distance_km} km | Luggage: {bag_count} bags ({weight_kg} kg, {luggage_type}) | Tier: {tier}")
        print(f"-> Predicted Transportation Cost: PKR {round(pred_cost, -1)}")
        print(f"-> Estimated Delivery Time: {round(pred_time, 1)} hours")
    else:
        print("Pre-trained joblib files not found. Train models first using train_models.py")

if __name__ == "__main__":
    print("Running Sample Inference Tests for Pakistani Highway Corridors...")
    # Test 1: Islamabad -> Lahore (380 km, standard suitcase 18 kg)
    run_test_inference(380, 18, 2, "Suitcase", "Standard (Ground Transport)", False)
    # Test 2: Lahore -> Karachi (1210 km, 3 boxes 30 kg, Express)
    run_test_inference(1210, 30, 3, "Cardboard Box", "Express (Priority Dispatch)", False)
    # Test 3: Islamabad -> Rawalpindi (25 km, 1 backpack 5 kg)
    run_test_inference(25, 5, 1, "Backpack", "Standard (Ground Transport)", False)
