import { Home, Clock, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'

export default function BottomNav() {
    const navClass = ({ isActive }: { isActive: boolean }) =>
        `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`

    return (
        <div className="h-16 bg-white border-t flex items-center justify-around px-2 pb-safe z-50 shrink-0">
            <NavLink to="/" className={navClass} end>
                <Home className="h-6 w-6" />
                <span className="text-[10px] font-medium">Trang chủ</span>
            </NavLink>
            <NavLink to="/history" className={navClass}>
                <Clock className="h-6 w-6" />
                <span className="text-[10px] font-medium">Hoạt động</span>
            </NavLink>
            <NavLink to="/profile" className={navClass}>
                <User className="h-6 w-6" />
                <span className="text-[10px] font-medium">Tài khoản</span>
            </NavLink>
        </div>
    )
}
