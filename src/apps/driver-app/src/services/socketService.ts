import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/useAuthStore'

// Driver App connects directly to driver-service (port 3004) via /ws proxy
// In dev: Vite dev server proxies /ws -> localhost:3004 (no CORS issue)
// In prod: Set VITE_DRIVER_WS_URL to driver-service URL
const DRIVER_WS_URL = import.meta.env.VITE_DRIVER_WS_URL || window.location.origin
const NOTIFICATION_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000'

// Manage multiple socket instances by path/url key
let sockets: Record<string, Socket> = {}

/**
 * Connect to a Socket.IO server.
 * @param path - 'driver' connects to driver-service:3004/ws
 *               '/socket.io' (default) connects to notification-service:3000
 */
export const connectSocket = (path = '/socket.io') => {
    const authState = useAuthStore.getState()
    const token = authState.accessToken
    const driverId = authState.user?.id

    if (!token || !driverId) return null

    // Return existing socket if already connected
    if (sockets[path]?.connected) return sockets[path]

    // Determine URL and socket path based on context
    const isDriverChannel = path === '/ws' || path === 'driver'
    const isTrackingChannel = path === '/tracking-socket'
    const url = isDriverChannel ? DRIVER_WS_URL : NOTIFICATION_URL
    const socketPath = isDriverChannel ? '/ws' : isTrackingChannel ? '/tracking-socket/' : '/socket.io'

    console.log(`[DriverSocket] Connecting to ${url}${socketPath}`)

    const socket = io(url, {
        path: socketPath,
        query: { token, driverId },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
    })

    socket.on('connect', () => {
        console.log(`[DriverSocket] Connected: ${url}${socketPath} id=${socket.id}`)
    })

    socket.on('disconnect', (reason) => {
        console.log(`[DriverSocket] Disconnected: ${url}${socketPath} reason=${reason}`)
    })

    socket.on('connect_error', (err) => {
        console.error(`[DriverSocket] Error: ${url}${socketPath}`, err.message)
    })

    sockets[path] = socket
    return socket
}

export const getSocket = (path = '/socket.io') => sockets[path]

export const disconnectSocket = (path?: string) => {
    if (path) {
        if (sockets[path]) {
            sockets[path].disconnect()
            delete sockets[path]
        }
    } else {
        Object.keys(sockets).forEach((p) => {
            sockets[p].disconnect()
        })
        sockets = {}
    }
}
