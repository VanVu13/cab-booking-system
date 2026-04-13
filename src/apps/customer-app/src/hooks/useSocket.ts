import { useEffect, useRef } from 'react'
import { connectSocket, getSocket } from '@/services/socketService'
import { useAuthStore } from '@/stores/useAuthStore'

export function useSocketEvent(eventName: string, callback: (data: any) => void, path = '/socket.io') {
    const { isAuthenticated } = useAuthStore()
    const savedCallback = useRef(callback)

    // Remember the latest callback
    useEffect(() => {
        savedCallback.current = callback
    }, [callback])

    useEffect(() => {
        if (!isAuthenticated) return;

        const socket = getSocket(path) || connectSocket(path);

        if (!socket) return;

        const handler = (data: any) => {
            console.log(`[SocketEvent] ${eventName} (path: ${path}):`, data);
            savedCallback.current(data)
        }

        socket.on(eventName, handler)

        return () => {
            socket.off(eventName, handler)
        }
    }, [eventName, isAuthenticated, path])
}

export function useSocket(path = '/socket.io') {
    const { isAuthenticated } = useAuthStore()

    if (!isAuthenticated) return null;
    return getSocket(path) || connectSocket(path);
}
