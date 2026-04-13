import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import RideNavigationPage from '@/pages/RideNavigationPage'
import TripCompletionPage from '@/pages/TripCompletionPage'
import EarningsPage from '@/pages/EarningsPage'
import ProfilePage from '@/pages/ProfilePage'
import RatingPage from '@/pages/RatingPage'

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuthStore()
    if (!isAuthenticated) return <Navigate to="/login" replace />
    return <>{children}</>
}

// Public route (redirect if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
    const { isAuthenticated } = useAuthStore()
    if (isAuthenticated) return <Navigate to="/dashboard" replace />
    return <>{children}</>
}

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
    },
    {
        path: '/login',
        element: (
            <PublicRoute>
                <LoginPage />
            </PublicRoute>
        ),
    },
    {
        path: '/register',
        element: (
            <PublicRoute>
                <RegisterPage />
            </PublicRoute>
        ),
    },
    {
        path: '/dashboard',
        element: (
            <ProtectedRoute>
                <DashboardPage />
            </ProtectedRoute>
        ),
    },
    {
        path: '/ride/:rideId',
        element: (
            <ProtectedRoute>
                <RideNavigationPage />
            </ProtectedRoute>
        ),
    },
    {
        path: '/completion/:rideId',
        element: (
            <ProtectedRoute>
                <TripCompletionPage />
            </ProtectedRoute>
        ),
    },
    {
        path: '/rating/:rideId',
        element: (
            <ProtectedRoute>
                <RatingPage />
            </ProtectedRoute>
        ),
    },
    {
        path: '/earnings',
        element: (
            <ProtectedRoute>
                <EarningsPage />
            </ProtectedRoute>
        ),
    },
    {
        path: '/profile',
        element: (
            <ProtectedRoute>
                <ProfilePage />
            </ProtectedRoute>
        ),
    },
    {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
    },
])
