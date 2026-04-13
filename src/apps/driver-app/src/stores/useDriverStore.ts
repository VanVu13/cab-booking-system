import { create, StateCreator } from 'zustand'
import { persist } from 'zustand/middleware'

export type DriverStatus = 'OFFLINE' | 'ONLINE' | 'ON_TRIP'
export type RideStatus = 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface RideRequest {
    rideId: string
    bookingId?: string
    pickup: { lat: number; lng: number; address?: string }
    drop: { lat: number; lng: number; address?: string }
    estimatedPrice: number
    estimatedDistance?: number
    estimatedDuration?: number
    passengerName?: string
    passengerId?: string
    passengerAvatar?: string
    passengerPhone?: string
    paymentMethod?: string
}

export interface CurrentRide extends RideRequest {
    status: RideStatus
    startedAt?: string
}

export interface DriverStoreState {
    driverStatus: DriverStatus
    incomingRide: RideRequest | null
    currentRide: CurrentRide | null
    earningsToday: number
    totalTrips: number
    rating: number
    location: { lat: number; lng: number } | null
    setDriverStatus: (status: DriverStatus) => void
    setIncomingRide: (ride: RideRequest | null) => void
    setCurrentRide: (ride: CurrentRide | null) => void
    setLocation: (location: { lat: number; lng: number } | null) => void
    updateRideStatus: (status: RideStatus) => void
    addEarnings: (amount: number) => void
    incrementTrips: () => void
    setStats: (earnings: number, trips: number) => void
    setRating: (rating: number) => void
    reset: () => void
}

const driverStoreCreator: StateCreator<DriverStoreState> = (set) => ({
    driverStatus: 'OFFLINE',
    incomingRide: null,
    currentRide: null,
    earningsToday: 0,
    totalTrips: 0,
    rating: 0,
    location: null,

    setDriverStatus: (status: DriverStatus) => set({ driverStatus: status }),

    setLocation: (location: { lat: number; lng: number } | null) => {
        // Guard: never persist NaN coordinates - they corrupt Leaflet on next load
        if (location && (!Number.isFinite(location.lat) || !Number.isFinite(location.lng))) {
            console.warn('[DriverStore] Rejecting invalid location:', location);
            return;
        }
        set({ location });
    },

    setIncomingRide: (ride: RideRequest | null) => set({ incomingRide: ride }),

    setCurrentRide: (ride: CurrentRide | null) => set({ currentRide: ride }),

    updateRideStatus: (status: RideStatus) =>
        set((state: DriverStoreState) => ({
            currentRide: state.currentRide
                ? { ...state.currentRide, status }
                : null,
        })),

    addEarnings: (amount: number) =>
        set((state: DriverStoreState) => ({ earningsToday: state.earningsToday + amount })),

    incrementTrips: () =>
        set((state: DriverStoreState) => ({ totalTrips: state.totalTrips + 1 })),

    setStats: (earnings: number, trips: number) =>
        set({ earningsToday: earnings, totalTrips: trips }),

    setRating: (rating: number) =>
        set({ rating }),

    reset: () => set({
        driverStatus: 'OFFLINE',
        incomingRide: null,
        currentRide: null,
        rating: 0,
        location: null
    }),
});

export const useDriverStore = create<DriverStoreState>()(
    persist(
        driverStoreCreator,
        {
            name: 'driver-storage',
            // Sanitize persisted data on rehydration to prevent corrupted NaN coordinates
            merge: (persistedState, currentState) => {
                const merged = { ...currentState, ...(persistedState as Partial<DriverStoreState>) }
                // Reset location if it has invalid coordinates from a previous session
                if (merged.location && (!Number.isFinite(merged.location.lat) || !Number.isFinite(merged.location.lng))) {
                    merged.location = null
                }
                return merged
            }
        }
    )
)
