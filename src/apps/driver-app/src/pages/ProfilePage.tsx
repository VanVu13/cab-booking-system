import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../api/userApi';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../stores/useAuthStore';
import { useDriverStore } from '../stores/useDriverStore';
import { UserProfile, VehicleDetails } from '../types/user';
import { toast } from 'react-toastify';
import { User, Phone, Car, FileText, Save, Loader2, MapPin, ArrowLeft, DollarSign, LogOut, Palette } from 'lucide-react';

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user, logout: authLogout } = useAuthStore();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [avatar, setAvatar] = useState('');
    const [address, setAddress] = useState('');
    const [licenseNumber, setLicenseNumber] = useState('');
    const [vehicle, setVehicle] = useState<VehicleDetails>({
        make: '', model: '', year: '', color: '', plate: '', type: 'SEDAN', photoUrl: ''
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await userApi.getProfile();
            setProfile(data);
            setName(data.name || '');
            setPhone(data.phone || '');
            setAvatar(data.avatar || '');
            setAddress(data.address || '');
            setLicenseNumber(data.licenseNumber || '');
            if (data.vehicleDetails) {
                setVehicle(data.vehicleDetails);

                // Inject vehicleType to authStore if loading initially
                useAuthStore.getState().setUser({
                    ...useAuthStore.getState().user as any,
                    vehicleType: data.vehicleDetails.type || 'SEDAN'
                });
            }
        } catch (error) {
            toast.error('Không thể tải thông tin hồ sơ');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updated = await userApi.updateProfile({
                name,
                phone,
                avatar,
                address,
                licenseNumber,
                vehicleDetails: vehicle
            });
            setProfile(updated);

            // Sync with global store so Dashboard updates immediately
            useAuthStore.getState().setUser({
                id: updated.userId,
                email: updated.email,
                name: updated.name,
                role: updated.role as 'PASSENGER' | 'DRIVER' | 'ADMIN',
                phone: updated.phone,
                vehicleType: vehicle.type // Ensure type floats into RAM
            });

            toast.success('Cập nhật hồ sơ thành công');
        } catch (error) {
            toast.error('Cập nhật thất bại');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        try {
            await authApi.logout()
        } catch (err) {
            console.error(err)
        }
        useDriverStore.getState().reset()
        authLogout()
        navigate('/login')
    }

    const handleVehicleChange = (field: keyof VehicleDetails, value: string) => {
        setVehicle(prev => ({ ...prev, [field]: value }));
    };

    if (loading) return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-50">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
        </div>
    );

    return (
        <div className="h-full w-full bg-gradient-to-br from-primary to-primary-dark flex flex-col min-h-0 overflow-hidden relative">
            {/* Header Background */}
            <div className="flex-none pt-12 pb-24 px-6 text-center relative z-10">
                <button
                    onClick={handleLogout}
                    className="absolute top-8 right-6 p-2 bg-white/20 rounded-full backdrop-blur-sm active:scale-95 transition-all text-white hover:bg-white/30"
                >
                    <LogOut className="w-5 h-5" />
                </button>

                <div className="w-24 h-24 mx-auto rounded-3xl bg-white p-1 shadow-xl mb-4 relative z-20">
                    <div className="w-full h-full rounded-2xl overflow-hidden bg-gray-100 flex justify-center items-center">
                        {avatar ? (
                            <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <User className="h-10 w-10 text-gray-400" />
                        )}
                    </div>
                </div>
                <h1 className="text-2xl font-black text-white">{name || 'Tài xế'}</h1>
                <p className="text-white/80 text-sm mt-1">{profile?.email}</p>
            </div>

            {/* Profile Form */}
            <div className="flex-1 bg-white rounded-t-[2.5rem] px-6 pt-8 pb-32 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] overflow-y-auto -mt-16 z-20">
                <form onSubmit={handleUpdate} className="space-y-6">
                    {/* Section: Personal Info */}
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Thông tin cá nhân</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Họ và tên</label>
                                <div className="relative">
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 focus:border-primary focus:bg-white transition-all text-sm font-medium"
                                        required
                                    />
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Số điện thoại</label>
                                <div className="relative">
                                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 focus:border-primary focus:bg-white transition-all text-sm font-medium"
                                        placeholder="0912345678"
                                    />
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Địa chỉ</label>
                                <div className="relative">
                                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 focus:border-primary focus:bg-white transition-all text-sm font-medium"
                                        placeholder="Địa chỉ liên hệ"
                                    />
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Link ảnh đại diện (URL)</label>
                                <input type="text" value={avatar} onChange={(e) => setAvatar(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 focus:border-primary focus:bg-white transition-all text-sm font-medium"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Vehicle Info */}
                    <div className="pt-2">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                            Giấy phép & Phương tiện
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Số GPLX</label>
                                <div className="relative">
                                    <input type="text" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-gray-900 focus:border-primary focus:bg-white transition-all text-sm font-medium"
                                        placeholder="B2-123456"
                                    />
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Loại xe</label>
                                    <select value={vehicle.type} onChange={(e) => handleVehicleChange('type', e.target.value)}
                                        className="w-full py-3 px-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm font-medium">
                                        <option value="SEDAN">SEDAN</option>
                                        <option value="SUV">SUV</option>
                                        <option value="BIKE">BIKE</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Biển số</label>
                                    <input type="text" value={vehicle.plate} onChange={(e) => handleVehicleChange('plate', e.target.value)}
                                        className="w-full py-3 px-4 rounded-xl border-2 border-yellow-200 bg-yellow-50/50 text-center font-mono font-bold text-sm uppercase"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Mẫu xe</label>
                                    <input type="text" value={vehicle.model} onChange={(e) => handleVehicleChange('model', e.target.value)}
                                        className="w-full py-3 px-4 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm font-medium"
                                        placeholder="Vios"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Màu xe</label>
                                    <div className="relative">
                                        <input type="text" value={vehicle.color} onChange={(e) => handleVehicleChange('color', e.target.value)}
                                            className="w-full pl-9 pr-3 py-3 rounded-xl border-2 border-gray-100 bg-gray-50 text-sm font-medium"
                                            placeholder="Trắng"
                                        />
                                        <Palette className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-6">
                        <button type="submit" disabled={saving}
                            className="w-full py-4 bg-primary text-white rounded-2xl font-black text-lg shadow-lg shadow-primary/30 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                            {saving ? <><Loader2 className="w-5 h-5 animate-spin" />Đang lưu...</> : 'Lưu Thay Đổi'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Bottom Nav */}
            <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 pt-4 pb-6 z-[1000] flex justify-center gap-12 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                <button
                    onClick={() => navigate('/earnings')}
                    className="flex flex-col items-center gap-1 text-gray-400 active:text-primary transition-colors"
                >
                    <DollarSign className="w-6 h-6" />
                    <span className="text-xs font-semibold">Thu nhập</span>
                </button>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex flex-col items-center gap-1 text-gray-400 active:text-primary transition-colors hover:text-primary"
                >
                    <MapPin className="w-6 h-6" />
                    <span className="text-xs font-semibold">Bản đồ</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-primary">
                    <User className="w-6 h-6" />
                    <span className="text-xs font-bold">Cá nhân</span>
                </button>
            </div>
        </div>
    );
}
