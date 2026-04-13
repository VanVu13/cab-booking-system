import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
    return (
        <div className="flex h-full w-full items-center justify-center bg-muted p-4 overflow-y-auto">
            <div className="w-full max-w-sm space-y-8 rounded-lg bg-white p-6 shadow-lg my-auto">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-primary">CAB Booking</h1>
                    <p className="text-sm text-gray-500">Welcome back!</p>
                </div>
                <Outlet />
            </div>
        </div>
    )
}
