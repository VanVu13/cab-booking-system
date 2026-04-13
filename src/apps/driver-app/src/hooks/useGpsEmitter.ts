import { useEffect, useRef, useCallback } from 'react'
import { useSocket } from './useSocket'
import { useAuthStore } from '@/stores/useAuthStore'
import { useDriverStore } from '@/stores/useDriverStore'

const GPS_INTERVAL_MS = 3000 // Emit every 3 seconds

// Shared simulated position for route simulation
let simulatedRoutePoints: { lat: number; lng: number }[] = []
let simulatedIndex = 0

/**
 * Set simulated route points for driver movement simulation.
 * The GPS emitter will move along these points instead of using real GPS.
 */
export function setSimulatedRoute(points: { lat: number; lng: number }[]) {
    simulatedRoutePoints = points
    simulatedIndex = 0
    console.log(`[GPS-SIM] Loaded route with ${points.length} points for simulation`)
}

export function clearSimulatedRoute() {
    simulatedRoutePoints = []
    simulatedIndex = 0
}

export function useGpsEmitter() {
    // Connect to driver-service directly via /ws channel
    const socket = useSocket('/ws')
    const { user } = useAuthStore()
    const { driverStatus } = useDriverStore()
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const watchIdRef = useRef<number | null>(null)
    const lastPositionRef = useRef<GeolocationPosition | null>(null)

    useEffect(() => {
        const isOnline = driverStatus === 'ONLINE' || driverStatus === 'ON_TRIP'

        if (!isOnline || !socket || !user) {
            // Stop GPS when offline
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
                watchIdRef.current = null
            }
            return
        }

        // Watch GPS position
        if (navigator.geolocation && watchIdRef.current === null) {
            // First, try a direct hit to prompt user immediately
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    lastPositionRef.current = position
                },
                (error) => {
                    console.warn('[GPS] Initial getCurrentPosition error:', error.message)
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            )

            // Then start watching for updates
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    lastPositionRef.current = position
                },
                (error) => {
                    console.warn('[GPS] Watch error:', error.message)
                },
                {
                    enableHighAccuracy: true,
                    timeout: 5000,
                    maximumAge: 1000,
                }
            )
        }

        // Emit GPS every 3 seconds
        intervalRef.current = setInterval(() => {
            if (!socket.connected) {
                console.warn('[GPS] Socket not connected')
                return
            }

            let lat: number
            let lng: number
            let isSimulated = false

            // Priority 1: Use simulated route if available (for demo/testing)
            if (simulatedRoutePoints.length > 0) {
                // Move 2-4 points per tick for visible speed
                const step = Math.min(3, simulatedRoutePoints.length - simulatedIndex - 1)
                const point = simulatedRoutePoints[simulatedIndex]
                lat = point.lat
                lng = point.lng
                isSimulated = true

                // Advance index (loop or stop at end)
                if (simulatedIndex < simulatedRoutePoints.length - 1) {
                    simulatedIndex = Math.min(simulatedIndex + step, simulatedRoutePoints.length - 1)
                }
            }
            // Priority 2: Use real GPS position
            else if (lastPositionRef.current) {
                lat = lastPositionRef.current.coords.latitude
                lng = lastPositionRef.current.coords.longitude
                console.log(
                    "[GPS-ACCURACY]",
                    lastPositionRef.current.coords.accuracy
                )
            }
            // No position available
            else {
                console.warn('[GPS] Waiting for GPS or simulated route...')
                return
            }

            const payload = {
                driverId: user.id,
                lat,
                lng,
                accuracy: 10,
                timestamp: new Date().toISOString(),
                heading: 0,
                speed: isSimulated ? 30 : (lastPositionRef.current?.coords.speed || 0),
                vehicleType: user.vehicleType || 'SEDAN' // Append to socket ping
            }

            // Update local store
            useDriverStore.getState().setLocation({
                lat: payload.lat,
                lng: payload.lng
            })

            socket.emit('driver:location_update', payload)
            console.log(`[GPS] ${isSimulated ? 'SIM' : 'REAL'} Location: ${payload.lat.toFixed(6)}, ${payload.lng.toFixed(6)} (idx: ${simulatedIndex}/${simulatedRoutePoints.length})`)
        }, GPS_INTERVAL_MS)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [driverStatus, socket, user])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current)
            }
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, [])
}
