import axios from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'

const getApiUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && !envUrl.includes('localhost')) {
        return envUrl;
    }
    // dynamically resolve based on current hostname
    return `${window.location.protocol}//${window.location.hostname}:3000`;
};

const CLIENT_API_URL = getApiUrl();

const axiosClient = axios.create({
    baseURL: CLIENT_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Request interceptor - attach JWT token
axiosClient.interceptors.request.use(
    async (config) => {
        console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${config.url}`, config.data)
        const accessToken = useAuthStore.getState().accessToken
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
        console.error('[API REQUEST ERROR]', error)
        return Promise.reject(error)
    }
)

let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error)
        } else {
            prom.resolve(token)
        }
    })

    failedQueue = []
}

// Response interceptor - handle 401
axiosClient.interceptors.response.use(
    (response) => {
        console.log(`[API RESPONSE] ${response.status} ${response.config.url}`, response.data)
        return response
    },
    async (error) => {
        const originalRequest = error.config

        console.error('[API RESPONSE ERROR]', {
            url: originalRequest?.url,
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        })

        // Ignore 401 on login/refresh routes
        if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/refresh')) {
            return Promise.reject(error)
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
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
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login'
                }
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
            } catch (refreshError) {
                processQueue(refreshError, null)
                useAuthStore.getState().logout()
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login'
                }
                return Promise.reject(refreshError)
            } finally {
                isRefreshing = false
            }
        }

        return Promise.reject(error)
    }
)

export default axiosClient
