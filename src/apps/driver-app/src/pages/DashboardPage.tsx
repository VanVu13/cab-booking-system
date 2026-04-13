import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useDriverStore, type RideRequest } from '@/stores/useDriverStore'
import { useSocket, useSocketEvent } from '@/hooks/useSocket'
import { useGpsEmitter } from '@/hooks/useGpsEmitter'
import { driverApi } from '@/api/driverApi'
import { rideApi } from '@/api/rideApi'
import { reviewApi } from '@/api/reviewApi'
import Map from '@/components/map/Map'
import { toast } from 'react-toastify'
import {
    Power, MapPin, DollarSign, Clock, Navigation,
    CheckCircle, XCircle, Loader2, TrendingUp, LogOut, User
} from 'lucide-react'
import { useAuthStore as useAuth } from '@/stores/useAuthStore'
import { userApi } from '@/api/userApi'
import { authApi } from '@/api/authApi'

// Countdown timer for incoming ride
function CountdownBar({ seconds, onExpire }: { seconds: number; onExpire: () => void }) {
    const [remaining, setRemaining] = useState(seconds)
    const hasExpired = useRef(false)

    useEffect(() => {
        if (remaining <= 0) {
            if (!hasExpired.current) {
                hasExpired.current = true;
                onExpire();
            }
            return;
        }
        const t = setTimeout(() => setRemaining(r => r - 1), 1000)
        return () => clearTimeout(t)
    }, [remaining, onExpire])

    const pct = (remaining / seconds) * 100
    const color = remaining > 15 ? 'bg-primary' : remaining > 8 ? 'bg-warning' : 'bg-danger'

    return (
        <div className="w-full">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Tự động từ chối sau</span>
                <span className={`font-bold ${remaining <= 8 ? 'text-danger' : 'text-gray-700'}`}>{remaining}s</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-1000 ${color}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    )
}

// Incoming Ride Overlay
function IncomingRideOverlay({
    ride,
    onAccept,
    onReject,
    accepting,
}: {
    ride: RideRequest
    onAccept: () => void
    onReject: (reason?: string) => void
    accepting: boolean
}) {
    const handleExpire = useCallback(() => {
        if (accepting) return;
        onReject('TIMEOUT')
    }, [onReject, accepting])

    const formatPrice = (p: number) => p.toLocaleString('vi-VN') + 'đ'
    const formatDist = (m?: number) => m ? (m / 1000).toFixed(1) + ' km' : '--'

    return (
        <div className="absolute inset-0 z-[2000] bg-black/40 flex items-end">
            <div className="w-full bg-white rounded-t-3xl p-6 slide-up shadow-2xl">
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center overflow-hidden">
                        {ride.passengerAvatar ? (
                            <img src={ride.passengerAvatar} alt="Passenger" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-6 h-6 text-primary" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900">{ride.passengerName || 'Chuyến đi mới!'}</h3>
                        <p className="text-sm text-gray-500">{ride.passengerName ? 'Đang chờ bạn nhận chuyến' : 'Phản hồi ngay để nhận chuyến'}</p>
                    </div>
                    <div className="ml-auto text-right">
                        <p className="text-2xl font-black text-primary">{formatPrice(ride.estimatedPrice)}</p>
                        <p className="text-xs text-gray-500">{formatDist(ride.estimatedDistance)}</p>
                    </div>
                </div>

                {/* Route info */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-4 space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="w-3 h-3 rounded-full bg-primary mt-1 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-400 font-medium">ĐIỂM ĐÓN</p>
                            <p className="text-sm font-semibold text-gray-800 leading-tight">
                                {ride.pickup.address || `${ride.pickup.lat.toFixed(4)}, ${ride.pickup.lng.toFixed(4)}`}
                            </p>
                        </div>
                    </div>
                    <div className="ml-1.5 w-0.5 h-4 bg-gray-300" />
                    <div className="flex items-start gap-3">
                        <div className="w-3 h-3 rounded-full bg-danger mt-1 flex-shrink-0" />
                        <div>
                            <p className="text-xs text-gray-400 font-medium">ĐIỂM TRẢ</p>
                            <p className="text-sm font-semibold text-gray-800 leading-tight">
                                {ride.drop.address || `${ride.drop.lat.toFixed(4)}, ${ride.drop.lng.toFixed(4)}`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ETA info */}
                {ride.estimatedDuration && (
                    <div className="flex items-center gap-2 mb-4 text-sm text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span>Thời gian dự kiến: ~{Math.round(ride.estimatedDuration / 60)} phút</span>
                    </div>
                )}

                {/* Countdown */}
                <div className="mb-5">
                    <CountdownBar seconds={30} onExpire={handleExpire} />
                </div>

                {/* CTA Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={() => onReject('MANUAL')}
                        disabled={accepting}
                        className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-bold text-base flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
                    >
                        <XCircle className="w-5 h-5" />
                        Từ chối
                    </button>
                    <button
                        onClick={onAccept}
                        disabled={accepting}
                        className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-lg shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-60"
                    >
                        {accepting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <CheckCircle className="w-5 h-5" />
                        )}
                        {accepting ? 'Đang nhận...' : 'Nhận chuyến'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function DashboardPage() {
    const navigate = useNavigate()
    const { user, logout } = useAuth()
    const { driverStatus, setDriverStatus, incomingRide, setIncomingRide, setCurrentRide, earningsToday, totalTrips, rating, location } = useDriverStore()
    const [togglingStatus, setTogglingStatus] = useState(false)
    const [accepting, setAccepting] = useState(false)

    // Start GPS emitter (updates store.location when ONLINE/ON_TRIP)
    useGpsEmitter()

    // Immediately request geolocation on mount (even when OFFLINE)
    // so the map shows driver's current position right after login
    useEffect(() => {
        if (!navigator.geolocation) return
        // Only request if we don't have a location yet
        if (useDriverStore.getState().location) return

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords
                if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
                    useDriverStore.getState().setLocation({ lat: latitude, lng: longitude })
                    console.log(`[Dashboard] Initial GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
                }
            },
            (error) => {
                console.warn('[Dashboard] Initial geolocation error:', error.message)
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
        )
    }, [])

    // Use driver-service socket channel (/ws)
    const socket = useSocket('/ws')

    // Sync status with driver-service socket on connection
    useEffect(() => {
        if (socket && socket.connected && user && driverStatus === 'ONLINE') {
            console.log('[Dashboard] Syncing AVAILABLE status with driver-service...')
            socket.emit('driver:status_change', {
                driverId: user.id,
                status: 'AVAILABLE'
            })
        }
    }, [socket?.connected, user?.id, driverStatus])

    // Sync profile on mount
    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await userApi.getProfile()
                if (data && user) {
                    useAuthStore.getState().setUser({
                        id: data.userId || user.id,
                        email: data.email || user.email,
                        name: data.name || user.name,
                        role: data.role || user.role,
                        phone: data.phone || user.phone,
                        vehicleType: data.vehicleDetails?.type || user.vehicleType
                    })
                }
            } catch (err) {
                console.error('Failed to load profile on mount', err)
            }
        }
        if (user) {
            loadProfile()
        }
    }, [])

    // Fetch driver stats (earnings, trips) from backend on mount
    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await driverApi.getStats()
                if (data) {
                    useDriverStore.getState().setStats(
                        data.earningsToday || 0,
                        data.totalTrips || 0
                    )
                    console.log('[Dashboard] Stats loaded:', data)
                }
            } catch (err) {
                console.warn('[Dashboard] Failed to load stats:', err)
            }
        }
        if (user) loadStats()
    }, [user?.id])

    // Fetch driver rating from review-service on mount
    useEffect(() => {
        const loadRating = async () => {
            try {
                if (!user?.id) return
                const data = await reviewApi.getDriverRating(user.id)
                if (data) {
                    useDriverStore.getState().setRating(data.averageRating || 0)
                    console.log('[Dashboard] Rating loaded:', data.averageRating)
                }
            } catch (err) {
                console.warn('[Dashboard] Failed to load rating:', err)
            }
        }
        if (user) loadRating()
    }, [user?.id])

    // Listen for incoming ride requests from driver-service
    useSocketEvent('ride:new_request', (data: unknown) => {
        const rideData = data as RideRequest & { bookingId?: string }
        console.log('[Dashboard] New ride request:', rideData)
        if (driverStatus === 'ONLINE') {
            setIncomingRide(rideData)
        }
    }, '/ws')

    const handleToggleStatus = async () => {
        setTogglingStatus(true)
        const newOnline = driverStatus === 'OFFLINE'
        try {
            await driverApi.updateStatus(newOnline)
            setDriverStatus(newOnline ? 'ONLINE' : 'OFFLINE')
            toast.success(newOnline ? '🟢 Bạn đang Online' : '⚫ Bạn đang Offline')

            // Register/unregister with driver-service socket
            if (socket && user) {
                socket.emit('driver:status_change', {
                    driverId: user.id,
                    status: newOnline ? 'AVAILABLE' : 'OFFLINE'
                })
            }
        } catch {
            // ...
            toast.error('Không thể thay đổi trạng thái')
        } finally {
            setTogglingStatus(false)
        }
    }

    const handleAccept = async () => {
        if (!incomingRide) return
        setAccepting(true)
        try {
            await rideApi.accept(incomingRide.rideId)
            setCurrentRide({ ...incomingRide, status: 'ACCEPTED' })
            setIncomingRide(null)
            setDriverStatus('ON_TRIP')
            toast.success('Đã nhận chuyến!')
            navigate(`/ride/${incomingRide.rideId}`)
        } catch {
            toast.error('Không thể nhận chuyến. Thử lại!')
        } finally {
            setAccepting(false)
        }
    }

    const handleReject = async (reason?: string) => {
        if (!incomingRide) return
        const rideToReject = incomingRide;
        setIncomingRide(null)

        if (reason === 'TIMEOUT') {
            toast.info('Hết thời gian phản hồi')
        } else {
            toast.info('Đã từ chối chuyến')
        }

        try {
            await rideApi.reject(rideToReject.rideId)
        } catch { /* silent */ }
    }

    const handleLogout = async () => {
        try {
            await authApi.logout()
        } catch (err) {
            console.error(err)
        }
        useDriverStore.getState().reset()
        logout()
        navigate('/login')
    }

    const isOnline = driverStatus !== 'OFFLINE'

    // Default location (HCM) if GPS not yet available
    const mapCenter = location || { lat: 10.7769, lng: 106.7009 }
    const markerIcon = user?.vehicleType === 'BIKE' ? 'bike' as const : 'driver' as const;
    console.log('[Dashboard] User VehicleType:', user?.vehicleType, '-> showing icon:', markerIcon);

    return (
        <div className="relative w-full h-full flex flex-col">
            {/* Map fullscreen */}
            <div className="flex-1 relative">
                <Map
                    center={mapCenter}
                    zoom={15}
                    markers={
                        location && typeof location.lat === 'number' && !isNaN(location.lat) && typeof location.lng === 'number' && !isNaN(location.lng)
                            ? [{ ...location, icon: markerIcon }]
                            : []
                    }
                />

                {/* Status indicator top */}
                <div className="absolute top-4 left-4 right-4 z-[1000] flex items-center justify-between">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-bold ${isOnline ? 'bg-primary text-white' : 'bg-white text-gray-600'}`}>
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
                        {driverStatus === 'ON_TRIP' ? 'Đang chạy' : isOnline ? 'Online' : 'Offline'}
                    </div>

                    <button
                        onClick={handleLogout}
                        className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 active:scale-95 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Bottom Panel */}
            <div className="bg-white rounded-t-3xl shadow-2xl px-6 pt-5 pb-8 z-[1000]">
                {/* Greeting */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <p className="text-sm text-gray-500">Xin chào,</p>
                        <h2 className="text-xl font-black text-gray-900">{user?.name || 'Tài xế'}</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400">Hôm nay</p>
                        <p className="text-lg font-black text-primary">
                            {earningsToday.toLocaleString('vi-VN')}đ
                        </p>
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-primary/5 rounded-2xl p-3 text-center">
                        <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Thu nhập</p>
                        <p className="text-sm font-bold text-gray-800">{(earningsToday / 1000).toFixed(0)}K</p>
                    </div>
                    <div className="bg-blue-50 rounded-2xl p-3 text-center">
                        <MapPin className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Chuyến đi</p>
                        <p className="text-sm font-bold text-gray-800">{totalTrips}</p>
                    </div>
                    <div className="bg-yellow-50 rounded-2xl p-3 text-center">
                        <TrendingUp className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Đánh giá</p>
                        <p className="text-sm font-bold text-gray-800">{rating > 0 ? `${rating.toFixed(1)} ⭐` : 'N/A'}</p>
                    </div>
                </div>

                {/* Online/Offline Toggle Button */}
                <button
                    onClick={handleToggleStatus}
                    disabled={togglingStatus || driverStatus === 'ON_TRIP'}
                    className={`w-full py-5 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg disabled:opacity-60 ${isOnline
                        ? 'bg-gray-100 text-gray-700 shadow-gray-200'
                        : 'bg-primary text-white shadow-primary/30'
                        }`}
                >
                    {togglingStatus ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                        <Power className="w-6 h-6" />
                    )}
                    {togglingStatus
                        ? 'Đang xử lý...'
                        : driverStatus === 'ON_TRIP'
                            ? 'Đang chạy chuyến'
                            : isOnline
                                ? 'Chuyển Offline'
                                : 'Bắt đầu nhận chuyến'}
                </button>

                {/* Bottom nav */}
                <div className="flex justify-center gap-8 mt-5">
                    <button
                        onClick={() => navigate('/earnings')}
                        className="flex flex-col items-center gap-1 text-gray-400 active:text-primary transition-colors"
                    >
                        <DollarSign className="w-5 h-5" />
                        <span className="text-xs font-medium">Thu nhập</span>
                    </button>
                    <button className="flex flex-col items-center gap-1 text-primary">
                        <MapPin className="w-5 h-5" />
                        <span className="text-xs font-bold">Bản đồ</span>
                    </button>
                    <button
                        onClick={() => navigate('/profile')}
                        className="flex flex-col items-center gap-1 text-gray-400 active:text-primary transition-colors"
                    >
                        <User className="w-5 h-5" />
                        <span className="text-xs font-medium">Cá nhân</span>
                    </button>
                </div>
            </div>

            {/* Incoming Ride Overlay */}
            {incomingRide && (
                <IncomingRideOverlay
                    ride={incomingRide}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    accepting={accepting}
                />
            )}
        </div>
    )
}
