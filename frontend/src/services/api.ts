import axios from 'axios';
import { User, Alias, CreateAliasRequest } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

let getTokenFn: (() => Promise<string | null>) | null = null;

export const setClerkGetToken = (fn: () => Promise<string | null>) => {
  getTokenFn = fn;
};

api.interceptors.request.use(async (config) => {
  if (getTokenFn) {
    const token = await getTokenFn();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/sign-in';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  me: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const aliasApi = {
  getAliases: async (): Promise<{ aliases: Alias[] }> => {
    const response = await api.get('/aliases');
    return response.data;
  },

  createAlias: async (data: CreateAliasRequest): Promise<{ alias: Alias }> => {
    const response = await api.post('/aliases', data);
    return response.data;
  },

  updateAliasStatus: async (aliasId: string, status: string): Promise<void> => {
    await api.patch(`/aliases/${aliasId}/status`, { status });
  },

  deleteAlias: async (aliasId: string): Promise<void> => {
    await api.delete(`/aliases/${aliasId}`);
  },
};

export default api;