import axios from 'axios';
import { useAdminAuthStore } from '../stores/useAdminAuthStore';

const adminApiClient = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

adminApiClient.interceptors.request.use((config) => {
    const token = useAdminAuthStore.getState().accessToken;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

adminApiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
            useAdminAuthStore.getState().logout();
            // Do not redirect to login if we are already on the login page or making a login request
            if (!error.config?.url?.includes('/auth/login') && window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default adminApiClient;
