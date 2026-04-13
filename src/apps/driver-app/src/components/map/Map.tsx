import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useState, useRef } from 'react'

// Fix Leaflet default icon
import icon from 'leaflet/dist/images/marker-icon.png'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] })

const driverIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/128/3085/3085411.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
})
const bikeIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3721/3721619.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
})

const pickupIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
})

const dropIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
})

// Helper: check if a coordinate pair is valid
function isValidLatLng(p: { lat: number; lng: number } | null | undefined): p is { lat: number; lng: number } {
    return !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng)
}

const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009]

interface MapMarker {
    lat: number
    lng: number
    icon?: 'driver' | 'bike' | 'pickup' | 'drop'
}

interface MapProps {
    center?: { lat: number; lng: number }
    zoom?: number
    markers?: MapMarker[]
    route?: { lat: number; lng: number }[]
    onCenterChanged?: (center: { lat: number; lng: number }) => void
}

const parsePoint = (p: { lat: number; lng: number }): [number, number] => [p.lat, p.lng]

function MapUpdater({ center, markers }: { center?: { lat: number; lng: number }; markers?: MapMarker[] }) {
    const map = useMap()
    const [lastCenter, setLastCenter] = useState('')
    const [ready, setReady] = useState(false)

    // Helper: check if map container has real dimensions (prevents Leaflet unproject NaN)
    const mapHasSize = (): boolean => {
        try {
            const size = map.getSize()
            return !!(size && size.x > 0 && size.y > 0)
        } catch {
            return false
        }
    }

    // Helper: get a safe zoom level (map.getZoom() can return NaN when container has no size)
    const safeZoom = () => {
        if (!mapHasSize()) return 14
        const z = map.getZoom()
        return Number.isFinite(z) ? z : 14
    }

    // Safe wrapper: only call flyTo/fitBounds when map has valid container size
    const safeFlyTo = (latlng: [number, number], zoom: number) => {
        try {
            map.invalidateSize({ animate: false })
        } catch { /* ignore */ }
        if (!mapHasSize()) {
            // Fallback: use setView (no animation) which is safer with zero-size containers
            try { map.setView(latlng, zoom, { animate: false }) } catch { /* ignore */ }
            return
        }
        map.flyTo(latlng, zoom, { animate: true, duration: 0.8 })
    }

    const safeFitBounds = (bounds: L.LatLngBounds) => {
        try {
            map.invalidateSize({ animate: false })
        } catch { /* ignore */ }
        if (!mapHasSize()) {
            // Fallback: try setView to center of bounds without animation
            try {
                const c = bounds.getCenter()
                map.setView([c.lat, c.lng], 14, { animate: false })
            } catch { /* ignore */ }
            return
        }
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 17 })
    }

    // Wait for map to be fully initialized and have valid size before doing any operations
    useEffect(() => {
        let cancelled = false
        const attempt = (delay: number, retries: number) => {
            return setTimeout(() => {
                if (cancelled) return
                try { map.invalidateSize() } catch { /* ignore */ }
                if (mapHasSize()) {
                    setReady(true)
                } else if (retries > 0) {
                    timer2 = attempt(300, retries - 1)
                } else {
                    // Give up waiting, mark ready anyway
                    setReady(true)
                }
            }, delay)
        }
        let timer2: ReturnType<typeof setTimeout>
        const timer = attempt(200, 5)
        return () => {
            cancelled = true
            clearTimeout(timer)
            clearTimeout(timer2)
        }
    }, [map])

    useEffect(() => {
        if (!ready) return
        try {
            if (markers && markers.length > 0) {
                const valid = markers.filter(isValidLatLng)
                if (valid.length > 1) {
                    const bounds = L.latLngBounds(valid.map((m) => [m.lat, m.lng] as [number, number]))
                    if (bounds.isValid()) {
                        safeFitBounds(bounds)
                    }
                } else if (valid.length === 1) {
                    safeFlyTo([valid[0].lat, valid[0].lng], safeZoom())
                }
            } else if (isValidLatLng(center)) {
                const key = `${center.lat.toFixed(4)},${center.lng.toFixed(4)}`
                if (key !== lastCenter) {
                    safeFlyTo([center.lat, center.lng], safeZoom())
                    setLastCenter(key)
                }
            }
        } catch (e) {
            console.warn('[MapUpdater] Error (suppressed):', e)
        }
    }, [center, markers, map, lastCenter, ready])

    useMapEvents({
        moveend: () => { /* optional */ }
    })

    return null
}

export default function Map({
    center = { lat: 10.7769, lng: 106.7009 },
    zoom = 14,
    markers = [],
    route = [],
}: MapProps) {
    const [mounted, setMounted] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    // Delay mount until next frame so the container has real dimensions
    useEffect(() => {
        const raf = requestAnimationFrame(() => setMounted(true))
        return () => cancelAnimationFrame(raf)
    }, [])

    if (!mounted) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    // Filter route points that have valid coordinates
    const polyline = route
        .filter(isValidLatLng)
        .map(parsePoint)

    // Validate center to prevent Leaflet NaN crash
    const mapCenter: [number, number] = isValidLatLng(center)
        ? [center.lat, center.lng]
        : DEFAULT_CENTER

    // Filter markers to only include valid ones
    const validMarkers = markers.filter((m): m is MapMarker => isValidLatLng(m))

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
            <MapContainer
                center={mapCenter}
                zoom={zoom}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapUpdater
                    center={validMarkers.length === 1 ? validMarkers[0] : (validMarkers.length === 0 ? (isValidLatLng(center) ? center : undefined) : undefined)}
                    markers={validMarkers.length > 1 ? validMarkers : undefined}
                />

                {validMarkers.map((marker, i) => {
                    let iconToUse = DefaultIcon
                    if (marker.icon === 'driver') iconToUse = driverIcon
                    if (marker.icon === 'bike') iconToUse = bikeIcon
                    if (marker.icon === 'pickup') iconToUse = pickupIcon
                    if (marker.icon === 'drop') iconToUse = dropIcon

                    return (
                        <Marker key={i} position={[marker.lat, marker.lng]} icon={iconToUse} />
                    )
                })}

                {polyline.length > 1 && (
                    <Polyline positions={polyline} color="#10b981" weight={5} opacity={0.85} />
                )}
            </MapContainer>
        </div>
    )
}
