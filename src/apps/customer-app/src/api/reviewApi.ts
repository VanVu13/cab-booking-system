import axiosClient from './axiosClient'

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
