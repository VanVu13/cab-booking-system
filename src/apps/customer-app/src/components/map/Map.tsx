import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

// Fix Leaflet's default icon path issues in Vite/Webpack
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const cabIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/128/3085/3085411.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});
const bikeIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3721/3721619.png', // A motorcycle/bike icon
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

const pickupIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const dropIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

interface MapProps {
    center?: { lat: number; lng: number };
    zoom?: number;
    markers?: { lat: number; lng: number; icon?: 'cab' | 'bike' | 'pickup' | 'drop' }[];
    route?: { lat: number; lng: number }[];
    onIdle?: () => void;
    onCenterChanged?: (center: { lat: number, lng: number }) => void;
    showCenterPin?: boolean;
}

// --- Coordinate Validation Utilities ---
const FALLBACK_CENTER: { lat: number; lng: number } = { lat: 10.7769, lng: 106.7009 }; // Ho Chi Minh City

/**
 * Validate a single lat/lng pair.
 * Returns true only if both values are finite numbers within valid geographic range.
 */
const isValidLatLng = (lat: unknown, lng: unknown): boolean => {
    return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180
    );
};

/**
 * Validate a coordinate object { lat, lng }.
 */
const isValidCenter = (c: { lat: number; lng: number } | undefined | null): c is { lat: number; lng: number } => {
    return !!c && isValidLatLng(c.lat, c.lng);
};

// Hàm helper để parse điểm tọa độ từ bất kỳ format nào
const parsePoint = (p: any): [number, number] | null => {
    if (!p) return null;

    let lat: number | undefined;
    let lng: number | undefined;

    // Format: [lat, lng]
    if (Array.isArray(p) && p.length >= 2) {
        lat = Number(p[0]);
        lng = Number(p[1]);
    } else {
        // Format: {lat, lng} hoặc {latitude, longitude} hoặc {lat, lon}
        lat = Number(p.lat ?? p.latitude);
        lng = Number(p.lng ?? p.longitude ?? p.lon);
    }

    if (isValidLatLng(lat, lng)) {
        return [lat!, lng!];
    }

    console.warn("[Map] Invalid or unknown coordinate format:", p);
    return null;
};

function MapUpdater({ center, zoom, markers, onCenterChanged, onIdle }: {
    center?: { lat: number; lng: number },
    zoom?: number,
    markers?: { lat: number; lng: number }[],
    onCenterChanged?: (center: { lat: number, lng: number }) => void,
    onIdle?: () => void
}) {
    const map = useMap();
    const [lastJumpCoord, setLastJumpCoord] = useState<string>("");

    const [lastMarkersCount, setLastMarkersCount] = useState(0);

    useEffect(() => {
        // Guard: ensure map instance is available and container is ready
        if (!map || !map.getContainer()) return;

        try {
            // Check if map's internal state is corrupted (center is NaN)
            const current = map.getCenter();
            const mapIsCorrupted = !current || !isValidLatLng(current.lat, current.lng);

            // If map state is corrupted, recover immediately with setView (no animation)
            if (mapIsCorrupted) {
                const recovery = isValidCenter(center) ? center : FALLBACK_CENTER;
                console.warn("[MapUpdater] Map state corrupted (NaN center), recovering with setView to:", recovery);
                map.stop(); // Cancel any pending animations
                map.setView([recovery.lat, recovery.lng], zoom || 13);
                return; // Skip normal logic this cycle, next render will handle properly
            }

            if (markers && markers.length > 1) {
                // Chỉ fitBounds nếu số lượng marker thay đổi
                if (markers.length !== lastMarkersCount) {
                    const points = markers.map(parsePoint).filter((p): p is [number, number] => p !== null);
                    if (points.length > 1) {
                        const bounds = L.latLngBounds(points);
                        if (bounds.isValid()) {
                            map.stop(); // Cancel pending animations before fitBounds
                            map.fitBounds(bounds, { padding: [80, 80], maxZoom: 18 });
                        }
                        setLastMarkersCount(markers.length);
                    }
                }
            } else if (isValidCenter(center)) {
                const coordKey = `${center.lat.toFixed(5)},${center.lng.toFixed(5)}`;

                const dist = Math.sqrt(
                    Math.pow(current.lat - center.lat, 2) +
                    Math.pow(current.lng - center.lng, 2)
                );

                // Only move if this is a NEW coordinate jump and distance is meaningful (> ~50m)
                if (coordKey !== lastJumpCoord && dist > 0.0005) {
                    map.stop(); // Cancel any in-progress flyTo animation first
                    map.setView([center.lat, center.lng], zoom || map.getZoom(), {
                        animate: true,
                        duration: 0.8
                    });
                    setLastJumpCoord(coordKey);
                }
            }
        } catch (error) {
            console.warn("[MapUpdater] Error during map update:", error);
            // Last resort: try to recover map to a safe state
            try {
                map.stop();
                map.setView([FALLBACK_CENTER.lat, FALLBACK_CENTER.lng], 13);
            } catch (_) { /* ignore recovery failure */ }
        }
    }, [center, zoom, markers, map, lastJumpCoord]);

    useMapEvents({
        moveend: () => {
            if (onCenterChanged) {
                const newCenter = map.getCenter();
                onCenterChanged({ lat: newCenter.lat, lng: newCenter.lng });
            }
        },
        dragstart: () => {
            // Optional: can set a flag to ignore prop updates if needed
        },
        dragend: () => {
            if (onIdle) onIdle();
        },
        zoomend: () => {
            if (onIdle) onIdle();
        }
    });

    return null;
}

export default function Map({ center = FALLBACK_CENTER, zoom = 13, markers = [], route = [], onIdle, onCenterChanged, showCenterPin }: MapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <LoadingSpinner />;
    }

    // Ensure center is always valid, fallback to HCMC if not
    const safeCenter = isValidCenter(center) ? center : FALLBACK_CENTER;

    // Filter markers to only include valid coordinates
    const validMarkers = markers.filter(m => isValidLatLng(m.lat, m.lng));

    // Ưu tiên vẽ route nếu có, nếu không thì trả về rỗng
    const polylinePath = (route && route.length > 0)
        ? route.map(parsePoint).filter((p): p is [number, number] => p !== null)
        : [];

    return (
        <div className="relative w-full h-full">
            <MapContainer
                center={[safeCenter.lat, safeCenter.lng]}
                zoom={zoom}
                style={{ width: '100%', height: '100%', touchAction: 'none' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapUpdater
                    center={validMarkers.length > 0 ? undefined : safeCenter}
                    zoom={zoom}
                    markers={route.length > 0 ? route : (validMarkers.length > 1 ? validMarkers : undefined)}
                    onCenterChanged={onCenterChanged}
                    onIdle={onIdle}
                />

                {validMarkers.map((marker, index) => {
                    let iconToUse = DefaultIcon;
                    if (marker.icon === 'cab') iconToUse = cabIcon;
                    if (marker.icon === 'bike') iconToUse = bikeIcon;
                    if (marker.icon === 'pickup') iconToUse = pickupIcon;
                    if (marker.icon === 'drop') iconToUse = dropIcon;

                    return (
                        <Marker
                            key={index}
                            position={[marker.lat, marker.lng]}
                            icon={iconToUse}
                        />
                    );
                })}

                {polylinePath.length > 1 && (
                    <Polyline
                        positions={polylinePath}
                        color={route.length > 0 ? "#10b981" : "#2563eb"} // Màu xanh lá cho route thật, xanh dương cho nối thẳng
                        weight={5}
                        opacity={0.8}
                        dashArray={route.length > 0 ? undefined : "10, 10"} // Không đứt nét nếu là đường thật
                    />
                )}
            </MapContainer>

            {showCenterPin && (
                <div className="absolute inset-0 z-[1000] pointer-events-none flex items-center justify-center">
                    <div className="relative -mt-10">
                        <img
                            src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png"
                            alt="Center Pin"
                            className="w-6 h-10 drop-shadow-xl animate-bounce-short"
                        />
                        <div className="w-1.5 h-1.5 bg-black/40 rounded-full blur-[1px] mx-auto mt-0.5"></div>
                    </div>
                </div>
            )}
        </div>
    )
}
