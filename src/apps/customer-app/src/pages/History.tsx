import { Calendar, ArrowRight, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { bookingApi } from '@/api/bookingApi'

export default function History() {
    const navigate = useNavigate()

    const { data, isLoading, error } = useQuery({
        queryKey: ['user-bookings'],
        queryFn: bookingApi.getUserBookings
    })

    const bookings = (data?.bookings || []).filter((ride: any) =>
        ride.status === 'COMPLETED' || ride.status === 'CANCELLED'
    )

    return (
        <div className="flex h-full flex-col bg-gray-50">
            <div className="bg-white p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowRight className="h-5 w-5 rotate-180" />
                    </button>
                    <h1 className="text-xl font-bold">Lịch sử chuyến đi</h1>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoading && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {error && (
                    <div className="text-center py-8 text-red-500">
                        Có lỗi xảy ra khi tải lịch sử chuyến đi.
                    </div>
                )}

                {!isLoading && !error && bookings.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        Chưa có chuyến đi nào.
                    </div>
                )}

                {!isLoading && !error && bookings.map((ride: any) => (
                    <div
                        key={ride.bookingId}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer active:scale-[0.98] transition-all"
                        onClick={() => navigate(`/history/${ride.bookingId}`)}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center text-sm text-gray-500">
                                <Calendar className="h-4 w-4 mr-1" />
                                {new Date(ride.createdAt).toLocaleString('vi-VN')}
                            </div>
                            <span
                                className={`px-2 py-1 rounded-full text-xs font-semibold ${ride.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                    ride.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                    }`}
                            >
                                {ride.status === 'COMPLETED' ? 'Hoàn thành' :
                                    ride.status === 'CANCELLED' ? 'Đã hủy' : 'Đang xử lý'}
                            </span>
                        </div>

                        <div className="space-y-3 mb-4">
                            <div className="flex items-start">
                                <div className="h-2 w-2 mt-1.5 rounded-full bg-green-500 mr-2 shrink-0"></div>
                                <p className="text-sm font-medium line-clamp-1">{ride.pickup?.address || 'Điểm đón'}</p>
                            </div>
                            <div className="flex items-start">
                                <div className="h-2 w-2 mt-1.5 rounded-full bg-red-500 mr-2 shrink-0"></div>
                                <p className="text-sm font-medium line-clamp-1">{ride.drop?.address || 'Điểm đến'}</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t">
                            <span className="text-sm text-gray-500">{ride.vehicleType}</span>
                            <span className="font-bold text-primary">
                                {ride.estimatedPrice?.toLocaleString()}đ
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
