import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoginSchema, LoginPayload } from '@/features/auth/types'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { Loader2 } from 'lucide-react'

export default function Login() {
    const { register, handleSubmit, formState: { errors } } = useForm<LoginPayload>({
        resolver: zodResolver(LoginSchema)
    })

    const { mutate: login, isPending } = useLogin()

    const onSubmit = (data: LoginPayload) => {
        login(data)
    }

    return (
        <div className='w-full'>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                        type="email"
                        {...register('email')}
                        className="mt-1 w-full rounded border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="email@example.com"
                    />
                    {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Mật khẩu</label>
                    <input
                        type="password"
                        {...register('password')}
                        className="mt-1 w-full rounded border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="******"
                    />
                    {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="flex w-full items-center justify-center rounded bg-primary py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Đăng nhập
                </button>
            </form>
            <div className="mt-4 text-center text-sm">
                Chưa có tài khoản? <Link to="/auth/register" className="font-medium text-primary hover:text-blue-700">Đăng ký ngay</Link>
            </div>
        </div>
    )
}
