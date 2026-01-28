import './globals.css';
import 'leaflet/dist/leaflet.css';
import type { Metadata, Viewport } from 'next';
import BottomNavWrapper from '../components/BottomNavWrapper';
import PWAInstallPrompt from '../components/PWAInstallPrompt';
import PermissionRequestModal from '../components/PermissionRequestModal';
import ServiceWorkerRegistration from '../components/ServiceWorkerRegistration';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'MiCall - Emergency Response Platform',
  description: 'Emergency Response in Your Hands - Connecting victims with responders in real-time',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MiCall',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192' },
      { url: '/icons/icon-512.png', sizes: '512x512' },
    ],
  },
  formatDetection: {
    telephone: true,
    email: false,
    address: true,
  },
  keywords: [
    'emergency',
    'emergency response',
    'SOS',
    'safety',
    'responder',
    'ambulance',
    'police',
    'fire',
  ],
  authors: [{ name: 'MiCall' }],
  creator: 'MiCall',
  openGraph: {
    type: 'website',
    url: 'https://micall.app',
    title: 'MiCall - Emergency Response Platform',
    description: 'Emergency Response in Your Hands',
    siteName: 'MiCall',
    images: [
      {
        url: '/icons/icon-512.png',
        width: 512,
        height: 512,
        alt: 'MiCall App Icon',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MiCall',
    description: 'Emergency Response in Your Hands',
    images: ['/icons/icon-512.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#dc2626',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MiCall" />
        
        {/* Theme Colors */}
        <meta name="theme-color" content="#dc2626" />
        <meta name="msapplication-TileColor" content="#dc2626" />
        
        {/* Splash Screens for iOS */}
        <link rel="apple-touch-startup-image" href="/icons/splash-192.png" media="(device-width: 320px)" />
        
        {/* Startup Images */}
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        
        {/* Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Service Worker Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator && 'PushManager' in window) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
                    .then(reg => console.log('Service Worker registered'))
                    .catch(err => console.log('Service Worker registration failed:', err));
                });
              }
            `,
          }}
        />
      </head>
      <body className="bg-background text-accent min-h-screen flex flex-col">
        {/* Service Worker Registration */}
        <ServiceWorkerRegistration />
        
        {/* PWA Install Prompt */}
        <PWAInstallPrompt />
        
        {/* Notification Permission Modal */}
        <PermissionRequestModal />
        
        <main className="flex-1 flex flex-col">{children}</main>
        <BottomNavWrapper />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
} 