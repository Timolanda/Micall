import { useState, useCallback } from 'react';
import axios from 'axios';
import { useQuery, useMutation } from '@tanstack/react-query';
import { env } from '../config/environment';

interface AuthState {
  isAuthenticated: boolean;
  walletAddress: string | null;
  token: string | null;
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${env.API_URL}/login`, { email, password });
      setUser(response.data.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return { user, loading, error, login, logout };
} 