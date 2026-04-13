import { create, StateCreator } from 'zustand'
import { persist } from 'zustand/middleware'

export type VehicleType = 'SEDAN' | 'SUV' | 'BIKE'
export type PaymentMethod = 'CASH' | 'CARD'

export interface LocationPoint {
    lat: number
    lng: number
    address: string
}

interface BookingState {
    pickup: LocationPoint | null
    drop: LocationPoint | null
    vehicleType: VehicleType
    estimatedPrice: number | null
    distance: number | null
    duration: string | null
    bookingId: string | null
    paymentMethod: PaymentMethod

    // Actions
    setPickup: (location: LocationPoint) => void
    setDrop: (location: LocationPoint) => void
    setVehicleType: (type: VehicleType) => void
    setEstimate: (price: number, distance: number, duration: string) => void
    setBookingId: (id: string | null) => void
    setPaymentMethod: (method: PaymentMethod) => void
    resetBooking: () => void
}

const bookingStoreCreator: StateCreator<BookingState> = (set) => ({
    pickup: null,
    drop: null,
    vehicleType: 'SEDAN',
    estimatedPrice: null,
    distance: null,
    duration: null,
    bookingId: null,
    paymentMethod: 'CASH',

    setPickup: (pickup: LocationPoint) => set({ pickup }),
    setDrop: (drop: LocationPoint) => set({ drop }),
    setVehicleType: (vehicleType: VehicleType) => set({ vehicleType }),
    setEstimate: (estimatedPrice: number, distance: number, duration: string) => set({ estimatedPrice, distance, duration }),
    setBookingId: (bookingId: string | null) => set({ bookingId }),
    setPaymentMethod: (paymentMethod: PaymentMethod) => set({ paymentMethod }),
    resetBooking: () => set({
        pickup: null,
        drop: null,
        vehicleType: 'SEDAN',
        estimatedPrice: null,
        distance: null,
        duration: null,
        bookingId: null,
        paymentMethod: 'CASH'
    }),
});

export const useBookingStore = create<BookingState>()(
    persist(
        bookingStoreCreator,
        {
            name: 'booking-storage',
        }
    )
)
