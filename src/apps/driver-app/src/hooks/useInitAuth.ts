import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import axios from 'axios'

const CLIENT_API_URL = '/api'

/**
 * Proactive token validation hook.
 * Runs once on app mount to check if the persisted access token is still valid.
 * If expired, attempts a refresh before any API call triggers a 401.
 * This prevents the "loads UI then gets kicked to login" experience.
 */
export function useInitAuth() {
    const hasRun = useRef(false)

    useEffect(() => {
        if (hasRun.current) return
        hasRun.current = true

        const { accessToken, refreshToken, user, setAuth, logout } = useAuthStore.getState()

        // Not logged in, nothing to validate
        if (!accessToken || !refreshToken || !user) return

        // Decode JWT to check expiration (without verifying signature)
        try {
            const payload = JSON.parse(atob(accessToken.split('.')[1]))
            const now = Math.floor(Date.now() / 1000)

            // If token expires in less than 60 seconds, proactively refresh
            if (payload.exp && payload.exp - now < 60) {
                console.log('[InitAuth] Access token expired or expiring soon, refreshing...')

                axios.post(`${CLIENT_API_URL}/auth/refresh`, { refreshToken })
                    .then(response => {
                        const newAccessToken = response.data.accessToken
                        const newRefreshToken = response.data.refreshToken || refreshToken

                        if (newAccessToken && user) {
                            setAuth(user, newAccessToken, newRefreshToken)
                            console.log('[InitAuth] Token refreshed successfully')
                        }
                    })
                    .catch(error => {
                        console.error('[InitAuth] Refresh failed, logging out:', error.message)
                        logout()
                    })
            } else {
                console.log('[InitAuth] Access token still valid')
            }
        } catch {
            // If token is malformed, logout
            console.error('[InitAuth] Failed to decode token, logging out')
            logout()
        }
    }, [])
}
