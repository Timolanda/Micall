import React, { useEffect, Suspense } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useAuth } from './hooks/useAuth';
import BottomNav from './components/BottomNav';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages
const Splash = React.lazy(() => import('./pages/Splash'));
const EmergencyActivation = React.lazy(() => import('./pages/EmergencyActivation'));
const EmergencyHistory = React.lazy(() => import('./pages/EmergencyHistory'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Settings = React.lazy(() => import('./pages/Settings'));

// Initialize QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Hide BottomNav on Splash screen
  const showBottomNav = isAuthenticated && location.pathname !== '/splash';

  // Protected Route wrapper
  const ProtectedRoute = ({ children }) => {
    if (isLoading) return <LoadingScreen />;
    if (!isAuthenticated) return <Navigate to="/splash" replace />;
    return children;
  };

  // Handle PWA installation
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => console.log('SW registered:', registration))
          .catch(error => console.log('SW registration failed:', error));
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <div className="min-h-screen bg-background text-foreground">
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Public routes */}
              <Route 
                path="/splash" 
                element={
                  isAuthenticated ? <Navigate to="/" replace /> : <Splash />
                } 
              />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <EmergencyActivation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <EmergencyHistory />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>

          {/* Bottom Navigation */}
          {showBottomNav && <BottomNav />}

          {/* Toast notifications */}
          <Toaster 
            position="top-center"
            expand={false}
            richColors
          />
        </div>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App; 