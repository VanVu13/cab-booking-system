import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDriverStore } from '@/stores/useDriverStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useSocketEvent } from '@/hooks/useSocket'
import { getSocket, connectSocket } from '@/services/socketService'
import { useGpsEmitter, setSimulatedRoute, clearSimulatedRoute } from '@/hooks/useGpsEmitter'
import { rideApi } from '@/api/rideApi'
import Map from '@/components/map/Map'
import { toast } from 'react-toastify'
import { MapPin, User, Phone, ChevronRight, Loader2, Navigation } from 'lucide-react'

type NavStatus = 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED'

const STATUS_CONFIG: Record<NavStatus, {
    label: string
    sublabel: string
    btnText: string
    btnColor: string
    nextStatus: NavStatus | null
}> = {
    ACCEPTED: {
        label: 'Đang đến điểm đón',
        sublabel: 'Di chuyển đến vị trí khách hàng',
        btnText: 'Đã đến điểm đón',
        btnColor: 'bg-blue-500 shadow-blue-200',
        nextStatus: 'ARRIVED',
    },
    ARRIVED: {
        label: 'Đã đến điểm đón',
        sublabel: 'Chờ khách hàng lên xe',
        btnText: 'Bắt đầu chuyến đi',
        btnColor: 'bg-primary shadow-primary/30',
        nextStatus: 'IN_PROGRESS',
    },
    IN_PROGRESS: {
        label: 'Đang di chuyển',
        sublabel: 'Đang đến điểm trả khách',
        btnText: 'Hoàn thành chuyến',
        btnColor: 'bg-warning shadow-yellow-200',
        nextStatus: 'COMPLETED',
    },
    COMPLETED: {
        label: 'Chuyến đi hoàn tất',
        sublabel: 'Đang xử lý thanh toán...',
        btnText: 'Xem thanh toán',
        btnColor: 'bg-gray-400',
        nextStatus: null,
    },
}

export default function RideNavigationPage() {
    const { rideId } = useParams<{ rideId: string }>()
    const navigate = useNavigate()
    const { currentRide, updateRideStatus, setCurrentRide, setDriverStatus, location: myLocation } = useDriverStore()
    const [status, setStatus] = useState<NavStatus>((currentRide?.status as NavStatus) || 'ACCEPTED')
    const [loading, setLoading] = useState(false)
    const [route, setRoute] = useState<{ lat: number; lng: number }[]>([])

    // Keep GPS emitting during trip
    useGpsEmitter()

    // Listen for route info from tracking service
    useSocketEvent('ride:route_info', (data: unknown) => {
        const routeData = data as { route?: { lat: number; lng: number }[] }
        if (routeData.route && routeData.route.length > 0) {
            setRoute(routeData.route)
            // Auto-simulate driver movement along the route for demo
            setSimulatedRoute(routeData.route)
        }
    }, '/tracking-socket')

    // Join tracking room so tracking-service broadcasts route & location to this driver
    useEffect(() => {
        if (!rideId) return
        const trackingSocket = getSocket('/tracking-socket') || connectSocket('/tracking-socket')
        if (trackingSocket?.connected) {
            console.log('[DriverNav] Joining tracking room:', rideId)
            trackingSocket.emit('ride:join_tracking', { rideId })
        }
        const handleConnect = () => {
            console.log('[DriverNav] Tracking socket connected, joining room:', rideId)
            trackingSocket?.emit('ride:join_tracking', { rideId })
        }
        trackingSocket?.on('connect', handleConnect)
        return () => { trackingSocket?.off('connect', handleConnect) }
    }, [rideId])

    // Listen for status updates
    useSocketEvent('ride:status_update', (data: unknown) => {
        const update = data as { rideId?: string; status?: string; payload?: { status?: string, rideId?: string } }
        const rId = update.rideId || update.payload?.rideId
        const s = update.status || update.payload?.status

        if (rId === rideId && s) {
            if (s === 'CANCELLED') {
                toast.error('Chuyến đi đã bị khách hàng hủy')
                setCurrentRide(null) // Reset store state by clearing current ride
                setDriverStatus('ONLINE')   // Make driver available again
                navigate('/')
                return
            }

            const newStatus = s as NavStatus
            setStatus(newStatus)
            updateRideStatus(newStatus)
        }
    })

    const handleAction = async () => {
        if (!rideId || loading) return
        const config = STATUS_CONFIG[status]
        if (!config) {
            console.error('[DriverNav] Invalid status:', status)
            return
        }
        setLoading(true)

        try {
            if (status === 'ACCEPTED') {
                await rideApi.arrived(rideId)
                setStatus('ARRIVED')
                updateRideStatus('ARRIVED')
                toast.success('Đã thông báo đến điểm đón!')
            } else if (status === 'ARRIVED') {
                await rideApi.start(rideId)
                setStatus('IN_PROGRESS')
                updateRideStatus('IN_PROGRESS')
                toast.success('Chuyến đi đã bắt đầu!')

                // FIX: Re-join tracking room after a short delay so tracking-service
                // recalculates route from driver current position -> drop point
                setTimeout(() => {
                    const trackingSocket = getSocket('/tracking-socket') || connectSocket('/tracking-socket')
                    if (trackingSocket?.connected) {
                        console.log('[DriverNav] Re-joining tracking room for IN_PROGRESS route:', rideId)
                        trackingSocket.emit('ride:join_tracking', { rideId })
                    }
                }, 500)
            } else if (status === 'IN_PROGRESS') {
                await rideApi.complete(rideId)
                setStatus('COMPLETED')
                updateRideStatus('COMPLETED')
                setDriverStatus('ONLINE')
                clearSimulatedRoute()
                toast.success('Chuyến đi hoàn tất!')
                navigate(`/completion/${rideId}`)
            } else if (status === 'COMPLETED') {
                navigate(`/completion/${rideId}`)
            }
        } catch {
            toast.error('Có lỗi xảy ra. Thử lại!')
        } finally {
            setLoading(false)
        }

        console.log('Next status:', config.nextStatus)
    }

    const config = STATUS_CONFIG[status] || STATUS_CONFIG.ACCEPTED
    // Get driver vehicle type from auth store
    const { user } = useAuthStore()
    const ride = currentRide;
    const markerIcon = user?.vehicleType === 'BIKE' ? 'bike' as const : 'driver' as const;
    console.log('[RideNavigation] User VehicleType:', user?.vehicleType, '-> showing icon:', markerIcon);

    // Build map markers
    const rawMarkers = [
        ...(myLocation ? [{ ...myLocation, icon: markerIcon }] : []),
        ...(status === 'ACCEPTED' && ride?.pickup ? [{ ...ride.pickup, icon: 'pickup' as const }] : []),
        ...(status !== 'ACCEPTED' && ride?.drop ? [{ ...ride.drop, icon: 'drop' as const }] : []),
    ]

    // Filter out invalid markers to prevent Leaflet crash
    const markers = rawMarkers.filter(m => typeof m.lat === 'number' && typeof m.lng === 'number' && !isNaN(m.lat) && !isNaN(m.lng));

    const [isFocusMode, setIsFocusMode] = useState(true);

    return (
        <div className="relative w-full h-full flex flex-col">
            {/* Map */}
            <div className="flex-1 relative">
                <Map
                    center={myLocation || ride?.pickup || undefined}
                    zoom={17}
                    markers={markers}
                    route={route}
                    followLocation={isFocusMode ? myLocation || undefined : undefined}
                />

                {/* Status badge on map */}
                <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-start">
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg text-white text-sm font-bold ${status === 'ACCEPTED' ? 'bg-blue-500' :
                        status === 'ARRIVED' ? 'bg-primary' :
                            status === 'IN_PROGRESS' ? 'bg-warning' : 'bg-gray-500'
                        }`}>
                        <Navigation className="w-4 h-4" />
                        {config.label}
                    </div>

                    {/* Toggle Focus Mode Button */}
                    <button 
                        onClick={() => setIsFocusMode(!isFocusMode)}
                        className={`p-3 rounded-2xl shadow-xl transition-all border ${
                            isFocusMode 
                            ? 'bg-primary text-white border-primary-dark scale-110' 
                            : 'bg-white text-gray-600 border-gray-100'
                        }`}
                        title={isFocusMode ? "Chế độ: Tập trung" : "Chế độ: Tổng quan"}
                    >
                        <Navigation className={`w-5 h-5 ${isFocusMode ? 'fill-current' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Bottom Panel */}
            <div className="bg-white rounded-t-3xl shadow-2xl px-6 pt-5 pb-8 z-[1000]">
                {/* Passenger info */}
                {ride && (
                    <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                            {ride.passengerAvatar ? (
                                <img src={ride.passengerAvatar} alt="Passenger" className="h-full w-full object-cover" />
                            ) : (
                                <User className="w-6 h-6 text-gray-500" />
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-gray-900">{ride.passengerName || 'Khách hàng'}</p>
                            <p className="text-sm text-gray-500">{config.sublabel}</p>
                        </div>
                        {ride.passengerPhone ? (
                            <a href={`tel:${ride.passengerPhone}`} className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 hover:bg-green-200 transition-colors">
                                <Phone className="w-4 h-4" />
                            </a>
                        ) : (
                            <button className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 cursor-not-allowed">
                                <Phone className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}

                {/* Route summary */}
                {ride && (
                    <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                        <div className="flex items-center gap-2 text-sm">
                            <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="text-gray-600 truncate">
                                {status === 'ACCEPTED'
                                    ? (ride.pickup?.address || 'Điểm đón')
                                    : (ride.drop?.address || 'Điểm trả')}
                            </span>
                            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-auto" />
                        </div>
                    </div>
                )}

                {/* Fare */}
                {ride && (
                    <div className="flex justify-between items-center mb-5">
                        <span className="text-gray-500 text-sm">Giá cước</span>
                        <span className="text-xl font-black text-gray-900">
                            {ride.estimatedPrice.toLocaleString('vi-VN')}đ
                        </span>
                    </div>
                )}

                {/* Action button */}
                <button
                    onClick={handleAction}
                    disabled={loading}
                    className={`w-full py-5 text-white rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 ${config.btnColor}`}
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {loading ? 'Đang xử lý...' : config.btnText}
                </button>
            </div>
        </div>
    )
}
