// This file ensures that we can import and set up Zustand store for admin.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminState {
    accessToken: string | null;
    user: any | null;
    setAuth: (token: string, user: any) => void;
    logout: () => void;
}

export const useAdminAuthStore = create<AdminState>()(
    persist(
        (set) => ({
            accessToken: null,
            user: null,
            setAuth: (token, user) => set({ accessToken: token, user }),
            logout: () => set({ accessToken: null, user: null }),
        }),
        { name: 'admin-auth-storage' }
    )
);
