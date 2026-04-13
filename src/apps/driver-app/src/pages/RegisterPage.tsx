import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '@/api/authApi'
import { toast } from 'react-toastify'
import { Car, Eye, EyeOff, Loader2, User, Mail, Lock, Phone, FileText, Palette } from 'lucide-react'

export default function RegisterPage() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [showPass, setShowPass] = useState(false)

    // Personal info
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    // Vehicle & License
    const [licenseNumber, setLicenseNumber] = useState('')
    const [vehicleType, setVehicleType] = useState<'SEDAN' | 'SUV' | 'BIKE'>('SEDAN')
    const [vehiclePlate, setVehiclePlate] = useState('')
    const [vehicleModel, setVehicleModel] = useState('')
    const [vehicleColor, setVehicleColor] = useState('')

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name || !email || !phone || !password || !confirmPassword || !licenseNumber || !vehiclePlate || !vehicleModel || !vehicleColor) {
            toast.error('Vui lòng nhập đầy đủ thông tin')
            return
        }

        if (password !== confirmPassword) {
            toast.error('Mật khẩu xác nhận không khớp')
            return
        }

        if (password.length < 6) {
            toast.error('Mật khẩu phải có ít nhất 6 ký tự')
            return
        }

        setLoading(true)
        try {
            const result = await authApi.register({
                name,
                email,
                password,
                role: 'DRIVER',
                phone,
                licenseNumber,
                vehicleType,
                vehiclePlate,
                vehicleModel,
                vehicleColor
            })

            // Navigate to pending approval page
            navigate('/pending-approval')
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Đăng ký thất bại'
            toast.error(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="h-full w-full bg-gradient-to-br from-primary to-primary-dark flex flex-col min-h-0 overflow-hidden">
            {/* Header */}
            <div className="flex-none pt-8 pb-4 px-6 text-center">
                <div className="bg-white/20 backdrop-blur-sm w-14 h-14 rounded-3xl flex items-center justify-center mx-auto mb-3">
                    <Car className="w-7 h-7 text-white" strokeWidth={1.5} />
                </div>
                <h1 className="text-2xl font-black text-white">Đăng ký Tài xế</h1>
                <p className="text-white/80 text-sm mt-1">Gia nhập đội ngũ CAB ngay hôm nay</p>
            </div>

            {/* Register Form */}
            <div className="flex-1 bg-white rounded-t-3xl px-6 pt-6 pb-10 shadow-2xl overflow-y-auto">
                <form onSubmit={handleRegister} className="space-y-3">
                    {/* Section: Personal Info */}
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thông tin cá nhân</p>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Họ và tên *</label>
                        <div className="relative">
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                                placeholder="Nguyễn Văn A"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all text-sm"
                                autoComplete="name"
                            />
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                        <div className="relative">
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                placeholder="driver@example.com"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all text-sm"
                                autoComplete="email"
                            />
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại *</label>
                        <div className="relative">
                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                                placeholder="0912345678"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary focus:bg-white transition-all text-sm"
                                autoComplete="tel"
                            />
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Mật khẩu *</label>
                            <div className="relative">
                                <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm"
                                    autoComplete="new-password"
                                />
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Xác nhận *</label>
                            <div className="relative">
                                <input type={showPass ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm"
                                    autoComplete="new-password"
                                />
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            </div>
                        </div>
                    </div>
                    <button type="button" onClick={() => setShowPass(!showPass)} className="text-xs text-primary font-medium">
                        {showPass ? <><EyeOff className="w-3 h-3 inline mr-1" />Ẩn mật khẩu</> : <><Eye className="w-3 h-3 inline mr-1" />Hiện mật khẩu</>}
                    </button>

                    {/* Section: License & Vehicle */}
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2">Giấy phép & Phương tiện</p>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Số GPLX (Giấy phép lái xe) *</label>
                        <div className="relative">
                            <input type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)}
                                placeholder="B2-123456"
                                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm"
                            />
                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Loại xe *</label>
                        <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as 'SEDAN' | 'SUV' | 'BIKE')}
                            className="w-full py-3 px-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm">
                            <option value="SEDAN">Sedan (4 chỗ)</option>
                            <option value="SUV">SUV (7 chỗ)</option>
                            <option value="BIKE">Xe máy</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Hãng & Model xe *</label>
                            <input type="text" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)}
                                placeholder="Toyota Vios 2020"
                                className="w-full py-3 px-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Màu xe *</label>
                            <div className="relative">
                                <input type="text" value={vehicleColor} onChange={(e) => setVehicleColor(e.target.value)}
                                    placeholder="Trắng"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm"
                                />
                                <Palette className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Biển số xe *</label>
                        <input type="text" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)}
                            placeholder="30A-123.45"
                            className="w-full py-3 px-4 rounded-xl border-2 border-gray-100 bg-yellow-50 border-yellow-200 text-center font-mono font-bold uppercase text-sm"
                        />
                    </div>

                    {/* Submit */}
                    <div className="pt-3">
                        <button type="submit" disabled={loading}
                            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                            {loading ? (<><Loader2 className="w-5 h-5 animate-spin" />Đang xử lý...</>) : 'Đăng ký ngay'}
                        </button>
                    </div>

                    <div className="text-center mt-4 pb-4">
                        <p className="text-sm text-gray-500">
                            Đã có tài khoản?{' '}
                            <Link to="/login" className="text-primary font-bold hover:underline">
                                Đăng nhập
                            </Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    )
}
