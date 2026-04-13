import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingApi } from '@/api/bookingApi'
import { useBookingStore } from '@/features/booking/store/useBookingStore'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

export function useCreateBooking() {
    const navigate = useNavigate()
    const setBookingId = useBookingStore(state => state.setBookingId)
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: bookingApi.create,
        onSuccess: (data: any) => {
            // Remove previous potentially lingering cache
            queryClient.removeQueries({ queryKey: ['booking', data.bookingId] });
            queryClient.removeQueries({ queryKey: ['ride', data.bookingId] });

            // Set real ID from server
            setBookingId(data.bookingId)

            // Navigate directly to tracking screen with real ID
            navigate(`/tracking/${data.bookingId}`)
        },
        onError: () => {
            setBookingId(null)
            toast.error("Đặt xe thất bại, vui lòng thử lại sau.", { toastId: 'booking_fail' })
        }
    })
}
