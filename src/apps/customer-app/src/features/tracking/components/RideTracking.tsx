import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { io, Socket } from 'socket.io-client';

// 1. Tạo Icon cho xe tài xế
const carIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/744/744465.png', // URL icon xe hơi
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});

interface Point {
    lat: number;
    lng: number;
}

const RideTracking: React.FC<{ rideId: string }> = ({ rideId }) => {
    const [route, setRoute] = useState<Point[]>([]);
    const [currentPos, setCurrentPos] = useState<Point | null>(null);
    const targetPosRef = useRef<Point | null>(null);
    const prevPosRef = useRef<Point | null>(null);
    const socketRef = useRef<Socket | null>(null);

    const animationFrameRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);
    const progressRef = useRef<number>(0);
    const actualPosRef = useRef<Point | null>(null);

    // Thời gian nội suy (khớp với tần suất gửi GPS từ driver, ví dụ 2s)
    const interpolationDuration = 2000;

    useEffect(() => {
        socketRef.current = io(window.location.origin, {
            path: '/tracking-socket/'
        });

        // 1. Nhận thông tin route thực (OSRM)
        socketRef.current.on('ride:route_info', (data: { route: Point[] }) => {
            console.log('Real road route received:', data.route?.length, 'points');
            if (data.route && data.route.length > 0) {
                setRoute(data.route);
                if (!actualPosRef.current) {
                    setCurrentPos(data.route[0]);
                    prevPosRef.current = data.route[0];
                    actualPosRef.current = data.route[0];
                }
            }
        });

        // 2. Nhận update vị trí thực tế từ Driver
        socketRef.current.on('driver:location_update', (data: Point) => {
            console.log('Realtime location update:', data);

            // Lưu vị trí cũ và vị trí mới để nội suy
            prevPosRef.current = actualPosRef.current;
            targetPosRef.current = data;
            progressRef.current = 0; // Reset tiến trình nội suy
            actualPosRef.current = data; // Cập nhật ref cho lần tiếp theo

            if (!animationFrameRef.current) {
                lastTimeRef.current = performance.now();
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        });

        // Tham gia phòng tracking với rideId thực
        socketRef.current.emit('ride:join_tracking', { rideId });

        return () => {
            socketRef.current?.disconnect();
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [rideId]);

    const animate = (time: number) => {
        const deltaTime = time - lastTimeRef.current;
        lastTimeRef.current = time;

        if (!targetPosRef.current || !prevPosRef.current) return;

        // Tiến trình nội suy (0 -> 1)
        progressRef.current += deltaTime / interpolationDuration;

        if (progressRef.current >= 1) {
            setCurrentPos(targetPosRef.current);
            // Dừng loop nếu không có update mới
            animationFrameRef.current = 0;
            return;
        }

        // Nội suy Lerp
        const lat = prevPosRef.current.lat + (targetPosRef.current.lat - prevPosRef.current.lat) * progressRef.current;
        const lng = prevPosRef.current.lng + (targetPosRef.current.lng - prevPosRef.current.lng) * progressRef.current;

        setCurrentPos({ lat, lng });

        animationFrameRef.current = requestAnimationFrame(animate);
    };

    return (
        <div style={{ height: '500px', width: '100%', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <MapContainer center={[10.762622, 106.660172]} zoom={15} style={{ height: '400px' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Vẽ tuyến đường thật (Màu xanh đậm của Grab/Gojek style) */}
                {route.length > 0 && (
                    <Polyline positions={route.map(p => [p.lat, p.lng])} color="#10b981" weight={6} opacity={0.8} />
                )}

                {/* Marker tài xế di chuyển thực tế */}
                {currentPos && (
                    <Marker position={[currentPos.lat, currentPos.lng]} icon={carIcon} />
                )}
            </MapContainer>

            <div style={{ padding: '15px', background: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>Mã chuyến xe</p>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{rideId}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{
                            padding: '4px 12px',
                            background: '#ecfdf5',
                            color: '#059669',
                            borderRadius: '999px',
                            fontSize: '12px',
                            fontWeight: '600'
                        }}>
                            {route.length > 0 ? 'Tài xế đang đến' : 'Đang tìm tài xế...'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RideTracking;
