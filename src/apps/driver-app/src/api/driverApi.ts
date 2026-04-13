import axiosClient from './axiosClient'

export const driverApi = {
    // Toggle online/offline status
    updateStatus: async (isOnline: boolean) => {
        const response = await axiosClient.patch('/drivers/status', { isOnline })
        return response.data
    },

    // Get driver profile
    getProfile: async () => {
        const response = await axiosClient.get('/drivers/profile')
        return response.data
    },

    // Get earnings summary (wallet balance + today earnings)
    getEarnings: async () => {
        const response = await axiosClient.get('/drivers/earnings')
        return response.data
    },

    // Get driver stats (earnings today, total trips) from ride-service
    getStats: async () => {
        const response = await axiosClient.get('/rides/driver/stats')
        return response.data
    },

    // Get ride history (completed rides from ride-service via driver-service proxy)
    getRideHistory: async (page = 1, limit = 20) => {
        const response = await axiosClient.get('/drivers/rides/history', {
            params: { page, limit }
        })
        return response.data
    },
}

