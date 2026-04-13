import axiosClient from './axiosClient'

export const userApi = {
    getProfile: async () => {
        const response = await axiosClient.get('/users/profile')
        return response.data
    },
    updateProfile: async (data: { name?: string; phone?: string; address?: string }) => {
        const response = await axiosClient.patch('/users/profile', data)
        return response.data
    }
}
