import axiosClient from './axiosClient';

export const driverApi = {
    getDriverProfile: async (id: string) => {
        const response = await axiosClient.get(`/drivers/${id}`);
        return response.data;
    }
};
