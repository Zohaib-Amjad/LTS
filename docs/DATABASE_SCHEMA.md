# Database Schema & Entity Relationship Architecture
**Project:** Smart Online Luggage Transportation Using AI (FYP)  
**Target RDBMS:** PostgreSQL / MySQL / SQLite / Prisma Compatible

---

## 1. Entity-Relationship Conceptual Model

```mermaid
erDiagram
    USER ||--o{ DRIVER : "has profile"
    USER ||--o{ BOOKING : "places (Customer)"
    USER ||--o{ NOTIFICATION : "receives"
    USER ||--o{ FEEDBACK : "submits"
    USER ||--o{ BOOKING_STATUS_HISTORY : "authorizes"

    DRIVER ||--o{ BOOKING : "assigned to"
    DRIVER ||--o{ FEEDBACK : "rated in"

    LOCATION ||--o{ BOOKING : "pickup origin"
    LOCATION ||--o{ BOOKING : "destination"

    BOOKING ||--|{ LUGGAGE : "contains items"
    BOOKING ||--|| PREDICTION : "uses ML estimate"
    BOOKING ||--o{ BOOKING_STATUS_HISTORY : "tracks timeline"
    BOOKING ||--o| FEEDBACK : "receives post-trip"

    USER {
        string id PK
        string email UK
        string full_name
        string phone
        string role "CUSTOMER | DRIVER | ADMIN"
        string password_hash
        string address
        string city
        string country
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    DRIVER {
        string id PK
        string user_id FK
        string vehicle_type
        string vehicle_plate UK
        string license_number UK
        float rating
        int total_trips
        boolean is_available
        string current_city
        float current_lat
        float current_lng
        datetime created_at
        datetime updated_at
    }

    LOCATION {
        string id PK
        string city
        string address_line
        string postal_code
        string landmark
        float latitude
        float longitude
        string contact_person
        string contact_phone
        datetime created_at
    }

    LUGGAGE {
        string id PK
        string booking_id FK "nullable"
        string customer_id FK
        string type "Suitcase | Backpack | Box | Fragile | Oversized | Documents"
        float weight_kg
        float length_cm
        float width_cm
        float height_cm
        float volume_liters
        string size_category "Small | Medium | Large | Extra Large"
        boolean is_fragile
        float declared_value
        text special_instructions
        datetime created_at
    }

    PREDICTION {
        string id PK
        string booking_id FK "nullable"
        string customer_id FK "nullable"
        json input_features "distance, weight, bags, type, tier, etc."
        float predicted_cost
        float predicted_time_hours
        float confidence_score
        string model_version
        string algorithm_used "Random Forest | XGBoost"
        json feature_importance
        string status "PENDING | COMPLETED | FAILED"
        datetime created_at
    }

    BOOKING {
        string id PK
        string booking_number UK
        string customer_id FK
        string pickup_location_id FK
        string destination_location_id FK
        float distance_km
        string prediction_id FK
        string assigned_driver_id FK "nullable"
        string status "PENDING | CONFIRMED | DRIVER_ASSIGNED | PICKED_UP | IN_TRANSIT | DELIVERED | CANCELLED | FAILED"
        string transport_tier "Standard | Express | Premium"
        float quoted_cost
        string currency "PKR"
        float estimated_delivery_time_hours
        datetime scheduled_pickup_time
        datetime actual_pickup_time "nullable"
        datetime actual_delivery_time "nullable"
        text customer_notes
        datetime created_at
        datetime updated_at
    }

    BOOKING_STATUS_HISTORY {
        string id PK
        string booking_id FK
        string from_status "nullable"
        string to_status
        string changed_by_user_id FK
        string changed_by_role "CUSTOMER | DRIVER | ADMIN"
        text note
        string location_stamp
        datetime timestamp
    }

    FEEDBACK {
        string id PK
        string booking_id FK UK
        string customer_id FK
        string driver_id FK "nullable"
        int rating "1 to 5"
        text comment
        json tags
        datetime created_at
    }

    NOTIFICATION {
        string id PK
        string user_id FK
        string title
        text message
        string type "INFO | SUCCESS | WARNING | ALERT"
        boolean is_read
        string link_action
        datetime created_at
    }
```

---

## 2. Relational Schema Tables & Column Definitions

### 1. `users`
- **Primary Key:** `id` (VARCHAR 36 / UUID)
- **Unique Constraints:** `email` (VARCHAR 255)
- **Indexes:** `idx_users_email`, `idx_users_role`, `idx_users_city`
- **Role Permissions:**
  - `CUSTOMER`: Bookings, quotes, view luggage, submit feedback.
  - `DRIVER`: View assigned dispatches, update trip status checkpoints.
  - `ADMIN`: Full CRUD across users, drivers, assignments, and AI analytics.

### 2. `drivers`
- **Primary Key:** `id` (VARCHAR 36)
- **Foreign Key:** `user_id` $\rightarrow$ `users(id)` ON DELETE CASCADE
- **Unique Constraints:** `vehicle_plate`, `license_number`
- **Indexes:** `idx_drivers_user_id`, `idx_drivers_available_city`

### 3. `locations`
- **Primary Key:** `id` (VARCHAR 36)
- **Indexes:** `idx_locations_city`, `idx_locations_coords (latitude, longitude)`

### 4. `luggage`
- **Primary Key:** `id` (VARCHAR 36)
- **Foreign Keys:**
  - `customer_id` $\rightarrow$ `users(id)` ON DELETE CASCADE
  - `booking_id` $\rightarrow$ `bookings(id)` ON DELETE SET NULL
- **Indexes:** `idx_luggage_booking_id`, `idx_luggage_customer_id`

### 5. `predictions` (Supervised ML Regression Inferences)
- **Primary Key:** `id` (VARCHAR 36)
- **Foreign Keys:**
  - `booking_id` $\rightarrow$ `bookings(id)` ON DELETE SET NULL
  - `customer_id` $\rightarrow$ `users(id)` ON DELETE SET NULL
- **Indexes:** `idx_predictions_algorithm`, `idx_predictions_created_at`

### 6. `bookings` (Central Entity)
- **Primary Key:** `id` (VARCHAR 36)
- **Unique Constraints:** `booking_number` (VARCHAR 64)
- **Foreign Keys:**
  - `customer_id` $\rightarrow$ `users(id)`
  - `pickup_location_id` $\rightarrow$ `locations(id)`
  - `destination_location_id` $\rightarrow$ `locations(id)`
  - `prediction_id` $\rightarrow$ `predictions(id)`
  - `assigned_driver_id` $\rightarrow$ `drivers(id)` (NULLABLE)
- **Indexes:**
  - `idx_bookings_customer_id`
  - `idx_bookings_driver_id`
  - `idx_bookings_status`
  - `idx_bookings_created_at`

### 7. `booking_status_history` (Audit Trail)
- **Primary Key:** `id` (VARCHAR 36)
- **Foreign Keys:**
  - `booking_id` $\rightarrow$ `bookings(id)` ON DELETE CASCADE
  - `changed_by_user_id` $\rightarrow$ `users(id)`
- **Indexes:** `idx_status_history_booking_timestamp`

### 8. `feedback`
- **Primary Key:** `id` (VARCHAR 36)
- **Foreign Keys:**
  - `booking_id` $\rightarrow$ `bookings(id)` (UNIQUE)
  - `customer_id` $\rightarrow$ `users(id)`
  - `driver_id` $\rightarrow$ `drivers(id)`

### 9. `notifications`
- **Primary Key:** `id` (VARCHAR 36)
- **Foreign Keys:**
  - `user_id` $\rightarrow$ `users(id)` ON DELETE CASCADE
- **Indexes:** `idx_notifs_user_unread (user_id, is_read)`
