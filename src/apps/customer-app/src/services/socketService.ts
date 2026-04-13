import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/useAuthStore'

// Socket.IO will automatically use current host and the path provided
const SOCKET_URL = '';

// Quản lý nhiều instance socket
let sockets: Record<string, Socket> = {};

export const connectSocket = (path = '/socket.io') => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return null;

    // Nếu đã có socket cho path này, trả về luôn
    if (sockets[path]) return sockets[path];

    console.log(`[Socket] Connecting to ${SOCKET_URL} with path ${path}`);

    // Tự động điều chỉnh path dựa trên prefix gateway
    // Tracking socket needs trailing slash to match tracking-service Socket.IO config
    const socketPath = path === '/tracking-socket' ? '/tracking-socket/' : path;

    const socket = io(SOCKET_URL, {
        path: socketPath,
        query: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5
    })

    socket.on('connect', () => {
        console.log(`[Socket] Connected to ${path}:`, socket.id)
    })

    socket.on('disconnect', () => {
        console.log(`[Socket] Disconnected from ${path}`)
    })

    sockets[path] = socket;
    return socket;
}

export const getSocket = (path = '/socket.io') => sockets[path];

export const disconnectSocket = (path?: string) => {
    if (path) {
        if (sockets[path]) {
            sockets[path].disconnect();
            delete sockets[path];
        }
    } else {
        // Disconnect all
        Object.keys(sockets).forEach(p => {
            sockets[p].disconnect();
        });
        sockets = {};
    }
}
