import { useAuthStore } from '@/stores/useAuthStore'
import { useBookingStore } from '@/features/booking/store/useBookingStore'
import { User, Phone, Mail, LogOut, Shield, CreditCard, Clock, Edit2, Save, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { userApi } from '@/api/userApi'
import { toast } from 'react-toastify'

export default function Profile() {
    const { user, setUser, logout } = useAuthStore()
    const navigate = useNavigate()
    const [isEditing, setIsEditing] = useState(false)
    const [saving, setSaving] = useState(false)

    // Edit Form State
    const [formData, setFormData] = useState({
        name: user?.name || '',
        phone: user?.phone || ''
    })

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await userApi.getProfile()
                if (data) {
                    setUser({
                        id: data.userId || (user && user.id),
                        email: data.email || (user && user.email),
                        name: data.name,
                        role: data.role || (user && user.role) || 'PASSENGER',
                        phone: data.phone
                    })
                    setFormData({
                        name: data.name || '',
                        phone: data.phone || ''
                    })
                }
            } catch (err) {
                console.error('Failed to load profile', err)
            }
        }
        loadProfile()
    }, [])

    const handleLogout = () => {
        useBookingStore.getState().resetBooking()
        logout()
        navigate('/auth/login')
    }

    const startEditing = () => {
        setFormData({
            name: user?.name || '',
            phone: user?.phone || ''
        })
        setIsEditing(true)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const updatedUser = await userApi.updateProfile(formData)

            if (updatedUser) {
                setUser({
                    id: updatedUser.userId || (user && user.id),
                    email: updatedUser.email || (user && user.email),
                    name: updatedUser.name,
                    role: updatedUser.role || (user && user.role) || 'PASSENGER',
                    phone: updatedUser.phone
                })
            }

            toast.success('Cập nhật thành công!', { toastId: 'profile_update_success' })
            setIsEditing(false)

        } catch (error) {
            toast.error('Cập nhật thất bại', { toastId: 'profile_update_error' })
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="flex h-full flex-col bg-gray-50 pb-20">
            {/* Header Profile */}
            <div className="bg-white p-6 pb-8 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Hồ sơ</h2>
                    {!isEditing && (
                        <button onClick={startEditing} className="text-primary font-medium flex items-center">
                            <Edit2 className="w-4 h-4 mr-1" /> Sửa
                        </button>
                    )}
                </div>

                <div className="flex items-center space-x-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-8 w-8" />
                    </div>
                    <div className="flex-1">
                        {isEditing ? (
                            <input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="text-xl font-bold text-gray-900 w-full border-b border-primary outline-none"
                                placeholder="Tên hiển thị"
                            />
                        ) : (
                            <h2 className="text-xl font-bold text-gray-900">{user?.name || 'Khách'}</h2>
                        )}
                        <p className="text-sm text-gray-500">{user?.email}</p>
                    </div>
                </div>
            </div>

            {/* Menu Items / Form */}
            <div className="mt-4 flex-1 space-y-2 p-4">
                <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                    <div className="flex items-center border-b p-4">
                        <Phone className="mr-3 h-5 w-5 text-gray-500" />
                        <span className="w-24 text-gray-500">Số ĐT</span>
                        {isEditing ? (
                            <input
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="flex-1 border rounded px-2 py-1 outline-none focus:ring-1 ring-primary"
                                placeholder="0912..."
                            />
                        ) : (
                            <span className="flex-1 font-medium">{user?.phone || 'Chưa cập nhật'}</span>
                        )}
                    </div>
                    <div className="flex items-center border-b p-4">
                        <Mail className="mr-3 h-5 w-5 text-gray-500" />
                        <span className="w-24 text-gray-500">Email</span>
                        <span className="flex-1 text-gray-400 cursor-not-allowed">{user?.email}</span>
                    </div>
                </div>

                {isEditing ? (
                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center hover:bg-primary/90"
                        >
                            <Save className="w-5 h-5 mr-2" /> {saving ? 'Đang lưu...' : 'Lưu'}
                        </button>
                        <button
                            onClick={() => setIsEditing(false)}
                            disabled={saving}
                            className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center hover:bg-gray-300"
                        >
                            <X className="w-5 h-5 mr-2" /> Hủy
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-hidden rounded-xl bg-white shadow-sm mt-4">
                            <div
                                onClick={() => navigate('/history')}
                                className="flex cursor-pointer items-center border-b p-4 hover:bg-gray-50"
                            >
                                <Clock className="mr-3 h-5 w-5 text-blue-500" />
                                <span className="flex-1 font-medium">Lịch sử chuyến đi</span>
                            </div>
                            <div className="flex cursor-pointer items-center border-b p-4 hover:bg-gray-50">
                                <CreditCard className="mr-3 h-5 w-5 text-green-500" />
                                <span className="flex-1 font-medium">Phương thức thanh toán</span>
                            </div>
                            <div className="flex cursor-pointer items-center p-4 hover:bg-gray-50">
                                <Shield className="mr-3 h-5 w-5 text-orange-500" />
                                <span className="flex-1 font-medium">Hỗ trợ & An toàn</span>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="mt-6 flex w-full items-center justify-center space-x-2 rounded-xl bg-red-50 p-4 text-red-600 hover:bg-red-100"
                        >
                            <LogOut className="h-5 w-5" />
                            <span className="font-semibold">Đăng xuất</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}
