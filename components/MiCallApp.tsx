import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import LocationSharing from './LocationSharing';
import MiCallAuth from './MiCallAuth';
import ErrorBoundary from './ErrorBoundary';
import { env } from '../config/environment';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: env.NODE_ENV === 'production',
      refetchOnWindowFocus: env.NODE_ENV === 'production',
    },
  },
});

const MiCallApp: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleAuthSuccess = (address: string) => {
    setIsAuthenticated(true);
    // You might want to store the token in localStorage here
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-md mx-auto p-4 space-y-6">
            <h1 className="text-2xl font-bold text-center mb-6">
              MiCall Emergency Response
            </h1>
            
            {!isAuthenticated ? (
              <MiCallAuth onAuthSuccess={handleAuthSuccess} />
            ) : (
              <LocationSharing />
            )}
          </div>
        </div>
      </ErrorBoundary>
      <Toaster />
    </QueryClientProvider>
  );
};

export default MiCallApp; 