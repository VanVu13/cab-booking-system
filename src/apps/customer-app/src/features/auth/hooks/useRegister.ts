import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/authApi'
import { useNavigate } from 'react-router-dom'
import { RegisterPayload } from '../types'
import { toast } from 'react-toastify'

export function useRegister() {
    const navigate = useNavigate()

    return useMutation({
        mutationFn: (data: RegisterPayload) => authApi.register(data),
        onSuccess: (response) => {
            // Mapping real backend response: { userId, role, message }
            // Real backend registration doesn't return tokens, so we redirect to login
            toast.success(response.message || "Đăng ký thành công! Vui lòng đăng nhập.", { toastId: 'register_success' });
            navigate('/auth/login');
        },
        onError: (error: any) => {
            console.error("Lỗi đăng ký:", error);
            toast.error(error.message || "Đăng ký thất bại", { toastId: 'register_error' })
        }
    })
}
