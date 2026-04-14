import { LoginPayload, RegisterPayload } from '@/features/auth/types'
import axiosClient from './axiosClient'
import axios from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'

const CLIENT_API_URL = '/api'

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

        // Use plain axios to avoid interceptor loop
        const response = await axios.post(`${CLIENT_API_URL}/auth/refresh`, { refreshToken })
        return response.data
    },

    logout: async () => {
        const refreshToken = useAuthStore.getState().refreshToken
        try {
            if (refreshToken) {
                await axiosClient.post('/auth/logout', { refreshToken })
            }
        } catch (error) {
            console.error('Logout API failed:', error)
        } finally {
            // Always clear local state even if API fails
            useAuthStore.getState().logout()
        }
    }
}

