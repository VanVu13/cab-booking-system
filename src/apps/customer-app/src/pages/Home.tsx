import { useState, useEffect, useCallback, useRef } from 'react'
import Map from '@/components/map/Map'
import useGeoLocation from '@/hooks/useGeoLocation'
import { MapPin, Navigation, Search, ArrowLeft, Check, MousePointer2 } from 'lucide-react'
import { useBookingStore } from '@/features/booking/store/useBookingStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useNavigate } from 'react-router-dom'

export default function Home() {
    const location = useGeoLocation()
    const { setPickup, setDrop, pickup, drop } = useBookingStore()
    const { user } = useAuthStore()
    const navigate = useNavigate()

    const [isSearching, setIsSearching] = useState(false)
    const [isPickingOnMap, setIsPickingOnMap] = useState(false)
    // Validate pickup coords before using as initial center
    const initialCenter = pickup && Number.isFinite(pickup.lat) && Number.isFinite(pickup.lng) ? pickup : undefined;
    const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number } | undefined>(initialCenter)

    // Form states
    const [pickupInput, setPickupInput] = useState(pickup?.address || "")
    const [dropInput, setDropInput] = useState(drop?.address || "")
    const [activeInput, setActiveInput] = useState<'pickup' | 'drop'>('drop')
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [isLoadingSearch, setIsLoadingSearch] = useState(false)

    // Pick on map state
    const [tempPoint, setTempPoint] = useState<{ lat: number, lng: number, address: string } | null>(null)
    const [isGeocoding, setIsGeocoding] = useState(false)

    // Debounced search logic
    useEffect(() => {
        const query = activeInput === 'drop' ? dropInput : pickupInput
        if (query.length < 3 || isPickingOnMap) {
            setSuggestions([])
            return
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsLoadingSearch(true)
            try {
                // Biasing search to Ho Chi Minh City area
                const response = await fetch(`http://localhost:3000/maps/search?q=${query}&format=json&addressdetails=1&limit=15&countrycodes=vn&viewbox=106.35,11.02,107.03,10.35&bounded=0`)
                const data = await response.json()
                setSuggestions(Array.isArray(data) ? data : [])
            } catch (error) {
                console.error("Search error:", error)
            } finally {
                setIsLoadingSearch(false)
            }
        }, 500)

        return () => clearTimeout(delayDebounceFn)
    }, [pickupInput, dropInput, activeInput, isPickingOnMap])

    const hasGeolocated = useRef(false)

    // Initialize pickup from geolocation
    useEffect(() => {
        // Chỉ tự động định vị 1 lần duy nhất khi mở trang
        // - Tránh ghi đè nếu user đã tự chủ động chọn điểm đón bằng text/map sau đó quay lại trang này
        if (location.loaded && !location.error && location.coordinates && !isSearching && !hasGeolocated.current) {
            const { lat, lng } = location.coordinates
            setMapCenter({ lat, lng })
            hasGeolocated.current = true; // Mark as done

            fetch(`http://localhost:3000/maps/reverse-geocode?lat=${lat}&lon=${lng}&format=json&addressdetails=1`)
                .then(res => res.json())
                .then(data => {
                    const initPickup = {
                        lat,
                        lng,
                        address: data.display_name || "Vị trí của bạn"
                    }
                    setPickup(initPickup)
                    setPickupInput(initPickup.address)
                })
                .catch(() => {
                    const fallback = { lat, lng, address: "Vị trí của bạn" }
                    setPickup(fallback)
                    setPickupInput(fallback.address)
                })
        }
    }, [location.loaded, location.error, location.coordinates, pickup, setPickup, isSearching])

    // Sync store changes back to local inputs (e.g. after map picking or navigating back)
    useEffect(() => {
        if (pickup?.address && pickup.address !== pickupInput) {
            setPickupInput(pickup.address)
        }
    }, [pickup?.address])

    useEffect(() => {
        if (drop?.address && drop.address !== dropInput) {
            setDropInput(drop.address)
        }
    }, [drop?.address])

    const handleOpenMapPick = (type: 'pickup' | 'drop') => {
        setActiveInput(type)
        const currentLoc = type === 'drop' ? drop : pickup
        if (currentLoc && Number.isFinite(currentLoc.lat) && Number.isFinite(currentLoc.lng)) {
            setMapCenter(currentLoc)
            setTempPoint(currentLoc)
        }
        setIsSearching(false)
        setIsPickingOnMap(true)
    }

    const handleConfirmAddresses = () => {
        if (!drop) return;
        // Đi thẳng tới bước chọn xe luôn cho nhanh if already confirmed drop
        if (pickup && drop) {
            navigate('/ride-options')
        }
    }

    const formatAddressTitle = (displayName: string) => {
        const parts = displayName.split(',');
        return parts.slice(0, 2).join(', ').trim();
    }

    const formatAddressSubtitle = (displayName: string) => {
        const parts = displayName.split(',');
        if (parts.length <= 2) return "";
        return parts.slice(2).join(',').trim();
    }

    const handleSelectSuggestion = (place: any) => {
        const lat = parseFloat(place.lat);
        const lng = parseFloat(place.lon);
        // Guard: don't accept invalid suggestion coordinates
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            console.warn('[Home] Invalid suggestion coordinates:', place);
            return;
        }
        const point = {
            lat,
            lng,
            address: place.display_name
        }

        if (activeInput === 'drop') {
            setDrop(point)
            setDropInput(place.display_name)
            // Instead of closing, we might want to confirm on map
            // But let's keep it simple: selecting from list is fast, 
            // "Continue" button will trigger map fine-tune
        } else {
            setPickup(point)
            setPickupInput(place.display_name)
            setActiveInput('drop')
        }
        setMapCenter(point)
        setSuggestions([])
    }

    const handleMapIdle = useCallback(() => {
        if (!isPickingOnMap || !mapCenter) return;
        // Guard: don't geocode if center coords are invalid
        if (!Number.isFinite(mapCenter.lat) || !Number.isFinite(mapCenter.lng)) return;

        setIsGeocoding(true)
        fetch(`http://localhost:3000/maps/reverse-geocode?lat=${mapCenter.lat}&lon=${mapCenter.lng}&format=json&addressdetails=1`)
            .then(res => {
                // Guard: check that response is JSON, not XML/HTML error page
                const contentType = res.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) {
                    throw new Error(`Unexpected response type: ${contentType}`);
                }
                return res.json();
            })
            .then(data => {
                setTempPoint({
                    lat: mapCenter.lat,
                    lng: mapCenter.lng,
                    address: data.display_name || "Vị trí trên bản đồ"
                })
            })
            .catch(err => {
                console.error("Map idle geocode error:", err)
            })
            .finally(() => {
                setIsGeocoding(false)
            })
    }, [isPickingOnMap, mapCenter])

    const handleConfirmMapPick = () => {
        if (!tempPoint) return;

        if (activeInput === 'drop') {
            setDrop(tempPoint)
            setDropInput(tempPoint.address)
            setIsPickingOnMap(false)
            setIsSearching(false)
            // Final confirmation complete, go to options
            navigate('/ride-options')
        } else {
            setPickup(tempPoint)
            setPickupInput(tempPoint.address)
            setIsPickingOnMap(false)
            // After picking pickup, go to search for dropoff
            setActiveInput('drop')
            setIsSearching(true)
        }
        setTempPoint(null)
    }

    return (
        <div className="relative h-full w-full bg-gray-50 flex flex-col overflow-hidden">
            {/* Map stays in background */}
            <div className="absolute inset-0 z-0">
                <Map
                    center={mapCenter}
                    onCenterChanged={isPickingOnMap ? setMapCenter : undefined}
                    onIdle={isPickingOnMap ? handleMapIdle : undefined}
                    showCenterPin={isPickingOnMap}
                    markers={!isPickingOnMap && pickup ? [{ lat: pickup.lat, lng: pickup.lng, icon: 'pickup' }] : []}
                />
            </div>

            {/* Picking on Map State Overlay */}
            {isPickingOnMap && (
                <>
                    <div className="absolute top-4 left-4 z-[1100]">
                        <button
                            onClick={() => setIsPickingOnMap(false)}
                            className="bg-white p-3 rounded-full shadow-xl hover:bg-gray-100 transition-all border border-gray-100"
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="absolute bottom-8 left-4 right-4 z-[1100] space-y-4">
                        <div className="bg-white rounded-2xl p-4 shadow-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex items-start space-x-3 mb-4">
                                <div className="p-2 bg-blue-50 rounded-lg">
                                    <MapPin className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                        {activeInput === 'drop' ? "Điểm đến" : "Điểm đón"}
                                    </p>
                                    <p className="text-sm font-bold text-gray-900 truncate">
                                        {isGeocoding ? "Đang định vị..." : (tempPoint?.address || "Di chuyển bản đồ để chọn")}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleConfirmMapPick}
                                disabled={!tempPoint || isGeocoding}
                                className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center space-x-2 disabled:bg-gray-200 disabled:text-gray-400 transition-all"
                            >
                                <Check className="h-5 w-5" />
                                <span>Xác nhận vị trí này</span>
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Normal State: Where to? */}
            {!isSearching && !isPickingOnMap && (
                <div className="absolute bottom-4 left-4 right-4 z-[1000] rounded-3xl bg-white p-6 shadow-2xl border border-gray-100">
                    <div className="w-12 h-1.5 bg-gray-100 rounded-full mx-auto mb-4"></div>
                    <h2 className="mb-4 text-xl font-black text-gray-900">Chào {user?.name || "bạn"} {pickup ? "" : "✌️"}</h2>

                    <div
                        onClick={() => setIsSearching(true)}
                        className="flex items-center rounded-2xl bg-gray-50 p-4 shadow-inner hover:bg-gray-100 transition-all cursor-pointer group border border-gray-100 overflow-hidden"
                    >
                        <Search className="mr-3 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-primary transition-colors" />
                        <span className="text-gray-400 font-bold truncate">Bạn muốn đi đâu?</span>
                    </div>

                    <div className="mt-6 flex items-center space-x-3">
                        <div className="flex-1 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 flex items-center space-x-3 min-w-0">
                            <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0"><Navigation className="h-4 w-4 text-primary" /></div>
                            <div className="flex-1 min-w-0 overflow-hidden text-ellipsis">
                                <p className="text-[10px] font-black text-primary/50 uppercase tracking-widest truncate">Điểm đón hiện tại</p>
                                <p className="text-xs font-bold text-gray-600 truncate block w-full">{pickup?.address || "Đang định vị..."}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleOpenMapPick('pickup')}
                            className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 text-gray-400 flex-shrink-0"
                            title="Thay đổi điểm đón trên bản đồ"
                        >
                            <MousePointer2 className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}

            {/* Search State: Fullscreen Address Input */}
            {isSearching && !isPickingOnMap && (
                <div className="absolute inset-0 z-[1100] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
                    <div className="p-4 border-b">
                        <div className="flex items-center space-x-4">
                            <button onClick={() => setIsSearching(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <ArrowLeft className="h-6 w-6" />
                            </button>
                            <h2 className="text-lg font-black text-gray-900">Lên kế hoạch chuyến đi</h2>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="relative flex items-center space-x-3">
                            <div className="flex flex-col items-center gap-1">
                                <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                                <div className="h-10 w-0.5 bg-gray-100"></div>
                            </div>
                            <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100 focus-within:border-primary focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-50 transition-all">
                                <div className="flex justify-between items-start">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Điểm đón</p>
                                    <button onClick={() => handleOpenMapPick('pickup')} className="text-[10px] text-primary font-bold hover:underline">Ghim bản đồ</button>
                                </div>
                                <input
                                    type="text"
                                    value={pickupInput}
                                    onChange={(e) => setPickupInput(e.target.value)}
                                    onFocus={() => setActiveInput('pickup')}
                                    placeholder="Vị trí đón của bạn"
                                    className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300"
                                />
                            </div>
                        </div>

                        <div className="relative flex items-center space-x-3">
                            <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]"></div>
                            <div className="flex-1 bg-gray-50 rounded-xl p-3 border border-gray-100 focus-within:border-primary focus-within:bg-white focus-within:shadow-lg focus-within:shadow-blue-50 transition-all">
                                <div className="flex justify-between items-start">
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Điểm đến</p>
                                    <button onClick={() => handleOpenMapPick('drop')} className="text-[10px] text-primary font-bold hover:underline">Ghim bản đồ</button>
                                </div>
                                <input
                                    type="text"
                                    value={dropInput}
                                    onChange={(e) => setDropInput(e.target.value)}
                                    onFocus={() => setActiveInput('drop')}
                                    placeholder="Bạn muốn đi đâu?"
                                    className="w-full bg-transparent text-sm font-bold text-gray-900 outline-none placeholder:text-gray-300"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleConfirmAddresses}
                            disabled={!pickup || !drop}
                            className="w-full mt-6 bg-primary text-white py-4 rounded-2xl font-black shadow-xl shadow-blue-200 disabled:bg-gray-100 disabled:text-gray-300 disabled:shadow-none transition-all active:scale-[0.98]"
                        >
                            Tiếp tục
                        </button>
                    </div>

                    <div className="flex-1 bg-gray-50/50 p-6 overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                {isLoadingSearch ? "Đang tìm kiếm..." : (suggestions.length > 0 ? "Kết quả tìm kiếm" : "Gợi ý cho bạn")}
                            </p>
                        </div>

                        <div className="space-y-3">
                            <div
                                onClick={() => handleOpenMapPick(activeInput)}
                                className="flex items-center space-x-3 p-4 cursor-pointer bg-white hover:bg-blue-50 rounded-2xl transition-all border border-gray-100 shadow-sm group"
                            >
                                <div className="p-2 bg-blue-50 group-hover:bg-primary transition-colors rounded-xl">
                                    <MousePointer2 className="h-5 w-5 text-primary group-hover:text-white" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-primary">Chọn trên bản đồ</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kéo thả ghim chính xác</p>
                                </div>
                            </div>

                            {suggestions.map((place, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => handleSelectSuggestion(place)}
                                    className="flex items-start space-x-3 p-4 cursor-pointer bg-white hover:bg-blue-50/50 rounded-2xl transition-all border border-gray-100 shadow-sm group"
                                >
                                    <div className="p-2 bg-gray-50 group-hover:bg-white rounded-xl transition-colors shadow-inner">
                                        <MapPin className="h-5 w-5 text-gray-400 group-hover:text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-black truncate text-gray-900">{formatAddressTitle(place.display_name)}</p>
                                        <p className="text-[11px] font-medium text-gray-400 truncate">{formatAddressSubtitle(place.display_name)}</p>
                                    </div>
                                </div>
                            ))}

                            {suggestions.length === 0 && !isLoadingSearch && (
                                <div className="space-y-3">
                                    <div
                                        onClick={() => {
                                            if (location.coordinates) {
                                                handleSelectSuggestion({
                                                    display_name: pickup?.address || "Vị trí của bạn",
                                                    lat: location.coordinates.lat.toString(),
                                                    lon: location.coordinates.lng.toString()
                                                });
                                            }
                                        }}
                                        className="flex items-center space-x-3 p-4 cursor-pointer bg-white hover:bg-blue-50/50 rounded-2xl transition-all border border-gray-100 shadow-sm group"
                                    >
                                        <div className="p-2 bg-blue-50 rounded-xl">
                                            <Navigation className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900">Vị trí hiện tại</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Độ chính xác cao</p>
                                        </div>
                                    </div>

                                    <div className="pt-2 px-1">
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Địa danh nổi bật</p>
                                    </div>

                                    <div
                                        onClick={() => {
                                            const place = { display_name: "Landmark 81, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, Thành phố Hồ Chí Minh", lat: "10.7948", lon: "106.7218" };
                                            handleSelectSuggestion(place);
                                        }}
                                        className="flex items-center space-x-3 p-4 cursor-pointer bg-white hover:bg-blue-50/50 rounded-2xl transition-all border border-gray-100 shadow-sm"
                                    >
                                        <div className="p-2 bg-gray-50 rounded-xl shadow-inner"><MapPin className="h-5 w-5 text-gray-400" /></div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900">Landmark 81</p>
                                            <p className="text-[11px] font-medium text-gray-400">Bình Thạnh, Hồ Chí Minh</p>
                                        </div>
                                    </div>
                                    <div
                                        onClick={() => {
                                            const place = { display_name: "Chợ Bến Thành, Đường Lê Lợi, Phường Bến Thành, Quận 1, Thành phố Hồ Chí Minh", lat: "10.7719", lon: "106.6983" };
                                            handleSelectSuggestion(place);
                                        }}
                                        className="flex items-center space-x-3 p-4 cursor-pointer bg-white hover:bg-blue-50/50 rounded-2xl transition-all border border-gray-100 shadow-sm"
                                    >
                                        <div className="p-2 bg-gray-50 rounded-xl shadow-inner"><MapPin className="h-5 w-5 text-gray-400" /></div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900">Chợ Bến Thành</p>
                                            <p className="text-[11px] font-medium text-gray-400">Quận 1, Hồ Chí Minh</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
