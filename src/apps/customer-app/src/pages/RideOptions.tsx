import { useEffect } from 'react'
import { useBookingStore } from '@/features/booking/store/useBookingStore'
import { pricingApi } from '@/api/pricingApi'
import { useCreateBooking } from '@/features/booking/hooks/useCreateBooking'
import { ArrowLeft, Car, Bike, Info, CreditCard, Banknote } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import Map from '@/components/map/Map'

export default function RideOptions() {
    const navigate = useNavigate()
    const { pickup, drop, vehicleType, setVehicleType, setEstimate, paymentMethod, setPaymentMethod } = useBookingStore()
    const { mutate: createBooking, isPending } = useCreateBooking()

    // Fetch available vehicle types from backend
    const { data: vehicleTypes, isLoading: isLoadingVehicles, isError: isErrorVehicles } = useQuery({
        queryKey: ['vehicleTypes'],
        queryFn: pricingApi.getVehicleTypes
    })

    // Fetch estimates for all vehicle types
    const { data: routeData, isLoading: isLoadingEstimates } = useQuery({
        queryKey: ['estimates', pickup?.address, drop?.address],
        queryFn: () => pricingApi.getEstimates(pickup!, drop!),
        enabled: !!pickup && !!drop
    })

    const estimates = routeData?.estimates || []
    const route = routeData?.route || []
    const selectedEstimate = estimates?.find((est: any) => est.vehicleType === vehicleType)

    useEffect(() => {
        if (selectedEstimate) {
            setEstimate(
                selectedEstimate.estimatedPrice,
                selectedEstimate.distance || 0,
                selectedEstimate.duration || ''
            )
        }
    }, [selectedEstimate, setEstimate])

    useEffect(() => {
        // Set default vehicle type if not set
        if (vehicleTypes && !vehicleType) {
            setVehicleType(vehicleTypes[0].id)
        }
    }, [vehicleTypes, vehicleType, setVehicleType])

    const handleBook = () => {
        if (pickup && drop && vehicleType && paymentMethod) {
            createBooking({ pickup, drop, vehicleType, paymentMethod })
        }
    }

    if (!pickup || !drop) {
        return (
            <div className="h-full flex items-center justify-center p-6 text-center">
                <div>
                    <h2 className="text-xl font-bold mb-2">Thiếu thông tin địa chỉ</h2>
                    <p className="text-gray-500 mb-6">Vui lòng chọn điểm đón và điểm đến trước.</p>
                    <button onClick={() => navigate('/')} className="bg-primary text-white px-6 py-2 rounded-xl font-bold">Quay lại</button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full w-full flex-col bg-white min-h-0 overflow-hidden">
            <div className="relative flex-1 min-h-0">
                {/* Header Control */}
                <div className="absolute left-4 top-4 z-[1000]">
                    <button onClick={() => navigate('/')} className="rounded-full bg-white p-3 shadow-xl hover:bg-gray-100 transition-all border border-gray-100">
                        <ArrowLeft className="h-6 w-6 text-gray-700" />
                    </button>
                </div>

                {/* Minified Address Display */}
                <div className="absolute left-4 right-4 top-20 z-[900] bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-white">
                    <div className="flex items-center space-x-3 px-2">
                        <div className="flex flex-col items-center gap-0.5">
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <div className="h-3 w-px bg-gray-300"></div>
                            <div className="h-2 w-2 rounded-full bg-red-500"></div>
                        </div>
                        <div className="flex-1 text-xs space-y-1">
                            <p className="font-bold text-gray-800 line-clamp-1 truncate">{pickup.address}</p>
                            <p className="font-bold text-primary line-clamp-1 truncate">{drop.address}</p>
                        </div>
                    </div>
                </div>

                <Map
                    center={pickup}
                    markers={[
                        { lat: pickup.lat, lng: pickup.lng, icon: 'pickup' },
                        { lat: drop.lat, lng: drop.lng, icon: 'drop' }
                    ]}
                    route={route}
                />
            </div>

            {/* Vehicle Selection Panel */}
            <div className="bg-white p-4 pb-safe rounded-t-[24px] shadow-[0_-4px_20px_rgba(0,0,0,0.05)] -mt-4 relative z-[1010]">
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3"></div>

                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-black text-gray-900">Chọn dịch vụ</h3>
                    <div className="flex items-center text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded-md">
                        <Info className="h-3 w-3 mr-1" /> GIÁ CỐ ĐỊNH
                    </div>
                </div>

                <div className="space-y-2 max-h-[25vh] overflow-y-auto pr-1">
                    {isLoadingVehicles && (
                        <div className="py-6 text-center text-gray-400 space-y-2">
                            <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                            <p className="text-xs font-bold">Đang tải các loại xe...</p>
                        </div>
                    )}
                    {isErrorVehicles && (
                        <div className="py-6 text-center text-red-500 space-y-2">
                            <p className="text-sm font-bold">Không thể tải danh sách loại xe.</p>
                            <p className="text-xs text-gray-400">Vui lòng kiểm tra kết nối mạng và thử lại.</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-2 px-4 py-1.5 bg-red-100 text-red-600 rounded-lg text-xs font-bold hover:bg-red-200 transition-colors"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}
                    {vehicleTypes?.map((option: any) => {
                        const estimate = estimates?.find((est: any) => est.vehicleType === option.id)
                        const Icon = option.icon === 'BIKE' ? Bike : Car

                        return (
                            <div
                                key={option.id}
                                onClick={() => setVehicleType(option.id)}
                                className={`group flex items-center justify-between rounded-xl border-2 p-3 transition-all duration-200 cursor-pointer ${vehicleType === option.id ? 'border-primary bg-blue-50/50' : 'border-gray-50 hover:border-gray-100 bg-gray-50'}`}
                            >
                                <div className="flex items-center">
                                    <div className={`p-2 rounded-lg mr-3 transition-colors ${vehicleType === option.id ? 'bg-primary text-white' : 'bg-white text-gray-400 group-hover:text-gray-600'}`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-black text-gray-900 text-sm truncate">{option.name}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                            {isLoadingEstimates ? 'Đang tính...' : (estimate?.duration || '6 phút')} • {option.description}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right ml-3">
                                    <p className="font-black text-base text-primary">
                                        {isLoadingEstimates ? '...' : (estimate?.estimatedPrice?.toLocaleString() || '0')}đ
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Chọn phương thức thanh toán */}
                <div className="mt-3 mb-3">
                    <h3 className="text-xs font-bold text-gray-500 mb-2">PHƯƠNG THỨC THANH TOÁN</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPaymentMethod('CASH')}
                            className={`flex flex-1 items-center justify-center space-x-2 py-2 px-3 rounded-lg border-2 transition-all ${paymentMethod === 'CASH' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}
                        >
                            <Banknote className="h-4 w-4" />
                            <span className="text-sm font-bold">Tiền mặt</span>
                        </button>
                        <button
                            onClick={() => setPaymentMethod('CARD')}
                            className={`flex flex-1 items-center justify-center space-x-2 py-2 px-3 rounded-lg border-2 transition-all ${paymentMethod === 'CARD' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}
                        >
                            <CreditCard className="h-4 w-4" />
                            <span className="text-sm font-bold">Thẻ / Ví</span>
                        </button>
                    </div>
                </div>

                <div className="mt-2">
                    <button
                        onClick={handleBook}
                        disabled={isPending || isLoadingEstimates}
                        className="w-full rounded-xl bg-primary py-3.5 text-base font-black text-white shadow-lg shadow-blue-200/50 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                        {isPending ? (
                            <><span>Đang đặt xe...</span></>
                        ) : (
                            <>
                                <span>Đặt {vehicleType === 'BIKE' ? 'Cab Bike' : 'Cab 4 chỗ'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
