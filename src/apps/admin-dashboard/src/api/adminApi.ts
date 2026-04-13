import adminApiClient from './adminApiClient';

export const adminApi = {
    // List all users globally across all services
    getDriversList: async (status?: string) => {
        const query = status && status !== 'ALL' ? `?status=${status}` : '';
        const response = await adminApiClient.get(`/auth/admin/drivers${query}`);
        return response.data;
    },

    updateDriverStatus: async (id: string, status: 'ACTIVE' | 'REJECTED' | 'SUSPENDED', reason?: string) => {
        const response = await adminApiClient.patch(`/auth/admin/drivers/${id}/status`, {
            status,
            reason
        });
        return response.data;
    }
};
