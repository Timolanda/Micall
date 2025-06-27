'use client';

import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';

export default function BottomNavWrapper() {
  const pathname = usePathname();
  
  // Hide BottomNav on landing page and auth pages
  const hideBottomNav = pathname === '/landing' || 
                       pathname.startsWith('/signin') || 
                       pathname.startsWith('/signup');

  if (hideBottomNav) {
    return null;
  }

  return <BottomNav />;
} 