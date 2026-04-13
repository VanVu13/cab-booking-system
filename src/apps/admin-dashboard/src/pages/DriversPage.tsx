import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import { StatusBadge } from '../components/StatusBadge';
import { toast } from 'react-toastify';
import { Search, Filter, Ban, CheckCircle, XCircle, MoreVertical, Loader2 } from 'lucide-react';

export default function DriversPage() {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedDriver, setSelectedDriver] = useState<any>(null);
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [actionType, setActionType] = useState<'ACTIVE' | 'REJECTED' | 'SUSPENDED'>('ACTIVE');
    const [reason, setReason] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchDrivers();
    }, [statusFilter]);

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const data = await adminApi.getDriversList(statusFilter);
            setDrivers(data.drivers || []);
        } catch (error) {
            toast.error('Không thể tải danh sách tài xế');
        } finally {
            setLoading(false);
        }
    };

    const openActionModal = (driver: any, type: 'ACTIVE' | 'REJECTED' | 'SUSPENDED') => {
        setSelectedDriver(driver);
        setActionType(type);
        setReason('');
        setIsActionModalOpen(true);
    };

    const submitAction = async () => {
        if (!selectedDriver) return;
        if ((actionType === 'REJECTED' || actionType === 'SUSPENDED') && !reason.trim()) {
            toast.error('Vui lòng nhập lý do!');
            return;
        }

        setProcessing(true);
        try {
            await adminApi.updateDriverStatus(selectedDriver.id, actionType, reason);
            toast.success(`Cập nhật trạng thái thành công`);
            setIsActionModalOpen(false);
            fetchDrivers(); // Reload
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Lỗi cập nhật');
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Tài xế</h1>
                    <p className="text-gray-500 text-sm mt-1">Duyệt và kiểm soát hồ sơ tài xế</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm tên, email, sđt..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-gray-400 w-5 h-5" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="pl-2 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="PENDING_APPROVAL">Chờ Duyệt (Mới)</option>
                        <option value="ACTIVE">Đã Duyệt (Active)</option>
                        <option value="REJECTED">Từ chối</option>
                        <option value="SUSPENDED">Đình chỉ</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
                                <th className="p-4 font-semibold">Tài xế</th>
                                <th className="p-4 font-semibold">Thông tin xe</th>
                                <th className="p-4 font-semibold">Giấy phép</th>
                                <th className="p-4 font-semibold">Trạng thái</th>
                                <th className="p-4 font-semibold text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : drivers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">
                                        Không tìm thấy tài xế nào
                                    </td>
                                </tr>
                            ) : (
                                drivers.map((driver) => (
                                    <tr key={driver.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-semibold text-gray-900">{driver.name}</div>
                                            <div className="text-sm text-gray-500">{driver.email}</div>
                                            <div className="text-sm text-gray-500">{driver.profile?.phone || 'N/A'}</div>
                                        </td>
                                        <td className="p-4">
                                            {driver.profile ? (
                                                <>
                                                    <div className="font-medium text-gray-800">{driver.profile.vehiclePlate}</div>
                                                    <div className="text-sm text-gray-500">{driver.profile.vehicleType} • {driver.profile.vehicleModel}</div>
                                                    <div className="text-xs text-gray-400">Màu: {driver.profile.vehicleColor}</div>
                                                </>
                                            ) : (
                                                <span className="text-gray-400 italic">Chưa có profile</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-medium">{driver.profile?.licenseNumber || 'N/A'}</div>
                                        </td>
                                        <td className="p-4">
                                            <StatusBadge status={driver.status} />
                                            {driver.profile?.rejectionReason && (
                                                <div className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={driver.profile.rejectionReason}>
                                                    Lý do: {driver.profile.rejectionReason}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {driver.status === 'PENDING_APPROVAL' && (
                                                    <>
                                                        <button
                                                            onClick={() => openActionModal(driver, 'ACTIVE')}
                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200" title="Duyệt"
                                                        >
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => openActionModal(driver, 'REJECTED')}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200" title="Từ chối"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                {driver.status === 'ACTIVE' && (
                                                    <button
                                                        onClick={() => openActionModal(driver, 'SUSPENDED')}
                                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200" title="Đình chỉ"
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {driver.status === 'SUSPENDED' && (
                                                    <button
                                                        onClick={() => openActionModal(driver, 'ACTIVE')}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-green-200" title="Hủy Đình chỉ"
                                                    >
                                                        <CheckCircle className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Modal */}
            {isActionModalOpen && selectedDriver && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {actionType === 'ACTIVE' ? 'Xác nhận Duyệt Tài xế' :
                                actionType === 'REJECTED' ? 'Từ chối Hồ sơ' : 'Đình chỉ Tài xế'}
                        </h3>
                        <p className="text-gray-600 text-sm mb-4">
                            Bạn đang thực hiện thao tác <strong className={
                                actionType === 'ACTIVE' ? 'text-green-600' : 'text-red-600'
                            }>{actionType}</strong> đối với tài xế <strong>{selectedDriver.name}</strong>.
                        </p>

                        {(actionType === 'REJECTED' || actionType === 'SUSPENDED') && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Lý do (Bắt buộc) *</label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none"
                                    rows={3}
                                    placeholder={actionType === 'REJECTED' ? "Lý do từ chối hồ sơ (ví dụ: GPLX mờ...)" : "Lý do đình chỉ..."}
                                    required
                                />
                            </div>
                        )}

                        <div className="flex gap-3 justify-end mt-6">
                            <button
                                onClick={() => setIsActionModalOpen(false)}
                                disabled={processing}
                                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={submitAction}
                                disabled={processing}
                                className={`px-5 py-2 text-white font-medium rounded-lg transition-colors flex items-center ${actionType === 'ACTIVE' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {processing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                {processing ? 'Đang xử lý...' : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
