import axios from 'axios'
import { useAuthStore } from '@/stores/useAuthStore'

const CLIENT_API_URL = '/api';

const axiosClient = axios.create({
    baseURL: CLIENT_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Add request interceptor
axiosClient.interceptors.request.use(
    async (config) => {
        const accessToken = useAuthStore.getState().accessToken
        console.log('[Axios Request]', config.method?.toUpperCase(), config.url, 'Token:', accessToken ? 'Present' : 'Missing');

        if (accessToken) {
            // Use set if available (Axios 1.x), otherwise assign
            if (config.headers.set) {
                config.headers.set('Authorization', `Bearer ${accessToken}`);
            } else {
                config.headers.Authorization = `Bearer ${accessToken}`;
            }
        }
        return config
    },
    (error) => {
        return Promise.reject(error)
    }
)

// Add response interceptor (handle refresh token)
axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Prevent infinite loop
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const { refreshToken, setAuth, logout } = useAuthStore.getState();

            if (refreshToken) {
                try {
                    // Call refresh endpoint directly using fetch to avoid interceptor loop
                    const response = await fetch(`${CLIENT_API_URL}/auth/refresh`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ refreshToken }),
                    });

                    if (response.ok) {
                        const data = await response.json();
                        // Assume data contains { accessToken, refreshToken, user? }
                        // We need to keep the user, just update tokens
                        const { user } = useAuthStore.getState();
                        if (user && data.accessToken) {
                            setAuth(user, data.accessToken, data.refreshToken || refreshToken);

                            // Retry original request with new token
                            if (originalRequest.headers.set) {
                                originalRequest.headers.set('Authorization', `Bearer ${data.accessToken}`);
                            } else {
                                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                            }
                            return axiosClient(originalRequest);
                        }
                    }
                } catch (refreshError) {
                    console.error('[Axios] Refresh token failed:', refreshError);
                }
            }

            // If No refresh token or Refresh failed -> Logout
            logout();
        }
        return Promise.reject(error)
    }
)

export default axiosClient
