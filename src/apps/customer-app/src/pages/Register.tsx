import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { RegisterSchema, RegisterPayload } from '@/features/auth/types'
import { useRegister } from '@/features/auth/hooks/useRegister'
import { Loader2 } from 'lucide-react'

export default function Register() {
    const { register, handleSubmit, formState: { errors } } = useForm<RegisterPayload>({
        resolver: zodResolver(RegisterSchema)
    })

    const { mutate: performRegister, isPending } = useRegister()

    const onSubmit = (data: RegisterPayload) => {
        performRegister(data)
    }

    return (
        <div className='w-full'>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Họ và tên</label>
                    <input
                        type="text"
                        {...register('name')}
                        className="mt-1 w-full rounded border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Nguyễn Văn A"
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message as string}</p>}
                </div>
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
                        placeholder="****** (ít nhất 6 ký tự)"
                    />
                    {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Xác nhận mật khẩu</label>
                    <input
                        type="password"
                        {...register('confirmPassword')}
                        className="mt-1 w-full rounded border border-gray-300 p-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Nhập lại mật khẩu"
                    />
                    {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword.message}</p>}
                </div>

                <button
                    type="submit"
                    disabled={isPending}
                    className="flex w-full items-center justify-center rounded bg-primary py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Đăng ký
                </button>
            </form>
            <div className="mt-4 text-center text-sm">
                Đã có tài khoản? <Link to="/auth/login" className="font-medium text-primary hover:text-blue-700">Đăng nhập</Link>
            </div>
        </div>
    )
}
