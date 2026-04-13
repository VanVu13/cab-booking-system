import { VehicleType, LocationPoint, PaymentMethod } from '@/features/booking/store/useBookingStore'
import axiosClient from './axiosClient'

export const bookingApi = {
    create: async (payload: { pickup: LocationPoint, drop: LocationPoint, vehicleType: VehicleType, paymentMethod: PaymentMethod }) => {
        const response = await axiosClient.post('/bookings', payload)
        return response.data
    },

    getById: async (id: string) => {
        const response = await axiosClient.get(`/bookings/${id}`)
        return response.data
    },

    getUserBookings: async () => {
        const response = await axiosClient.get(`/bookings`)
        return response.data
    },

    cancel: async (id: string) => {
        const response = await axiosClient.delete(`/bookings/${id}`)
        return response.data
    }
}

export const pricingApi = {
    estimate: async (pickup: LocationPoint, drop: LocationPoint, vehicleType: VehicleType) => {
        const response = await axiosClient.post('/pricing/estimate', {
            pickup,
            drop,
            vehicleType
        })
        return response.data
    }
}
