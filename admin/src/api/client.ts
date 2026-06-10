import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
});

export function setAdminToken(token: string) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export default api;
