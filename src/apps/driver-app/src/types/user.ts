export interface VehicleDetails {
    make: string;
    model: string;
    year: string;
    color: string;
    plate: string;
    type: 'SEDAN' | 'SUV' | 'BIKE';
    photoUrl?: string;
}

export interface UserProfile {
    userId: string;
    name: string;
    email: string;
    role: 'DRIVER' | 'PASSENGER' | 'ADMIN';
    phone?: string;
    avatar?: string;
    address?: string;
    licenseNumber?: string;
    vehicleDetails?: VehicleDetails;
}

export interface UpdateProfileRequest {
    name?: string;
    phone?: string;
    avatar?: string;
    address?: string;
    licenseNumber?: string;
    vehicleDetails?: VehicleDetails;
}
