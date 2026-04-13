import axiosClient from './axiosClient'

export const paymentApi = {
    // Charge payment after ride completion
    charge: async (rideId: string, amount: number, paymentMethod: 'WALLET' | 'CASH' | 'CARD', passengerId?: string) => {
        const response = await axiosClient.post('/payments/charge', {
            rideId,
            amount,
            paymentMethod,
            passengerId
        })
        return response.data
    },

    // Get payment by ride ID
    getByRideId: async (rideId: string) => {
        const response = await axiosClient.get(`/payments/ride/${rideId}`)
        return response.data
    },
}
