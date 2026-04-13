export type Role = 'PASSENGER' | 'DRIVER';

export interface User {
    id: string;
    email: string;
    role: Role;
    name?: string;
    phone?: string;
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface Location extends Coordinates {
    address?: string;
}

export type BookingStatus =
    | 'CREATED'
    | 'SEARCHING_DRIVER'
    | 'PROPOSED'
    | 'DRIVER_ASSIGNED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED'
    | 'MATCH_FAILED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface Booking {
    bookingId: string;
    rideId?: string;
    userId: string;
    status: BookingStatus;
    paymentStatus?: PaymentStatus;
    pickup: Location;
    drop: Location;
    vehicleType: string;
    estimatedPrice?: number;
    driverId?: string;
    driverLocation?: Coordinates;
    createdAt?: string;
}

export interface Driver {
    driverId: string;
    lat: number;
    lng: number;
    status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
    heading?: number;
}
