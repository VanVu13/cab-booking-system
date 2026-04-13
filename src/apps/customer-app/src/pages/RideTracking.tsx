import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSocketEvent, useSocket } from '@/hooks/useSocket'
import Map from '@/components/map/Map'
import { Phone, User, ShieldCheck, Star, Search } from 'lucide-react'
import { toast } from 'react-toastify'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { bookingApi } from '@/api/bookingApi'
import { rideApi } from '@/api/rideApi'

type RideStatus = 'PROPOSED' | 'SEARCHING_DRIVER' | 'DRIVER_ASSIGNED' | 'ASSIGNED' | 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'MATCH_FAILED'

export default function RideTracking() {
    const { rideId } = useParams()
    const navigate = useNavigate()
    const [status, setStatus] = useState<RideStatus>('SEARCHING_DRIVER')
    const [driverLocation, setDriverLocation] = useState<{ lat: number, lng: number } | null>(null)
    const [driverInfo, setDriverInfo] = useState<any>(null)
    const [rideData, setRideData] = useState<any>(null)
    const [hasNavigated, setHasNavigated] = useState(false)

    // Fetch initial booking status (for searching phase)
    const { data: booking } = useQuery({
        queryKey: ['booking', rideId],
        queryFn: () => bookingApi.getById(rideId!),
        enabled: !!rideId,
        refetchInterval: ['SEARCHING_DRIVER', 'PROPOSED'].includes(status) ? 3000 : false
    })

    // Fetch full ride details (for driver/vehicle info) once assigned
    const { data: ride, error: rideError, isLoading: rideLoading } = useQuery({
        queryKey: ['ride', rideId],
        queryFn: () => rideApi.getById(rideId!),
        enabled: !!rideId && ['PROPOSED', 'ASSIGNED', 'DRIVER_ASSIGNED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'].includes(status) && status !== 'SEARCHING_DRIVER',
        refetchInterval: ['PROPOSED', 'ASSIGNED', 'DRIVER_ASSIGNED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'].includes(status) ? 5000 : false // Refresh periodically to ensure sync
    })

    console.log('[RideTracking] Ride Query:', { ride, rideError, rideLoading, status });

    const queryClient = useQueryClient();
    const socket = useSocket()
    const trackingSocket = useSocket('/tracking-socket') // Track separately
    console.log('[RideTracking] Status:', status, '| Sockets Connected:', !!socket?.connected, !!trackingSocket?.connected)
    console.log('[RideTracking] Booking ID:', rideId)

    const cancelBookingMutation = useMutation({
        mutationFn: () => bookingApi.cancel(rideId!),
        onSuccess: () => {
            toast.info("Đã hủy tìm kiếm tài xế", { toastId: 'cancel_booking' })
            navigate('/')
        },
        onError: (error) => {
            console.error("Failed to cancel booking:", error)
            toast.error("Hủy chuyến thất bại", { toastId: 'cancel_booking_error' })
        }
    })

    useEffect(() => {
        // Prioritize Ride data (enriched) over Booking data (stale/partial)
        const activeData = ride || booking;

        if (activeData) {
            // Define status priority to prevent regression from stale queries
            // EXCEPT when we explicitly need to downgrade because of a rejection or cancellation
            const statusPriority: Record<string, number> = {
                'SEARCHING_DRIVER': 0,
                'PROPOSED': 1,
                'DRIVER_ASSIGNED': 2,
                'ASSIGNED': 2,
                'ACCEPTED': 2,
                'ARRIVED': 3,
                'STARTED': 4,
                'IN_PROGRESS': 4,
                'COMPLETED': 5,
                'CANCELLED': 5,
                'MATCH_FAILED': -1
            };

            const currentPriority = statusPriority[status] || 0;
            const newPriority = statusPriority[activeData.status] || 0;

            // Update if new status is more advanced, OR if we are just starting, 
            // OR if the backend explicitly downgraded us to a search/failure/proposal state
            if (
                newPriority > currentPriority ||
                status === 'SEARCHING_DRIVER' ||
                activeData.status === 'SEARCHING_DRIVER' ||
                activeData.status === 'PROPOSED' || // Allow downgrades to PROPOSED because AI Matching immediately tries a new driver
                activeData.status === 'MATCH_FAILED' ||
                activeData.status === 'CANCELLED'
            ) {
                setStatus(activeData.status);
            }

            // Merge data, preferring Ride
            setRideData(activeData)

            // Handle driver info
            if (ride) {
                console.log('[RideTracking] Ride data received:', {
                    driverId: ride.driverId,
                    driverName: ride.driverName,
                    vehicle: ride.vehicleDetails
                });

                // Map fields from ride-service response
                if (ride.driverId && ride.driverName) {
                    setDriverInfo({
                        id: ride.driverId,
                        name: ride.driverName,
                        phone: ride.driverPhone,
                        avatar: ride.driverAvatar,
                        rating: ride.driverRating,
                        vehicle: ride.vehicleDetails ? `${ride.vehicleDetails.color} ${ride.vehicleDetails.make} ${ride.vehicleDetails.model} - ${ride.vehicleDetails.plate}` : 'Xe 4 chỗ'
                    })
                } else {
                    console.warn('[RideTracking] Ride data missing driver details!');
                }
            } else {
                // Fallback to Booking logic
                const activeDriverId = booking?.driverId || booking?.provisionalDriverId;
                if (activeDriverId) {
                    // Only set if we don't have driver info yet or if it's the same simple object
                    if (!driverInfo || !driverInfo.vehicle) {
                        setDriverInfo(booking.driver || { id: activeDriverId, name: 'Tài xế đang đến' })
                    }
                }
            }

        } else if (!ride && !booking && status !== 'SEARCHING_DRIVER' && status !== 'MATCH_FAILED' && status !== 'CANCELLED') {
            // Fallback to searching if both queries completely fail/empty out.
            setStatus('SEARCHING_DRIVER');
        }
    }, [booking, ride, status, socket?.connected])

    // Dedicated effect for Tracking Socket Room Join
    // Ensures real-time tracking starts as soon as we have a rideId and socket is ready
    useEffect(() => {
        if (!rideId || !trackingSocket) return;

        if (trackingSocket.connected) {
            console.log('[RideTracking] Joining tracking room:', rideId)
            trackingSocket.emit('ride:join_tracking', { rideId })
        }

        const handleConnect = () => {
            console.log('[RideTracking] Tracking socket reconnected, joining room:', rideId)
            trackingSocket.emit('ride:join_tracking', { rideId })
        }

        trackingSocket.on('connect', handleConnect)

        return () => {
            trackingSocket.off('connect', handleConnect)
        }
    }, [rideId, trackingSocket])

    // Listen for driver matched
    useSocketEvent('booking:driver_matched', (data) => {
        console.log('[RideTracking] Driver matched payload:', data)
        const mappedStatus = data.status || 'PROPOSED';
        setStatus(mappedStatus as RideStatus)
        queryClient.setQueryData(['booking', rideId], (old: any) => old ? { ...old, status: mappedStatus } : old);

        setDriverInfo({
            id: data.driverId,
            name: data.driverName || 'Tài xế đang đến',
            phone: data.driverPhone,
            avatar: data.driverAvatar,
            rating: data.driverRating,
            vehicleType: data.vehicle?.type,
            vehicle: data.vehicle ? `${data.vehicle.color} ${data.vehicle.make} ${data.vehicle.model} - ${data.vehicle.plate}` : 'Đang cập nhật'
        })

        const initialLoc = data.driverLocation || data.pickup || null
        setDriverLocation(initialLoc)

        if (socket && data.driverId) {
            socket.emit('subscribe:driver', { driverId: data.driverId })
            // Join tracking service via Gateway Proxy /tracking-socket
            trackingSocket?.emit('ride:join_tracking', { rideId: rideId })
        }

        toast.success("Đã tìm thấy tài xế!", { toastId: 'driver_matched' })
    })

    // Listen for matching failure
    useSocketEvent('booking:match_failed', (data: any) => {
        console.log('[RideTracking] Matching Failed:', data)
        setStatus('MATCH_FAILED')
        queryClient.setQueryData(['booking', rideId], (old: any) => old ? { ...old, status: 'MATCH_FAILED' } : old);
        toast.error("Không tìm thấy tài xế gần bạn", { toastId: 'match_failed' })
    })

    // Listen for driver moving
    const handleLocationUpdate = (data: any) => {
        // Accept updates if rideId matches, OR if this is the driver assigned to this ride
        const isCurrentRide = data.rideId === rideId;
        const currentDriverId = driverInfo?.id || booking?.driverId || booking?.provisionalDriverId;
        const isCurrentDriver = (currentDriverId && data.driverId === currentDriverId) || (data.driverId === driverInfo?.id);

        if (isCurrentRide || isCurrentDriver) {
            setDriverLocation({ lat: data.lat, lng: data.lng })
        }
    };

    useSocketEvent('ride:driver_location', handleLocationUpdate)
    useSocketEvent('driver:location_update', handleLocationUpdate)

    // Listen for status changes
    useSocketEvent('ride:status_update', (data: any) => {
        // Handle both flat and nested payloads from Notification Service
        let newStatus = data.status || data.payload?.status || data.type;
        console.log('[RideTracking] Status Update received:', newStatus, data);

        // Normalize STARTED -> IN_PROGRESS for consistency
        if (newStatus === 'STARTED') newStatus = 'IN_PROGRESS';

        if (data.rideId === rideId && newStatus) {
            setStatus(newStatus as RideStatus)

            queryClient.setQueryData(['ride', rideId], (old: any) => old ? { ...old, status: newStatus } : old);
            queryClient.setQueryData(['booking', rideId], (old: any) => old ? { ...old, status: newStatus } : old);

            if (newStatus === 'SEARCHING_DRIVER' || newStatus === 'MATCH_FAILED' || newStatus === 'CANCELLED') {
                const lastStatus = status; // Get current state before setStatus

                // CRITICAL: Wipe out ALL possible cache memory that holds outdated states
                queryClient.cancelQueries({ queryKey: ['ride', rideId] });
                queryClient.cancelQueries({ queryKey: ['booking', rideId] });

                queryClient.setQueryData(['ride', rideId], null);
                queryClient.setQueryData(['booking', rideId], (old: any) =>
                    old ? { ...old, status: newStatus, driverId: null, provisionalDriverId: null, driver: null } : { status: newStatus }
                );

                // Ask the server for fresh data right away, bypass stale cache
                queryClient.invalidateQueries({ queryKey: ['booking', rideId], exact: true });
                queryClient.invalidateQueries({ queryKey: ['ride', rideId], exact: true });

                setDriverInfo(null);
                setDriverLocation(null);
                setRoute([]);

                if (newStatus === 'SEARCHING_DRIVER' && lastStatus !== 'SEARCHING_DRIVER') {
                    toast.info("Đang tiếp tục tìm tài xế khác...", { toastId: "search_another" });
                }

                if (newStatus === 'CANCELLED') {
                    toast.error("Chuyến đi đã bị hủy", { toastId: 'ride_cancelled' })
                    navigate('/')
                }
                return;
            }

            // Re-join tracking room on IN_PROGRESS to ensure we get the new route
            if (newStatus === 'IN_PROGRESS' && trackingSocket?.connected) {
                console.log('[RideTracking] Re-joining tracking room for IN_PROGRESS route update');
                trackingSocket.emit('ride:join_tracking', { rideId });
            }

            // Update driver info if payload has it (from notification service enrichment)
            if (data.payload && data.payload.driverId && (data.payload.driverName || data.payload.vehicle)) {
                console.log('[RideTracking] Updating driver info from status payload');
                setDriverInfo({
                    id: data.payload.driverId,
                    name: data.payload.driverName || driverInfo?.name || 'Tài xế đang đến',
                    phone: data.payload.driverPhone || driverInfo?.phone,
                    avatar: data.payload.driverAvatar || driverInfo?.avatar,
                    rating: data.payload.driverRating || driverInfo?.rating,
                    vehicleType: data.payload.vehicle?.type || driverInfo?.vehicleType,
                    vehicle: data.payload.vehicle
                        ? `${data.payload.vehicle.color} ${data.payload.vehicle.make} ${data.payload.vehicle.model} - ${data.payload.vehicle.plate}`
                        : (driverInfo?.vehicle || 'Đang cập nhật')
                })
            }

            if (newStatus === 'COMPLETED') {
                toast.success("Chuyến đi hoàn tất.", { toastId: 'ride_completed' })
                // No navigation to Payment. We wait here for driver to hit confirm, or wallet to deduct.
            }
        }
    })

    // Listen for payment completed event — navigate to rating
    useSocketEvent('payment:completed', (data: any) => {
        console.log('[RideTracking] Payment Completed:', data);
        if (data.rideId === rideId && !hasNavigated) {
            setHasNavigated(true)
            toast.success("Thanh toán thành công. Cảm ơn bạn!", { toastId: 'payment_completed' });
            navigate(`/rating/${rideId}`);
        }
    })

    // Fallback: auto-navigate to rating after 6s if WALLET/CARD and payment:completed not received
    // This handles cases where socket event is missed due to network issues
    useEffect(() => {
        if (status !== 'COMPLETED' || hasNavigated) return

        const paymentMethod = rideData?.paymentMethod || booking?.paymentMethod
        if (paymentMethod !== 'WALLET' && paymentMethod !== 'CARD') return

        console.log('[RideTracking] COMPLETED + WALLET/CARD detected. Starting 6s fallback timer...')
        const timer = setTimeout(() => {
            if (!hasNavigated) {
                console.log('[RideTracking] Fallback timer fired — navigating to rating')
                setHasNavigated(true)
                navigate(`/rating/${rideId}`)
            }
        }, 6000)

        return () => clearTimeout(timer)
    }, [status, hasNavigated, rideData, booking, rideId, navigate])

    const [route, setRoute] = useState<{ lat: number; lng: number }[]>([])
    const [realtimeInfo, setRealtimeInfo] = useState<{ distance?: number, duration?: number }>({})


    // Listen for route info and location update from Tracking Service via /tracking-socket
    useSocketEvent('ride:route_info', (data: any) => {
        console.log('[RideTracking] Route Info received:', data)

        if (data.route && data.route.length > 0) {
            setRoute(data.route);
        }

        if (data.distanceMeters !== undefined || data.durationSeconds !== undefined) {
            setRealtimeInfo({
                distance: data.distanceMeters,
                duration: data.durationSeconds
            });
        }

        if (data.driverLocation) {
            setDriverLocation(data.driverLocation)
        }
        if (data.pickup || data.drop) {
            setRideData((prev: any) => ({ ...prev, pickup: data.pickup, drop: data.drop }))
        }
    }, '/tracking-socket')

    useSocketEvent('driver:location_update', handleLocationUpdate, '/tracking-socket')

    const getPaymentMessage = () => {
        const currentMethod = rideData?.paymentMethod || booking?.paymentMethod;
        if (currentMethod === 'WALLET' || currentMethod === 'CARD') {
            return `Hệ thống đang tự động trừ tiền qua ${currentMethod}...`;
        }
        return 'Vui lòng chuẩn bị tiền mặt và chờ tài xế xác nhận...';
    };

    return (
        <div className="flex h-full w-full flex-col min-h-0 overflow-hidden">
            <div className="flex-1 relative min-h-0">
                <Map
                    center={driverLocation || rideData?.pickup || undefined}
                    markers={[
                        ...(rideData?.pickup ? [{ ...rideData.pickup, icon: 'pickup' as const }] : []),
                        ...(rideData?.drop ? [{ ...rideData.drop, icon: 'drop' as const }] : []),
                        ...(driverLocation ? [{
                            ...driverLocation,
                            icon: (rideData?.vehicleDetails?.type === 'BIKE' || driverInfo?.vehicleType === 'BIKE') ? 'bike' as const : 'cab' as const
                        }] : [])
                    ]}
                    route={route}
                />
            </div>

            {(status === 'SEARCHING_DRIVER') && (
                <div className="bg-white p-6 rounded-t-3xl shadow-lg relative z-[1000]">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                        <h3 className="text-lg font-semibold text-gray-800">
                            Đang tìm tài xế gần bạn...
                        </h3>
                    </div>
                    <button
                        onClick={() => cancelBookingMutation.mutate()}
                        disabled={cancelBookingMutation.isPending}
                        className="w-full py-3 bg-gray-100 disabled:opacity-50 hover:bg-red-50 hover:text-red-600 rounded-xl font-medium text-gray-700 transition"
                    >
                        {cancelBookingMutation.isPending ? 'Đang hủy...' : 'Hủy chuyến'}
                    </button>
                </div>
            )}

            {status === 'MATCH_FAILED' && (
                <div className="bg-white p-6 rounded-t-3xl shadow-lg relative z-[1000] border-t-4 border-red-500 animate-in slide-in-from-bottom duration-300">
                    <div className="text-center space-y-4">
                        <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                            <Search className="h-8 w-8 text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900">Không tìm thấy tài xế</h3>
                            <p className="text-sm text-gray-500 px-4">Rất tiếc, hiện tại không có tài xế nào ở gần khu vực của bạn. Vui lòng thử lại sau ít phút.</p>
                        </div>
                        <div className="pt-2 space-y-3">
                            <button
                                onClick={() => navigate('/')}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-blue-200 transition-all active:scale-[0.98]"
                            >
                                Quay lại trang chủ
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {status !== 'SEARCHING_DRIVER' && status !== 'MATCH_FAILED' && (
                <div className="bg-white p-6 rounded-t-3xl shadow-lg space-y-4 relative z-[1000]">
                    <div className="flex justify-between items-center border-b pb-4">
                        <div className="text-center w-1/3">
                            <p className="text-xs text-gray-500">
                                {['DRIVER_ASSIGNED', 'ACCEPTED', 'ARRIVED'].includes(status) ? 'Thời gian đón' : 'Thời gian đến'}
                            </p>
                            <p className="text-lg font-bold text-primary">
                                ~{realtimeInfo.duration !== undefined
                                    ? Math.max(1, Math.round(realtimeInfo.duration / 60))
                                    : (rideData?.pickupEtaSeconds ? Math.round(rideData.pickupEtaSeconds / 60) : 3)} phút
                            </p>
                        </div>
                        <div className="text-center w-1/3 border-l border-r">
                            <p className="text-xs text-gray-500">Quãng đường</p>
                            <p className="text-lg font-bold">
                                ~{realtimeInfo.distance !== undefined
                                    ? (realtimeInfo.distance / 1000).toFixed(1)
                                    : (rideData?.tripDistanceMeters ? (rideData.tripDistanceMeters / 1000).toFixed(1) : '2.5')} km
                            </p>
                        </div>
                        <div className="text-center w-1/3">
                            <p className="text-xs text-gray-500">Giá cước</p>
                            <p className="text-lg font-bold">{(rideData?.estimatedPrice || 0).toLocaleString()}đ</p>
                        </div>
                    </div>

                    {driverInfo && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                    {driverInfo.avatar ? (
                                        <img src={driverInfo.avatar} alt="Driver" className="h-full w-full object-cover" />
                                    ) : (
                                        <User className="h-6 w-6 text-gray-500" />
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">{driverInfo.name || 'Tài xế'}</h4>
                                    <div className="flex items-center text-sm text-gray-500 space-x-1">
                                        <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                                        <span>{driverInfo.rating || '5.0'}</span>
                                        <span>•</span>
                                        <span>{driverInfo.vehicle || 'Đang cập nhật'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                <button className="p-3 rounded-full bg-green-100 text-green-600">
                                    <Phone className="h-5 w-5" />
                                </button>
                                <button className="p-3 rounded-full bg-blue-100 text-blue-600">
                                    <ShieldCheck className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {!driverInfo && (
                        <div className="flex items-center justify-center py-4 text-gray-400 italic">
                            Đang tải thông tin tài xế...
                        </div>
                    )}

                    <div className="pt-2">
                        <div className="text-center text-sm font-semibold text-blue-600 animate-pulse">
                            {status === 'PROPOSED' && 'Đã tìm thấy xe, chờ tài xế xác nhận...'}
                            {(status === 'DRIVER_ASSIGNED' || status === 'ACCEPTED' || status === 'ASSIGNED') && 'Tài xế đã nhận chuyến và đang đến...'}
                            {status === 'ARRIVED' && 'Tài xế đã đến điểm đón!'}
                            {status === 'IN_PROGRESS' && 'Đang di chuyển đến điểm trả...'}
                            {status === 'COMPLETED' && getPaymentMessage()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
