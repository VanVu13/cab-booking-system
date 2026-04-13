import axiosClient from './axiosClient';
import { UserProfile, UpdateProfileRequest } from '../types/user';

export const userApi = {
    getProfile: async (): Promise<UserProfile> => {
        // User Service handles both roles at /users/profile
        const response = await axiosClient.get('/users/profile');
        return response.data;
    },

    updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
        const response = await axiosClient.patch('/users/profile', data);
        return response.data;
    },

    uploadAvatar: async (file: File): Promise<string> => {
        // Placeholder for real upload. For now, we assume direct URL update or handle elsewhere.
        // If we had an upload service:
        // const formData = new FormData();
        // formData.append('file', file);
        // const response = await axiosClient.post('/upload', formData);
        // return response.data.url;
        throw new Error('Upload not implemented');
    }
};
