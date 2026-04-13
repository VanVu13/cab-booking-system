import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from '@/components/common/BottomNav'

export default function MainLayout() {
    const location = useLocation()
    // Hide BottomNav on booking flow pages to give more space
    const hideNav = location.pathname.includes('/ride-options') ||
        location.pathname.includes('/tracking') ||
        location.pathname.includes('/payment') ||
        location.pathname.includes('/rating')

    return (
        <div className="relative h-full w-full overflow-hidden bg-background font-sans text-foreground flex flex-col">
            <main className="flex-1 w-full overflow-hidden relative">
                <Outlet />
            </main>
            {!hideNav && <BottomNav />}
        </div>
    )
}
