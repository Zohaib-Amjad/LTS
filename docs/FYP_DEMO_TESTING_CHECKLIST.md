# SMART ONLINE LUGGAGE TRANSPORTATION USING AI
## Phase 13 FYP Demonstration Guide & Testing Checklist

---

## 1. Demo User Accounts & Credentials Matrix

| Role | Name | Email Address | Password | City | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | System Administrator | `admin@smartluggage.pk` | `admin123` | Islamabad | Full platform access, fleet dispatch, ML analytics, tariff control |
| **CUSTOMER 1** | Ali Khan | `customer@smartluggage.pk` | `customer123` | Islamabad | Has in-transit & delivered bookings, reviews, notifications |
| **CUSTOMER 2** | Sarah Ali | `sarah.ali@smartluggage.pk` | `customer123` | Lahore | Has pending & picked-up bookings |
| **CUSTOMER 3** | Hamza Tariq | `hamza.tariq@smartluggage.pk` | `customer123` | Karachi | Has confirmed & cancelled bookings |
| **DRIVER 1** | Bilal Tariq | `driver@smartluggage.pk` | `driver123` | Rawalpindi | Toyota HiAce Van (`ICT-LE-4589`), Rating: 4.88 ⭐ |
| **DRIVER 2** | Kamran Shah | `kamran.shah@smartluggage.pk` | `driver123` | Lahore | Suzuki Every Carrier (`LHE-KA-7712`), Rating: 4.75 ⭐ |
| **DRIVER 3** | Usman Rafique | `usman.rafique@smartluggage.pk` | `driver123` | Peshawar | Hyundai Porter H100 (`PEW-AB-3341`), Rating: 4.92 ⭐ |

---

## 2. Seed Bookings Lifecycle State Coverage

| Booking Ref | Customer | Origin → Destination | Luggage Specs | Assigned Driver | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`SL-ISB-KHI-001`** | Ali Khan | Islamabad → Karachi | 1x Suitcase (18.5kg, Large) | Bilal Tariq (`DRV-101`) | `IN_TRANSIT` |
| **`SL-LHR-PEW-002`** | Sarah Ali | Lahore → Peshawar | 1x Backpack (6.2kg, Small) | *Unassigned* | `PENDING` |
| **`SL-RWP-MUX-003`** | Ali Khan | Rawalpindi → Multan | 1x Fragile (9.8kg, Medium) | Kamran Shah (`DRV-102`) | `DRIVER_ASSIGNED` |
| **`SL-KHI-ISB-004`** | Ali Khan | Karachi → Islamabad | 1x Box (12.0kg, Large) | Bilal Tariq (`DRV-101`) | `DELIVERED` (5★ Review) |
| **`SL-LHR-ISB-005`** | Hamza Tariq | Lahore → Islamabad | 1x Travel Bag (14.5kg, Med) | *Unassigned* | `CONFIRMED` |
| **`SL-LHR-PEW-006`** | Sarah Ali | Lahore → Peshawar | 1x Suitcase (22.0kg, XL) | Usman Rafique (`DRV-103`) | `PICKED_UP` |
| **`SL-KHI-HYD-007`** | Hamza Tariq | Karachi → Multan | 1x Box (8.5kg, Med) | *Unassigned* | `CANCELLED` |

---

## 3. FYP Interactive Demonstration Scenarios

### Scenario A: Customer Booking & AI Estimation Workflow
1. **Login:** Log in as Customer (`customer@smartluggage.pk` / `customer123`) or Register a new account.
2. **Step 1 - Routing:** Select Pickup (e.g. Lahore) and Destination (e.g. Islamabad). Route distance auto-calculates ($375\text{ km}$).
3. **Step 2 - Luggage:** Specify Luggage Type (Suitcase), Weight ($18.5\text{ kg}$), and Dimensions.
4. **Step 3 - AI Estimation:** Click **Get AI Prediction**. Supervised Random Forest Regressor computes:
   - Predicted Transportation Cost: ~$\text{PKR } 2,150$
   - Estimated Delivery Time: ~$8.5\text{ hours}$
   - Confidence Score: $0.945$
5. **Step 4 - Confirmation:** Confirm booking. Unique reference `LUG-2026-XXXXXX` generated in `CONFIRMED` state.
6. **Step 5 - Real-time Tracking:** Open visual timeline showing confirmed status, driver dispatch readiness, and milestones.

---

### Scenario B: Administrator Dispatch & Fleet Management
1. **Login:** Log in as Admin (`admin@smartluggage.pk` / `admin123`).
2. **Dashboard KPIs:** Review Total Bookings, Active Drivers, Average Customer Rating ($4.9\text{/5}$), and Corridors.
3. **Driver Assignment:** Open the Confirmed Booking from Scenario A.
4. **Fleet Selection:** Filter available active drivers. Assign `DRV-102` (Kamran Shah).
5. **State Transition:** Booking transitions from `CONFIRMED` $\to$ `DRIVER_ASSIGNED`. Status history audit logged with timestamp and admin actor.

---

### Scenario C: Driver Execution & Lifecycle Progression
1. **Login:** Log in as Driver (`kamran.shah@smartluggage.pk` / `driver123`).
2. **Driver Portal:** Assigned booking immediately appears in active trip list.
3. **Pickup:** Click **Mark Picked Up** $\to$ status transitions to `PICKED_UP`.
4. **Transit:** Click **Start Transit** $\to$ status transitions to `IN_TRANSIT`.
5. **Delivery Handover:** Click **Mark Delivered** $\to$ status transitions to `DELIVERED`. Driver availability resets to `AVAILABLE`.

---

### Scenario D: Customer Feedback & Rating Submission
1. **Customer View:** Log back in as the booking customer.
2. **Feedback Form:** Delivered trip unlocks feedback modal.
3. **Rating & Tags:** Submit 5-star rating, review comment, and tags (*Punctual, Careful Handling*).
4. **Instant Sync:** Driver cumulative rating and admin feedback charts update automatically.

---

## 4. AI Machine Learning Regression Verification

### Evaluation Results (Trained on 1,200 Domestic Shipping Samples)

| Algorithm | Cost MAE (PKR) | Cost RMSE (PKR) | Cost $R^2$ | Time MAE (hrs) | Time RMSE (hrs) | Time $R^2$ | Selected |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Gradient Boosted Regressor** | **393.27** | **503.85** | **0.9512** | **0.78** | **1.03** | **0.9777** | **Champion Model** |
| **Random Forest Regressor** | 454.04 | 606.15 | 0.9294 | 1.10 | 1.53 | 0.9507 | **Active Ensemble** |
| **Linear Regression (Baseline)** | 439.65 | 612.83 | 0.9279 | 0.80 | 1.02 | 0.9779 | Baseline |
| **Decision Tree Regressor** | 621.71 | 784.75 | 0.8817 | 0.79 | 0.96 | 0.9804 | Baseline |

---

## 5. Automated Verification Test Suite

Run the full end-to-end automated testing pipeline:

```bash
# Run all 12 test suites across the platform
npm test

# Or run the specific Phase 13 end-to-end demonstration scenarios
npm run test:demo
```

**Results:**
- Total Test Suites: 12
- Total Tests: **198 / 198 Passing (100%)**
