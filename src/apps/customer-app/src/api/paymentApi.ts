import axiosClient from './axiosClient'

export const paymentApi = {
    charge: async (rideId: string, amount: number, paymentMethod: 'WALLET' | 'CASH') => {
        const response = await axiosClient.post('/payments/charge', {
            rideId,
            amount,
            paymentMethod
        })
        return response.data
    },

    getByRideId: async (rideId: string) => {
        const response = await axiosClient.get(`/payments/ride/${rideId}`)
        return response.data
    }
}

export const reviewApi = {
    submit: async (rideId: string, rating: number, comment: string) => {
        const response = await axiosClient.post('/reviews', {
            rideId,
            rating,
            comment
        })
        return response.data
    }
}
