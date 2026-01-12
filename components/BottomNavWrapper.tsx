'use client';

import { usePathname } from 'next/navigation';
import BottomNav, { BOTTOM_NAV_HEIGHT } from './BottomNav';

export default function BottomNavWrapper() {
  const pathname = usePathname();

  // Hide BottomNav on landing & auth pages
  const hideBottomNav =
    pathname === '/landing' ||
    pathname.startsWith('/signin') ||
    pathname.startsWith('/signup');

  if (hideBottomNav) return null;

  return (
    <>
      {/* Bottom padding applied globally so content never hides behind nav */}
      <div
        id="bottom-nav-safe-area"
        style={{ paddingBottom: BOTTOM_NAV_HEIGHT }}
        className="pointer-events-none"
      />

      <BottomNav />
    </>
  );
}
