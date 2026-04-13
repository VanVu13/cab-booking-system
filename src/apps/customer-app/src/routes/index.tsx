import { createBrowserRouter, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'

// Layouts
import MainLayout from '@/layouts/MainLayout'
import AuthLayout from '@/layouts/AuthLayout'
import LoadingSpinner from '@/components/common/LoadingSpinner'

// Lazy Pages
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const Home = lazy(() => import('@/pages/Home'))
const RideOptions = lazy(() => import('@/pages/RideOptions'))
const RideTracking = lazy(() => import('@/pages/RideTracking'))
const Rating = lazy(() => import('@/pages/Rating'))
const Profile = lazy(() => import('@/pages/Profile'))
const History = lazy(() => import('@/pages/History'))
const RideDetails = lazy(() => import('@/pages/RideDetails'))
import ProtectedRouteWrapper from './ProtectedRouteWrapper'

// ... (imports remain)

export const router = createBrowserRouter([
    {
        path: '/auth',
        element: <AuthLayout />,
        children: [
            { path: 'login', element: <Suspense fallback={<LoadingSpinner />}><Login /></Suspense> },
            { path: 'register', element: <Suspense fallback={<LoadingSpinner />}><Register /></Suspense> },
            { index: true, element: <Navigate to="login" /> }
        ]
    },
    {
        path: '/',
        element: <ProtectedRouteWrapper />, // Wrap with auth check
        children: [
            {
                element: <MainLayout />,
                children: [
                    { index: true, element: <Suspense fallback={<LoadingSpinner />}><Home /></Suspense> },
                    { path: 'ride-options', element: <Suspense fallback={<LoadingSpinner />}><RideOptions /></Suspense> },
                    { path: 'tracking/:rideId', element: <Suspense fallback={<LoadingSpinner />}><RideTracking /></Suspense> },
                    { path: 'rating/:rideId', element: <Suspense fallback={<LoadingSpinner />}><Rating /></Suspense> },
                    { path: 'profile', element: <Suspense fallback={<LoadingSpinner />}><Profile /></Suspense> },
                    { path: 'history', element: <Suspense fallback={<LoadingSpinner />}><History /></Suspense> },
                    { path: 'history/:rideId', element: <Suspense fallback={<LoadingSpinner />}><RideDetails /></Suspense> },
                ]
            }
        ]
    },
    {
        path: '*',
        element: <Navigate to="/" />
    }
])
