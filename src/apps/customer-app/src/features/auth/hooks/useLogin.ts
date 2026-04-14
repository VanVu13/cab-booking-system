import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/authApi'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNavigate } from 'react-router-dom'
import { LoginPayload } from '../types'
import { toast } from 'react-toastify'

export function useLogin() {
    const navigate = useNavigate()
    const setAuth = useAuthStore((state) => state.setAuth)
    const logout = useAuthStore((state) => state.logout) // Added logout for the new logic

    return useMutation({
        mutationFn: (data: LoginPayload) => authApi.login(data),
        onSuccess: (response) => {
            const { user, accessToken, refreshToken } = response

            // Check role logic
            if (user?.role !== 'PASSENGER') {
                // logout to clear any partial state
                logout()
                toast.error("Tài khoản này không phải là khách hàng", { toastId: 'login_not_customer' })
                return;
            }

            setAuth(user, accessToken, refreshToken) // Reverted to original as `data.data` is not available here
            toast.success("Đăng nhập thành công!", { toastId: 'login_success' })
            navigate('/')
        },
        onError: (error: any) => {
            console.error("Lỗi đăng nhập:", error)
            toast.error(error.message || "Đăng nhập thất bại", { toastId: 'login_error' })
        }
    })
}
