import './globals.css';
import 'leaflet/dist/leaflet.css';
import BottomNavWrapper from '../components/BottomNavWrapper';
import { Toaster } from 'sonner';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-accent min-h-screen flex flex-col">
        <main className="flex-1 flex flex-col">{children}</main>
        <BottomNavWrapper />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
} 