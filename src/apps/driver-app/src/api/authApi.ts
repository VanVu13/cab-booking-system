import axiosClient from './axiosClient'
import { useAuthStore } from '@/stores/useAuthStore'

interface RegisterPayload {
    name: string
    email: string
    password: string
    role: 'DRIVER'
    phone: string
    licenseNumber: string
    vehicleType: 'SEDAN' | 'SUV' | 'BIKE'
    vehiclePlate: string
    vehicleModel: string
    vehicleColor: string
}

interface LoginPayload {
    email: string
    password: string
}



import { disconnectSocket } from '@/services/socketService'
import { useDriverStore } from '@/stores/useDriverStore'

export const authApi = {
    login: async (data: LoginPayload) => {
        const response = await axiosClient.post('/auth/login', data)
        return response.data
    },

    register: async (data: RegisterPayload) => {
        const response = await axiosClient.post('/auth/register', data)
        return response.data
    },

    refresh: async () => {
        const refreshToken = useAuthStore.getState().refreshToken
        if (!refreshToken) throw new Error('No refresh token available')

        const response = await axiosClient.post('/auth/refresh', { refreshToken })
        return response.data
    },

    logout: async () => {
        const authState = useAuthStore.getState()
        const refreshToken = authState.refreshToken
        const accessToken = authState.accessToken
        try {
            // 1. Set driver to OFFLINE before logging out if we have a token
            if (accessToken) {
                await axiosClient.patch('/drivers/status', { isOnline: false })
            }
            // 2. Call logout backend
            if (refreshToken) {
                await axiosClient.post('/auth/logout', { refreshToken })
            }
        } catch (error) {
            console.error('Logout API failed:', error)
        } finally {
            // 3. Force disconnect all sockets
            disconnectSocket()
            // 4. Clear driver store specific states
            useDriverStore.getState().reset()
            // 5. Clear auth tokens
            useAuthStore.getState().logout()
        }
    }
}
