import axiosClient from './axiosClient';

export const rideApi = {
    getById: async (id: string) => {
        const response = await axiosClient.get(`/rides/${id}`);
        return response.data;
    }
};
