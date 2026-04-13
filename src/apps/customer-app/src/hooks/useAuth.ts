import { useAuthStore } from '@/stores/useAuthStore'

export function useAuth() {
    const { user, isAuthenticated, setAuth, logout } = useAuthStore()

    return {
        user,
        isAuthenticated,
        login: setAuth,
        logout
    }
}
