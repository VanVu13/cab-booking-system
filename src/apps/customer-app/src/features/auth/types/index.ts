import { z } from 'zod'

export const LoginSchema = z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự'),
})

export const RegisterSchema = z.object({
    name: z.string().min(2, 'Tên phải từ 2 ký tự',),
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự'),
    confirmPassword: z.string().min(6, 'Mật khẩu xác nhận phải từ 6 ký tự'),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không khớp",
    path: ["confirmPassword"],
})

export type LoginPayload = z.infer<typeof LoginSchema>
export type RegisterPayload = z.infer<typeof RegisterSchema>

export interface AuthResponse {
    user: {
        id: string
        email: string
        name: string | null
        role: 'PASSENGER' | 'DRIVER' | 'ADMIN'
    }
    accessToken: string
    refreshToken: string
}
