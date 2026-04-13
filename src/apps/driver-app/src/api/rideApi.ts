import axiosClient from './axiosClient'

export const rideApi = {
    // Accept a ride request
    accept: async (rideId: string) => {
        const response = await axiosClient.post(`/rides/${rideId}/accept`)
        return response.data
    },

    // Reject a ride request
    reject: async (rideId: string, reason?: string) => {
        const response = await axiosClient.post(`/rides/${rideId}/reject`, { reason })
        return response.data
    },

    // Cancel a ride after accepting
    cancel: async (rideId: string, reason?: string) => {
        const response = await axiosClient.post(`/rides/${rideId}/cancel`, { reason })
        return response.data
    },

    // Mark as arrived at pickup
    arrived: async (rideId: string) => {
        const response = await axiosClient.post(`/rides/${rideId}/arrived`)
        return response.data
    },

    // Start the ride
    start: async (rideId: string) => {
        const response = await axiosClient.post(`/rides/${rideId}/start`)
        return response.data
    },

    // Complete the ride
    complete: async (rideId: string, distanceMeters?: number, durationSeconds?: number) => {
        const response = await axiosClient.post(`/rides/${rideId}/complete`, {
            distanceMeters: distanceMeters || 0,
            durationSeconds: durationSeconds || 0
        })
        return response.data
    },

    // Get ride details
    getById: async (rideId: string) => {
        const response = await axiosClient.get(`/rides/${rideId}`)
        return response.data
    },
}
