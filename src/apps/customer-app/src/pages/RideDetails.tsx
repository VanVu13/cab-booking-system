import { ArrowRight, Calendar, MapPin, User, Star, CreditCard, Loader2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { rideApi } from '@/api/rideApi'

export default function RideDetails() {
    const { rideId } = useParams<{ rideId: string }>()
    const navigate = useNavigate()

    const { data: ride, isLoading: isRideLoading } = useQuery({
        queryKey: ['ride', rideId],
        queryFn: () => rideApi.getById(rideId as string),
        enabled: !!rideId
    })

    if (isRideLoading) {
        return (
            <div className="flex h-full flex-col bg-gray-50 items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!ride) {
        return (
            <div className="flex h-full flex-col bg-gray-50 items-center justify-center space-y-4">
                <p className="text-gray-500">Không tìm thấy thông tin chuyến đi</p>
                <button onClick={() => navigate(-1)} className="px-4 py-2 bg-primary text-white rounded-lg">
                    Quay lại
                </button>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white p-4 shadow-sm z-10 relative">
                <div className="flex items-center space-x-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowRight className="h-5 w-5 rotate-180" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">Chi tiết chuyến đi</h1>
                        <p className="text-xs text-gray-500">ID: {ride.rideId || ride.bookingId}</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">

                {/* Status Card */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                    <span
                        className={`px-3 py-1.5 rounded-full text-sm font-bold mb-2 ${ride.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            ride.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                            }`}
                    >
                        {ride.status === 'COMPLETED' ? 'Hoàn thành' :
                            ride.status === 'CANCELLED' ? 'Đã hủy' : 'Đang xử lý'}
                    </span>
                    <h2 className="text-3xl font-black text-gray-800">
                        {ride.finalPrice ? ride.finalPrice.toLocaleString() : ride.estimatedPrice?.toLocaleString()}đ
                    </h2>
                    <div className="flex items-center text-sm text-gray-500 mt-2">
                        <Calendar className="h-4 w-4 mr-1.5" />
                        {new Date(ride.createdAt).toLocaleString('vi-VN')}
                    </div>
                </div>

                {/* Driver Info */}
                {ride.driverId && ride.driverId !== 'TBD' && (
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Thông tin tài xế</h3>
                        {ride.driverName ? (
                            <div className="flex items-center space-x-4">
                                <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                                    {ride.driverAvatar ? (
                                        <img src={ride.driverAvatar} alt="Driver" className="h-full w-full object-cover" />
                                    ) : (
                                        <User className="h-6 w-6 text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900">{ride.driverName}</h4>
                                    <div className="flex items-center text-sm text-gray-500 mt-1">
                                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-current mr-1" />
                                        <span>{ride.driverRating || 'Mới'}</span>
                                        <span className="mx-2">•</span>
                                        <span>{ride.vehicleDetails?.plate || ride.vehicleDetails?.model || 'Đang cập nhật'}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">Chưa có thông tin tài xế.</p>
                        )}
                    </div>
                )}

                {/* Route Info */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Lộ trình</h3>
                    <div className="relative pl-6 space-y-6">
                        {/* Vertical Line */}
                        <div className="absolute left-[9px] top-1.5 bottom-1.5 w-[2px] bg-gray-200"></div>

                        {/* Pickup */}
                        <div className="relative">
                            <div className="absolute -left-[28px] top-1 h-4 w-4 rounded-full bg-green-100 border-2 border-green-500 shadow-[0_0_0_2px_white] z-10 flex items-center justify-center">
                                <div className="h-1.5 w-1.5 bg-green-500 rounded-full"></div>
                            </div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Điểm đón</p>
                            <p className="text-sm font-medium text-gray-900">{ride.pickup?.address}</p>
                        </div>

                        {/* Dropoff */}
                        <div className="relative">
                            <div className="absolute -left-[28px] top-1 h-4 w-4 rounded-full bg-red-100 border-2 border-red-500 shadow-[0_0_0_2px_white] z-10 flex items-center justify-center">
                                <div className="h-1.5 w-1.5 bg-red-500 rounded-full"></div>
                            </div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Điểm đến</p>
                            <p className="text-sm font-medium text-gray-900">{ride.drop?.address}</p>
                        </div>
                    </div>
                </div>

                {/* Additional Details */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-4 pb-2 border-b">Chi tiết</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 flex items-center"><MapPin className="w-4 h-4 mr-2" /> Loại xe</span>
                            <span className="font-medium text-gray-900">{ride.vehicleType === 'BIKE' ? 'Cab Bike' : 'Cab 4 chỗ'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 flex items-center"><CreditCard className="w-4 h-4 mr-2" /> Thanh toán</span>
                            <span className="font-medium text-gray-900">{ride.paymentMethod === 'CASH' ? 'Tiền mặt' : ride.paymentMethod}</span>
                        </div>
                        {ride.distanceMeters > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 flex items-center">Quãng đường</span>
                                <span className="font-medium text-gray-900">{(ride.distanceMeters / 1000).toFixed(1)} km</span>
                            </div>
                        )}
                        {ride.durationSeconds > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 flex items-center">Thời gian</span>
                                <span className="font-medium text-gray-900">{Math.round(ride.durationSeconds / 60)} phút</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
