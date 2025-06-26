import './globals.css';
import 'leaflet/dist/leaflet.css';
import BottomNav from '../components/BottomNav';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-accent min-h-screen flex flex-col">
        <main className="flex-1 flex flex-col">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
} 