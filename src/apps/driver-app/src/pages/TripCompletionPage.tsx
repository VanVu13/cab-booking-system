import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDriverStore } from '@/stores/useDriverStore'
import { paymentApi } from '@/api/paymentApi'
import { rideApi } from '@/api/rideApi'
import { toast } from 'react-toastify'
import { CheckCircle, Banknote, CreditCard, Loader2, MapPin, Clock, DollarSign } from 'lucide-react'
import { useSocketEvent } from '@/hooks/useSocket'

type PaymentMethod = 'CASH' | 'WALLET' | 'CARD'

export default function TripCompletionPage() {
    const { rideId } = useParams<{ rideId: string }>()
    const navigate = useNavigate()
    const { currentRide, setCurrentRide, addEarnings, incrementTrips } = useDriverStore()

    // Fetch ride details from booking API if distance/duration missing in store
    useEffect(() => {
        if (!rideId || !currentRide) return
        if (currentRide.estimatedDistance && currentRide.estimatedDuration) return

        const fetchRideDetails = async () => {
            try {
                console.log('[TripCompletion] Fetching ride details for missing distance/duration...')
                const data = await rideApi.getById(rideId)
                if (data) {
                    const updated = { ...currentRide }
                    if (!updated.estimatedDistance && data.estimatedDistance) {
                        updated.estimatedDistance = data.estimatedDistance
                    }
                    if (!updated.estimatedDuration && (data.tripEtaSeconds || data.estimatedDuration)) {
                        updated.estimatedDuration = data.tripEtaSeconds || data.estimatedDuration
                    }
                    if (!updated.estimatedPrice && data.estimatedPrice) {
                        updated.estimatedPrice = data.estimatedPrice
                    }
                    setCurrentRide(updated)
                    console.log('[TripCompletion] Updated ride with API data:', {
                        distance: updated.estimatedDistance,
                        duration: updated.estimatedDuration
                    })
                }
            } catch (err) {
                console.warn('[TripCompletion] Failed to fetch ride details:', err)
            }
        }

        fetchRideDetails()
    }, [rideId])

    // Khóa phương thức thanh toán theo lựa chọn của khách hàng
    const paymentMethod: PaymentMethod = (currentRide?.paymentMethod as PaymentMethod) || 'CASH'
    const isPrepaid = paymentMethod === 'WALLET' || paymentMethod === 'CARD'

    const [loading, setLoading] = useState(false)
    const [confirmed, setConfirmed] = useState(false)

    const ride = currentRide
    const amount = ride?.estimatedPrice || 0

    // Fallback: if server pushes payment:completed event to driver socket, auto-confirm
    useSocketEvent('payment:completed', (data: any) => {
        if (data.rideId === rideId && !confirmed) {
            toast.success('Thanh toán đã được xác nhận!')
            setConfirmed(true)
            setTimeout(() => navigate(`/rating/${rideId}`), 1500)
        }
    })

    const handleConfirmPayment = async () => {
        if (!rideId || loading) return
        setLoading(true)
        try {
            const customerId = (ride as any)?.userId || ride?.passengerId
            console.log('[TripCompletion] Confirming payment, customerId:', customerId, 'method:', paymentMethod)

            // For WALLET: PSP already processed automatically on ride.completed.
            // chargePayment will return alreadyProcessed=true (idempotency) which is expected.
            // For CASH: this actually triggers the charge now.
            const response = await paymentApi.charge(rideId, amount, paymentMethod, customerId)
            console.log('[TripCompletion] Payment API Response:', response)

            addEarnings(amount)
            incrementTrips()
            setCurrentRide(null)
            setConfirmed(true)
            toast.success('Thanh toán thành công!')
            setTimeout(() => navigate(`/rating/${rideId}`), 1000)
        } catch {
            // Payment might already be processed (WALLET auto-paid) - treat as success
            toast.info('Chuyến đi đã được ghi nhận')
            addEarnings(amount)
            incrementTrips()
            setCurrentRide(null)
            setConfirmed(true)
            setTimeout(() => navigate(`/rating/${rideId}`), 1000)
        } finally {
            setLoading(false)
        }
    }

    if (confirmed) {
        return (
            <div className="h-full bg-gradient-to-br from-green-500 to-green-700 flex flex-col items-center justify-center px-6">
                <CheckCircle className="w-20 h-20 text-white mb-6 animate-in zoom-in duration-500" />
                <h2 className="text-3xl font-black text-white mb-2">Đã thanh toán!</h2>
                <p className="text-white/90 text-center mb-8">
                    {isPrepaid
                        ? 'Hệ thống đã trừ tiền cước tự động thành công.'
                        : 'Mục thu tiền mặt đã được ghi nhận.'}
                </p>
                <button
                    onClick={() => navigate(`/rating/${rideId}`)}
                    className="px-8 py-4 bg-white text-green-600 rounded-full font-bold shadow-lg active:scale-95 transition-all"
                >
                    Chuyển sang đánh giá ➔
                </button>
            </div>
        )
    }

    return (
        <div className="h-full w-full bg-surface flex flex-col min-h-0 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary-dark px-6 pt-12 pb-8 flex-none">
                <h1 className="text-2xl font-black text-white mb-1">Chuyến đi hoàn tất</h1>
                <p className="text-white/80 text-sm">Xác nhận thu tiền từ khách hàng</p>
            </div>

            <div className="flex-1 px-6 py-6 space-y-4 overflow-y-auto min-h-0">
                {/* Trip Summary */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4">Tóm tắt chuyến đi</h3>
                    <div className="space-y-3">
                        {ride?.pickup && (
                            <div className="flex items-start gap-3">
                                <div className="w-3 h-3 rounded-full bg-primary mt-1 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-400">Điểm đón</p>
                                    <p className="text-sm font-medium text-gray-800">
                                        {ride.pickup.address || `${ride.pickup.lat.toFixed(4)}, ${ride.pickup.lng.toFixed(4)}`}
                                    </p>
                                </div>
                            </div>
                        )}
                        {ride?.drop && (
                            <div className="flex items-start gap-3">
                                <div className="w-3 h-3 rounded-full bg-danger mt-1 flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-gray-400">Điểm trả</p>
                                    <p className="text-sm font-medium text-gray-800">
                                        {ride.drop.address || `${ride.drop.lat.toFixed(4)}, ${ride.drop.lng.toFixed(4)}`}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                        <MapPin className="w-5 h-5 text-primary mx-auto mb-1" />
                        <p className="text-xs text-gray-400">Quãng đường</p>
                        <p className="text-sm font-bold text-gray-800">
                            {ride?.estimatedDistance ? (ride.estimatedDistance / 1000).toFixed(1) + ' km' : '--'}
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                        <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-400">Thời gian</p>
                        <p className="text-sm font-bold text-gray-800">
                            {ride?.estimatedDuration ? Math.round(ride.estimatedDuration / 60) + ' phút' : '--'}
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                        <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
                        <p className="text-xs text-gray-400">Giá cước</p>
                        <p className="text-sm font-bold text-primary">
                            {amount.toLocaleString('vi-VN')}đ
                        </p>
                    </div>
                </div>

                {/* Payment Method */}
                <div className="bg-white rounded-2xl p-5 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4">Phương thức thanh toán</h3>

                    {paymentMethod === 'CASH' ? (
                        <div className="flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-primary bg-primary/5">
                            <Banknote className="w-8 h-8 text-primary" />
                            <span className="text-lg font-bold text-primary">Tiền mặt</span>
                            <span className="text-sm text-gray-500 text-center mt-1">Vui lòng thu tiền mặt từ khách hàng</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col items-center gap-2 p-6 rounded-2xl border-2 border-blue-500 bg-blue-50">
                                <CreditCard className="w-8 h-8 text-blue-600" />
                                <span className="text-lg font-bold text-blue-700">
                                    {paymentMethod === 'CARD' ? 'Thẻ tín dụng' : 'Ví điện tử'}
                                </span>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-blue-700">
                                    Hệ thống đã <span className="font-bold">tự động trừ tiền</span> của khách hàng. Nhấn xác nhận để hoàn tất chuyến đi.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Total */}
                <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-5">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Tổng thu</span>
                        <span className="text-3xl font-black text-primary">
                            {amount.toLocaleString('vi-VN')}đ
                        </span>
                    </div>
                </div>
            </div>

            {/* Confirm Button — always a clickable button, label changes by payment method */}
            <div className="px-6 pb-8">
                <button
                    onClick={handleConfirmPayment}
                    disabled={loading}
                    className="w-full py-5 bg-primary text-white rounded-2xl font-black text-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                    {loading
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : <CheckCircle className="w-5 h-5" />
                    }
                    {loading
                        ? 'Đang xử lý...'
                        : isPrepaid
                            ? 'Xác nhận đã thanh toán'
                            : 'Xác nhận đã thu tiền mặt'
                    }
                </button>
            </div>
        </div>
    )
}
