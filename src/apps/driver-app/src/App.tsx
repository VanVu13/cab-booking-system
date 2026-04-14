import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/routes'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { useState, useEffect } from 'react'
import { useInitAuth } from '@/hooks/useInitAuth'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
})

// Status bar with real time
function StatusBar() {
    const [time, setTime] = useState('')

    useEffect(() => {
        const update = () => {
            const now = new Date()
            setTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }))
        }
        update()
        const interval = setInterval(update, 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="hidden md:flex items-center justify-between px-7 py-2 text-black z-40 flex-shrink-0" style={{ fontSize: '13px', fontWeight: 600 }}>
            <span>{time}</span>
            <div className="flex items-center gap-1.5">
                {/* Signal bars */}
                <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
                    <rect x="0" y="9" width="3" height="3" rx="0.5" opacity="1" />
                    <rect x="4.5" y="6" width="3" height="6" rx="0.5" opacity="1" />
                    <rect x="9" y="3" width="3" height="9" rx="0.5" opacity="1" />
                    <rect x="13.5" y="0" width="3" height="12" rx="0.5" opacity="0.3" />
                </svg>
                {/* WiFi icon */}
                <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
                    <path d="M8 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
                    <path d="M8 6.5C9.9 6.5 11.6 7.3 12.8 8.6l1.4-1.4A9 9 0 0 0 8 4.5a9 9 0 0 0-6.2 2.7l1.4 1.4C4.4 7.3 6.1 6.5 8 6.5z" opacity="0.7" />
                    <path d="M8 3.5c2.8 0 5.3 1.1 7.1 3l1.4-1.4A11.9 11.9 0 0 0 8 1.5 11.9 11.9 0 0 0-.5 5.1L.9 6.5A9.9 9.9 0 0 1 8 3.5z" opacity="0.4" />
                </svg>
                {/* Battery */}
                <div className="flex items-center gap-0.5">
                    <div className="relative w-6 h-3 rounded-sm border border-black" style={{ borderWidth: '1.5px' }}>
                        <div className="absolute inset-[1px] rounded-[1px] bg-black" style={{ width: '75%' }} />
                    </div>
                    <div className="w-0.5 h-1.5 bg-black rounded-r-sm opacity-50" />
                </div>
            </div>
        </div>
    )
}

// Phone Frame – only shows on desktop (md+)
// PHONE_H = 844px (iPhone 14). Scale down to fit any viewport height.
const PHONE_H = 844

function usePhoneScale() {
    const [scale, setScale] = useState(1)
    useEffect(() => {
        const calc = () => {
            // 32px vertical padding (16px top + 16px bottom)
            const s = Math.min(1, (window.innerHeight - 32) / PHONE_H)
            setScale(s)
        }
        calc()
        window.addEventListener('resize', calc)
        return () => window.removeEventListener('resize', calc)
    }, [])
    return scale
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
    const scale = usePhoneScale()
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
        <>
            {isMobile ? (
                <div className="w-full h-[100dvh] bg-slate-50 relative overflow-hidden flex flex-col">
                    {children}
                    <ToastContainer
                        position="top-center"
                        autoClose={1500}
                        hideProgressBar={false}
                        closeOnClick
                        pauseOnHover
                        draggable
                        theme="light"
                    />
                </div>
            ) : (
                <div className="flex h-screen items-center justify-center overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #0a2e1a 0%, #1a5c32 40%, #0d3d22 100%)' }}
                >
                    <div
                        className="relative"
                        style={{
                            transform: `scale(${scale})`,
                            transformOrigin: 'center center',
                        }}
                    >
                        {/* Side buttons left: Volume */}
                        <div className="absolute -left-[10px] top-24 w-[6px] h-10 bg-gray-700 rounded-l-md shadow-inner" />
                        <div className="absolute -left-[10px] top-40 w-[6px] h-14 bg-gray-700 rounded-l-md shadow-inner" />
                        <div className="absolute -left-[10px] top-60 w-[6px] h-14 bg-gray-700 rounded-l-md shadow-inner" />
                        {/* Side button right: Power */}
                        <div className="absolute -right-[10px] top-36 w-[6px] h-16 bg-gray-700 rounded-r-md shadow-inner" />

                        {/* Phone body */}
                        <div
                            className="relative overflow-hidden flex flex-col"
                            style={{
                                width: '450px',
                                height: '844px',
                                borderRadius: '50px',
                                background: '#f8fafc',
                                border: '10px solid #1a1a1a',
                                boxShadow: '0 0 0 1px #333, 0 40px 100px rgba(0,0,0,0.6), inset 0 0 0 1px #444',
                            }}
                        >
                            {/* Inner bezel highlight */}
                            <div
                                className="absolute inset-0 pointer-events-none z-10"
                                style={{ borderRadius: '42px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)' }}
                            />

                            {/* Dynamic Island */}
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
                                <div
                                    style={{
                                        width: '120px',
                                        height: '34px',
                                        background: '#000',
                                        borderRadius: '20px',
                                    }}
                                />
                            </div>

                            {/* Status Bar */}
                            <StatusBar />

                            {/* App content */}
                            <div className="flex-1 overflow-hidden relative">
                                {children}
                                <ToastContainer
                                    position="top-center"
                                    autoClose={1500}
                                    hideProgressBar={false}
                                    closeOnClick
                                    pauseOnHover
                                    draggable
                                    theme="light"
                                />
                            </div>

                            {/* Home Indicator */}
                            <div className="flex justify-center items-center pb-2 pt-1 bg-slate-50 flex-shrink-0">
                                <div className="w-32 h-1 bg-black rounded-full opacity-20" />
                            </div>
                        </div>
                    </div>
                </div>
            )}


        </>
    )
}

function App() {
    // Proactively validate/refresh token on app startup
    useInitAuth()

    return (
        <QueryClientProvider client={queryClient}>
            <PhoneFrame>
                <RouterProvider router={router} />
            </PhoneFrame>
        </QueryClientProvider>
    )
}

export default App
