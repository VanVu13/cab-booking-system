import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDriverStore } from '@/stores/useDriverStore'
import { useQuery } from '@tanstack/react-query'
import { driverApi } from '@/api/driverApi'
import { ArrowLeft, TrendingUp, DollarSign, MapPin, Clock, Star, Wallet } from 'lucide-react'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { useState } from 'react'

interface RideHistoryItem {
    id: string
    pickup: { address?: string }
    drop: { address?: string }
    estimatedPrice: number
    finalPrice?: number
    status: string
    createdAt: string
    completedAt?: string
    distance?: number
    duration?: number
}

export default function EarningsPage() {
    const navigate = useNavigate()
    const { earningsToday, totalTrips } = useDriverStore()
    const [activeTab, setActiveTab] = useState<'today' | 'history'>('today')

    // Fetch stats independently so EarningsPage works without Dashboard
    useEffect(() => {
        const loadStats = async () => {
            try {
                const data = await driverApi.getStats()
                if (data) {
                    useDriverStore.getState().setStats(
                        data.earningsToday || 0,
                        data.totalTrips || 0
                    )
                }
            } catch (err) {
                console.warn('[EarningsPage] Failed to load stats:', err)
            }
        }
        loadStats()
    }, [])

    // Fetch wallet/earnings summary from driver-service
    const { data: walletData } = useQuery({
        queryKey: ['driver-earnings'],
        queryFn: () => driverApi.getEarnings(),
        retry: 1,
        staleTime: 30000,
    })

    // Fetch ride history from ride-service (via driver-service proxy)
    const { data: history, isLoading } = useQuery({
        queryKey: ['driver-history'],
        queryFn: () => driverApi.getRideHistory(),
        retry: 1,
    })

    const rides: RideHistoryItem[] = history?.rides || []
    const walletBalance = walletData?.balance || 0
    const totalEarnings = walletData?.totalEarnings || 0

    return (
        <div className="h-full w-full bg-surface flex flex-col min-h-0 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary-dark px-6 pt-12 pb-8">
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-black text-white">Thu nhập & Lịch sử</h1>
                </div>

                {/* Main earnings card */}
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5">
                    <p className="text-white/70 text-sm mb-1">Thu nhập hôm nay</p>
                    <p className="text-4xl font-black text-white mb-3">
                        {earningsToday.toLocaleString('vi-VN')}đ
                    </p>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5 text-white/80 text-sm">
                            <MapPin className="w-4 h-4" />
                            <span>{totalTrips} chuyến</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white/80 text-sm">
                            <Wallet className="w-4 h-4" />
                            <span>Ví: {walletBalance.toLocaleString('vi-VN')}đ</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats grid */}
            <div className="px-6 py-4">
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                        <DollarSign className="w-5 h-5 text-primary mx-auto mb-1" />
                        <p className="text-xs text-gray-400">Hôm nay</p>
                        <p className="text-sm font-black text-gray-800">
                            {(earningsToday / 1000).toFixed(0)}K
                        </p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                        <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-400">Chuyến đi</p>
                        <p className="text-sm font-black text-gray-800">{totalTrips}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 text-center shadow-sm">
                        <Clock className="w-5 h-5 text-yellow-500 mx-auto mb-1" />
                        <p className="text-xs text-gray-400">Trung bình</p>
                        <p className="text-sm font-black text-gray-800">
                            {totalTrips > 0 ? ((earningsToday / totalTrips) / 1000).toFixed(0) + 'K' : '--'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-6">
                <div className="flex bg-gray-100 rounded-2xl p-1">
                    <button
                        onClick={() => setActiveTab('today')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'today' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                            }`}
                    >
                        Hôm nay
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                            }`}
                    >
                        Lịch sử
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-6 py-4 overflow-y-auto">
                {activeTab === 'today' && (
                    <div className="space-y-3">
                        {earningsToday === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">Chưa có chuyến đi hôm nay</p>
                                <p className="text-sm mt-1">Bật Online để bắt đầu nhận chuyến</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-white rounded-2xl p-5 shadow-sm">
                                    <p className="text-gray-500 text-sm">Tổng thu nhập hôm nay</p>
                                    <p className="text-3xl font-black text-primary mt-1">
                                        {earningsToday.toLocaleString('vi-VN')}đ
                                    </p>
                                    <p className="text-sm text-gray-400 mt-2">từ {totalTrips} chuyến đi</p>
                                </div>

                                {/* Wallet info card */}
                                {walletData && (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Wallet className="w-5 h-5 text-blue-600" />
                                            <p className="text-sm font-bold text-blue-700">Ví tài xế</p>
                                        </div>
                                        <div className="flex justify-between">
                                            <div>
                                                <p className="text-xs text-gray-500">Số dư</p>
                                                <p className="text-lg font-black text-gray-800">
                                                    {walletBalance.toLocaleString('vi-VN')}đ
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500">Tổng thu nhập</p>
                                                <p className="text-lg font-black text-gray-800">
                                                    {totalEarnings.toLocaleString('vi-VN')}đ
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="space-y-3">
                        {isLoading && (
                            <div className="flex justify-center py-8">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}

                        {!isLoading && rides.length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                                <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p className="font-medium">Chưa có lịch sử chuyến đi</p>
                            </div>
                        )}

                        {rides.map((ride) => (
                            <div key={ride.id} className="bg-white rounded-2xl p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-400 mb-1">
                                            {ride.completedAt
                                                ? format(new Date(ride.completedAt), 'dd/MM/yyyy HH:mm', { locale: vi })
                                                : ride.createdAt
                                                    ? format(new Date(ride.createdAt), 'dd/MM/yyyy HH:mm', { locale: vi })
                                                    : '--'}
                                        </p>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                                                <p className="text-sm text-gray-700 truncate">
                                                    {ride.pickup?.address || 'Điểm đón'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-danger flex-shrink-0" />
                                                <p className="text-sm text-gray-700 truncate">
                                                    {ride.drop?.address || 'Điểm trả'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right ml-3">
                                        <p className="text-lg font-black text-primary">
                                            {(ride.finalPrice || ride.estimatedPrice || 0).toLocaleString('vi-VN')}đ
                                        </p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ride.status === 'COMPLETED'
                                            ? 'bg-primary/10 text-primary'
                                            : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {ride.status === 'COMPLETED' ? 'Hoàn tất' : ride.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
