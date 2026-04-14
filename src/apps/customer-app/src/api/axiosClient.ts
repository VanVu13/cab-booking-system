import axios from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'

const CLIENT_API_URL = '/api';

const axiosClient = axios.create({
    baseURL: CLIENT_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})


// Request interceptor - attach JWT token ok
axiosClient.interceptors.request.use(
    async (config) => {
        const accessToken = useAuthStore.getState().accessToken
        console.log('[Axios Request]', config.method?.toUpperCase(), config.url, 'Token:', accessToken ? 'Present' : 'Missing');

        if (accessToken) {
            if (config.headers.set) {
                config.headers.set('Authorization', `Bearer ${accessToken}`)
            } else {
                config.headers.Authorization = `Bearer ${accessToken}`
            }
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Queue system for concurrent 401 handling (prevents Token Reuse detection)
let isRefreshing = false
let failedQueue: { resolve: (token: string | null) => void; reject: (error: unknown) => void }[] = []

const processQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token)
        }
    })
    failedQueue = []
}

// Extract real backend error message from response data
// Backend returns: { error: 'message' } or { message: 'message' }
const extractBackendMessage = (error: any): void => {
    if (error.response?.data) {
        const data = error.response.data
        const backendMessage = data.error || data.message
        if (backendMessage && typeof backendMessage === 'string') {
            error.message = backendMessage
        }
    }
}

// Response interceptor - handle 401 with queue pattern
axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        // Extract backend message for all errors
        extractBackendMessage(error)

        // Skip 401 handling for auth routes (login fail ≠ token expired)
        if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
            return Promise.reject(error)
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            // If already refreshing, queue this request to wait
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token
                    return axiosClient(originalRequest)
                }).catch(err => {
                    return Promise.reject(err)
                })
            }

            originalRequest._retry = true
            isRefreshing = true

            const refreshToken = useAuthStore.getState().refreshToken

            if (!refreshToken) {
                // No refresh token available, force logout
                useAuthStore.getState().logout()
                return Promise.reject(error)
            }

            try {
                // Use plain axios instance to avoid interceptor loop
                const response = await axios.post(`${CLIENT_API_URL}/auth/refresh`, {
                    refreshToken
                })

                const newAccessToken = response.data.accessToken
                const newRefreshToken = response.data.refreshToken || refreshToken
                const currentUser = useAuthStore.getState().user

                if (currentUser && newAccessToken) {
                    useAuthStore.getState().setAuth(currentUser, newAccessToken, newRefreshToken)
                    originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken
                    processQueue(null, newAccessToken)
                    return axiosClient(originalRequest)
                }
            } catch (refreshError: any) {
                extractBackendMessage(refreshError)
                processQueue(refreshError, null)
                useAuthStore.getState().logout()
                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }

        return Promise.reject(error)
    }
)

export default axiosClient
