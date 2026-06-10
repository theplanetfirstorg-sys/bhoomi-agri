import axios, { AxiosError } from 'axios';
import { useAuthStore } from '../hooks/useAuth';

// In production (Railway), VITE_API_URL points to the backend service URL.
// In dev, Vite proxies /api → localhost:3001.
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshPromise) {
        const refreshToken = useAuthStore.getState().refreshToken;
        refreshPromise = axios
          .post(`${BASE_URL}/auth/refresh`, { refreshToken })
          .then((res) => {
            const { accessToken, refreshToken: newRefresh } = res.data as {
              accessToken: string;
              refreshToken: string;
            };
            useAuthStore.getState().setTokens(accessToken, newRefresh);
            return accessToken;
          })
          .catch(() => {
            useAuthStore.getState().logout();
            return Promise.reject(error);
          })
          .finally(() => { refreshPromise = null; });
      }

      const newToken = await refreshPromise;
      original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
      return api(original);
    }

    return Promise.reject(error);
  }
);

export default api;
