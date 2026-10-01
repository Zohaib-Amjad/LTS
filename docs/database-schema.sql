-- ==============================================================================
-- SMART ONLINE LUGGAGE TRANSPORTATION USING AI (FYP)
-- Relational Database DDL Schema (PostgreSQL / MySQL Compatible)
-- ==============================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('CUSTOMER', 'DRIVER', 'ADMIN')),
    password_hash VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'Pakistan',
    avatar_initials VARCHAR(10) DEFAULT 'SL',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_city ON users(city);

-- 2. DRIVERS TABLE
CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(100) NOT NULL,
    vehicle_plate VARCHAR(50) NOT NULL UNIQUE,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    rating NUMERIC(3,2) NOT NULL DEFAULT 5.00,
    total_trips INTEGER NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    current_city VARCHAR(100) NOT NULL,
    current_lat NUMERIC(9,6),
    current_lng NUMERIC(9,6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drivers_available_city ON drivers(is_available, current_city);

-- 3. LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS locations (
    id VARCHAR(36) PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    address_line TEXT NOT NULL,
    postal_code VARCHAR(20),
    landmark VARCHAR(150),
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    contact_person VARCHAR(150),
    contact_phone VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_locations_city ON locations(city);

-- 4. PREDICTIONS TABLE (Supervised ML Regression Inferences)
CREATE TABLE IF NOT EXISTS predictions (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36),
    customer_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
    input_features JSONB NOT NULL,
    predicted_cost NUMERIC(10,2) NOT NULL,
    predicted_time_hours NUMERIC(6,2) NOT NULL,
    confidence_score NUMERIC(5,4) NOT NULL DEFAULT 0.9400,
    model_version VARCHAR(50) NOT NULL,
    algorithm_used VARCHAR(100) NOT NULL,
    feature_importance JSONB,
    status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(36) PRIMARY KEY,
    booking_number VARCHAR(64) NOT NULL UNIQUE,
    customer_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    pickup_location_id VARCHAR(36) NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    destination_location_id VARCHAR(36) NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    distance_km NUMERIC(8,2) NOT NULL,
    prediction_id VARCHAR(36) NOT NULL REFERENCES predictions(id) ON DELETE RESTRICT,
    assigned_driver_id VARCHAR(36) REFERENCES drivers(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL CHECK (
        status IN ('PENDING', 'CONFIRMED', 'DRIVER_ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'FAILED')
    ),
    transport_tier VARCHAR(50) NOT NULL DEFAULT 'Standard (Ground Transport)',
    quoted_cost NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'PKR',
    estimated_delivery_time_hours NUMERIC(6,2) NOT NULL,
    scheduled_pickup_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_pickup_time TIMESTAMP WITH TIME ZONE,
    actual_delivery_time TIMESTAMP WITH TIME ZONE,
    customer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_assigned_driver_id ON bookings(assigned_driver_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);

-- 6. LUGGAGE TABLE
CREATE TABLE IF NOT EXISTS luggage (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36) REFERENCES bookings(id) ON DELETE SET NULL,
    customer_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    weight_kg NUMERIC(6,2) NOT NULL,
    length_cm NUMERIC(6,2) NOT NULL,
    width_cm NUMERIC(6,2) NOT NULL,
    height_cm NUMERIC(6,2) NOT NULL,
    volume_liters NUMERIC(8,2) NOT NULL,
    size_category VARCHAR(50) NOT NULL,
    is_fragile BOOLEAN NOT NULL DEFAULT FALSE,
    declared_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    special_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_luggage_booking_id ON luggage(booking_id);
CREATE INDEX idx_luggage_customer_id ON luggage(customer_id);

-- 7. BOOKING STATUS HISTORY (State Machine Audit Trail)
CREATE TABLE IF NOT EXISTS booking_status_history (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    changed_by_user_id VARCHAR(36) NOT NULL REFERENCES users(id),
    changed_by_role VARCHAR(20) NOT NULL,
    note TEXT,
    location_stamp VARCHAR(150),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_history_booking_id ON booking_status_history(booking_id, timestamp);

-- 8. FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS feedback (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36) NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    customer_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_id VARCHAR(36) REFERENCES drivers(id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feedback_driver_id ON feedback(driver_id);

-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'INFO' CHECK (type IN ('INFO', 'SUCCESS', 'WARNING', 'ALERT')),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link_action VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifs_user_unread ON notifications(user_id, is_read);
