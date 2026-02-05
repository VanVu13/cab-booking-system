import api from './api';

export const rideService = {
  bookRide: (data) => api.post('/rides/book', data),
  getRideHistory: () => api.get('/rides/history'),
  getRideDetails: (id) => api.get(`/rides/${id}`),
  cancelRide: (id) => api.post(`/rides/${id}/cancel`),
};