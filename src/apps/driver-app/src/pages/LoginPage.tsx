import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { authApi } from '@/api/authApi'
import { toast } from 'react-toastify'
import { Car, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
    const navigate = useNavigate()
    const { setAuth } = useAuthStore()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !password) {
            toast.error('Vui lòng nhập đầy đủ thông tin')
            return
        }

        setLoading(true)
        try {
            const res = await authApi.login({ email, password })
            const { user, accessToken, refreshToken } = res

            if (user.role !== 'DRIVER') {
                toast.error('Tài khoản này không phải tài xế')
                return
            }

            setAuth(user, accessToken, refreshToken)

            try {
                const { userApi } = await import('@/api/userApi')
                const profile = await userApi.getProfile()
                if (profile.vehicleDetails?.type) {
                    useAuthStore.getState().setUser({
                        ...user,
                        vehicleType: profile.vehicleDetails.type
                    })
                }
            } catch (err) {
                console.warn('Could not fetch profile on login:', err)
            }

            toast.success(`Chào mừng, ${user.name}!`)
            navigate('/dashboard')
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string; error?: string } } }
            toast.error(error.response?.data?.error || error.response?.data?.message || 'Đăng nhập thất bại')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="h-full w-full bg-gradient-to-br from-primary to-primary-dark flex flex-col min-h-0 overflow-hidden">
            {/* Header */}
            <div className="flex-none flex flex-col items-center justify-center px-6 pt-12 pb-8">
                <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 mb-4">
                    <Car className="w-16 h-16 text-white" strokeWidth={1.5} />
                </div>
                <h1 className="text-3xl font-black text-white mb-2">Driver App</h1>
                <p className="text-white/80 text-sm">Hệ thống quản lý tài xế CAB</p>
            </div>

            {/* Login Form */}
            <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl overflow-y-auto">
                <h2 className="text-2xl font-black text-gray-900 mb-6">Đăng nhập</h2>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="driver@example.com"
                            className="w-full px-4 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all text-base"
                            autoComplete="email"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Mật khẩu
                        </label>
                        <div className="relative">
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all text-base pr-12"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(!showPass)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                            >
                                {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Đang đăng nhập...
                            </>
                        ) : 'Đăng nhập'}
                    </button>
                </form>

                <div className="text-center mt-6">
                    <p className="text-sm text-gray-500">
                        Chưa có tài khoản?{' '}
                        <Link to="/register" className="text-primary font-bold hover:underline">
                            Đăng ký ngay
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
