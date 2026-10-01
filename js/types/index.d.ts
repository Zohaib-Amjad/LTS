/**
 * SMART ONLINE LUGGAGE TRANSPORTATION USING AI
 * Core Domain Type Definitions & Relational Schema Contracts
 */

export type UserRole = 'CUSTOMER' | 'DRIVER' | 'ADMIN';

export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'DRIVER_ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'FAILED';

export type LuggageType =
  | 'Suitcase'
  | 'Backpack'
  | 'Cardboard Box'
  | 'Fragile Item'
  | 'Oversized Cargo'
  | 'Document Pouch';

export type LuggageSize =
  | 'Small (< 7kg / < 40L)'
  | 'Medium (7-15kg / 40-70L)'
  | 'Large (15-25kg / 70-100L)'
  | 'Extra Large (> 25kg / > 100L)';

export type TransportTier =
  | 'Standard (Ground Transport)'
  | 'Express (Priority Dispatch)'
  | 'Premium (White-Glove & Dedicated)';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  passwordHash: string;
  address?: string;
  city: string;
  country: string;
  avatarInitials: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  userId: string; // Foreign Key -> User.id
  vehicleType: string;
  vehiclePlate: string;
  licenseNumber: string;
  rating: number;
  totalTrips: number;
  isAvailable: boolean;
  currentCity: string;
  currentLat?: number;
  currentLng?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  city: string;
  addressLine: string;
  postalCode?: string;
  landmark?: string;
  latitude: number;
  longitude: number;
  contactPerson?: string;
  contactPhone?: string;
  createdAt: string;
}

export interface Luggage {
  id: string;
  bookingId?: string; // Foreign Key -> Booking.id
  customerId: string; // Foreign Key -> User.id
  type: LuggageType;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  volumeLiters: number;
  sizeCategory: LuggageSize;
  isFragile: boolean;
  declaredValue: number;
  specialInstructions?: string;
  createdAt: string;
}

export interface MLPredictionFeatureVector {
  distanceKm: number;
  totalWeightKg: number;
  bagCount: number;
  luggageType: LuggageType;
  sizeCategory: LuggageSize;
  transportTier: TransportTier;
  isFragile: boolean;
  timeOfDayHours: number;
  dayOfWeek: number;
}

export interface Prediction {
  id: string;
  bookingId?: string; // Foreign Key -> Booking.id
  customerId?: string; // Foreign Key -> User.id
  inputFeatures: MLPredictionFeatureVector;
  predictedCost: number; // in PKR / USD currency baseline
  predictedTimeHours: number; // estimated hours
  confidenceScore: number; // e.g. 0.94 (R2 / confidence score)
  modelVersion: string;
  algorithmUsed: string; // 'Random Forest Regressor' | 'XGBoost Regressor'
  featureImportance: Record<string, number>;
  createdAt: string;
}

export interface Booking {
  id: string;
  bookingNumber: string; // Human-friendly e.g. "BK-2026-0814"
  customerId: string; // Foreign Key -> User.id
  pickupLocationId: string; // Foreign Key -> Location.id
  destinationLocationId: string; // Foreign Key -> Location.id
  luggageIds: string[]; // Foreign Keys -> Luggage.id[]
  distanceKm: number;
  predictionId: string; // Foreign Key -> Prediction.id
  assignedDriverId?: string | null; // Foreign Key -> Driver.id
  status: BookingStatus;
  transportTier: TransportTier;
  quotedCost: number;
  currency: string;
  estimatedDeliveryTimeHours: number;
  scheduledPickupTime: string;
  actualPickupTime?: string;
  actualDeliveryTime?: string;
  customerNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingStatusHistory {
  id: string;
  bookingId: string; // Foreign Key -> Booking.id
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  changedByUserId: string; // Foreign Key -> User.id
  changedByRole: UserRole;
  note: string;
  locationStamp?: string;
  timestamp: string;
}

export interface Feedback {
  id: string;
  bookingId: string; // Foreign Key -> Booking.id
  customerId: string; // Foreign Key -> User.id
  driverId?: string; // Foreign Key -> Driver.id
  rating: number; // 1 to 5
  comment: string;
  tags: string[];
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string; // Foreign Key -> User.id
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  isRead: boolean;
  linkAction?: string;
  createdAt: string;
}

/**
 * Composite Hydrated Booking Object for Views
 */
export interface HydratedBooking extends Booking {
  customer?: User;
  pickupLocation?: Location;
  destinationLocation?: Location;
  luggageItems?: Luggage[];
  prediction?: Prediction;
  driver?: Driver & { user?: User };
  statusHistory?: BookingStatusHistory[];
  feedback?: Feedback;
}
