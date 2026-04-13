import axiosClient from './axiosClient'

export const reviewApi = {
    submit: async (rideId: string, rating: number, comment: string) => {
        const response = await axiosClient.post('/reviews', {
            rideId,
            rating,
            comment
        })
        return response.data
    },

    // Get driver's average rating and reviews
    getDriverRating: async (driverId: string) => {
        const response = await axiosClient.get(`/reviews/driver/${driverId}`)
        return response.data
    }
}
