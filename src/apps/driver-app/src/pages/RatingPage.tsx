import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { reviewApi } from '@/api/reviewApi'
import { Star, Loader2, User, CheckCircle } from 'lucide-react'
import { toast } from 'react-toastify'
import { useQuery } from '@tanstack/react-query'
import { rideApi } from '@/api/rideApi'

export default function RatingPage() {
    const { rideId } = useParams<{ rideId: string }>()
    const navigate = useNavigate()
    const [rating, setRating] = useState(5)
    const [comment, setComment] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const { data: ride } = useQuery({
        queryKey: ['ride', rideId],
        queryFn: () => rideApi.getById(rideId!),
        enabled: !!rideId
    })

    const passengerName = ride?.passengerName || 'Khách hàng'
    const passengerAvatar = ride?.passengerAvatar
    const amount = ride?.estimatedPrice || 0

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            await reviewApi.submit(rideId!, rating, comment)
            toast.success("Cảm ơn đánh giá của bạn!")
            navigate('/dashboard')
        } catch (error: any) {
            if (error.response?.status === 409) {
                toast.info("Bạn đã đánh giá chuyến đi này rồi.")
            } else {
                toast.error("Gửi đánh giá thất bại")
            }
            // Even on error, let's navigate home so user isn't stuck
            navigate('/dashboard')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex h-full flex-col bg-gray-50 overflow-y-auto">
            <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">

                {/* 1. Phần Receipt - Thanh toán */}
                <div className="bg-white p-6 rounded-2xl shadow-sm w-full text-center space-y-2 border border-gray-100">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-2" />
                    <h2 className="text-xl font-bold text-gray-900">Đã nhận thanh toán</h2>
                    <p className="text-gray-500 text-sm">Chuyến đi đã hoàn tất</p>
                    <div className="text-3xl font-black text-primary pt-2">
                        +{amount.toLocaleString('vi-VN')}đ
                    </div>
                </div>

                {/* 2. Phần Rating */}
                <div className="bg-white p-6 rounded-2xl shadow-sm w-full space-y-4 border border-gray-100 flex flex-col items-center">
                    <div className="h-20 w-20 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center border-4 border-white shadow-sm -mt-10">
                        {passengerAvatar ? (
                            <img src={passengerAvatar} alt="Passenger" className="h-full w-full object-cover" />
                        ) : (
                            <User className="h-10 w-10 text-gray-500" />
                        )}
                    </div>
                    <div className="text-center">
                        <h2 className="text-xl font-bold">{passengerName}</h2>
                        <p className="text-gray-500">Khách hàng này thế nào?</p>
                    </div>

                    <div className="flex space-x-2 pt-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={`h-10 w-10 cursor-pointer transition-colors ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                                onClick={() => setRating(star)}
                            />
                        ))}
                    </div>

                    <div className="w-full mt-4">
                        <textarea
                            className="w-full rounded-xl border border-gray-300 p-4 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                            rows={3}
                            placeholder="Để lại nhận xét hoặc góp ý..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                        ></textarea>
                    </div>
                </div>
            </div>

            <div className="p-6 bg-white border-t space-y-3">
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center rounded-xl bg-primary py-4 font-bold text-white shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-50 text-lg"
                >
                    {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Gửi đánh giá & Về trang chủ
                </button>
                <button
                    onClick={() => navigate('/dashboard')}
                    disabled={isSubmitting}
                    className="flex w-full items-center justify-center rounded-xl bg-gray-100 py-4 font-bold text-gray-600 active:scale-[0.98] transition-all hover:bg-gray-200"
                >
                    Bỏ qua
                </button>
            </div>
        </div>
    )
}
