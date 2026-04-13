// Redundant content, merged into bookingApi for simplicity or keeping separate as before
import { VehicleType, LocationPoint } from '@/features/booking/store/useBookingStore'
import axiosClient from './axiosClient'

export const pricingApi = {
    estimate: async (pickup: LocationPoint, drop: LocationPoint, vehicleType: VehicleType) => {
        const response = await axiosClient.post('/pricing/estimate', {
            pickup,
            drop,
            vehicleType
        })
        return response.data
    },

    getVehicleTypes: async () => {
        try {
            console.log('Fetching vehicle types from', axiosClient.defaults.baseURL);
            const response = await axiosClient.get('/pricing/vehicle-types')
            return response.data
        } catch (error) {
            console.error('getVehicleTypes ERROR:', error);
            throw error;
        }
    },

    getEstimates: async (pickup: LocationPoint, drop: LocationPoint) => {
        const response = await axiosClient.post('/pricing/estimates', {
            pickup,
            drop
        })
        return response.data
    }
}
