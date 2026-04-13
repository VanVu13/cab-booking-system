import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
    id: string
    email: string
    name: string
    role: 'PASSENGER' | 'DRIVER' | 'ADMIN'
    phone?: string
    vehicleType?: string
}

export interface AuthState {
    user: User | null
    accessToken: string | null
    refreshToken: string | null
    isAuthenticated: boolean
    setAuth: (user: User, accessToken: string, refreshToken: string) => void
    setUser: (user: User) => void
    logout: () => void
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            setAuth: (user, accessToken, refreshToken) =>
                set({ user, accessToken, refreshToken, isAuthenticated: true }),
            setUser: (user) => set({ user }),
            logout: () =>
                set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
        }),
        {
            name: 'driver-auth-storage',
        }
    )
)
