'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaHome, FaUser, FaCog, FaShieldAlt } from 'react-icons/fa';

export const BOTTOM_NAV_HEIGHT = 64; // px (h-16)

const navItems = [
  { href: '/', label: 'Home', icon: FaHome },
  { href: '/live', label: 'Respond', icon: FaShieldAlt },
  { href: '/profile', label: 'Profile', icon: FaUser },
  { href: '/settings', label: 'Settings', icon: FaCog },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="
        fixed bottom-0 left-0 right-0
        h-16
        bg-black
        border-t border-white/10
        flex justify-around items-center
        z-[100]
      "
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive =
          pathname === href ||
          (href !== '/' && pathname.startsWith(href));

        return (
          <Link
            key={href}
            href={href}
            className={`
              flex flex-col items-center justify-center
              transition-colors
              ${
                isActive
                  ? 'text-red-500'
                  : 'text-white/70 hover:text-white'
              }
            `}
          >
            <Icon className="text-xl mb-0.5" />
            <span className="text-[11px] leading-none">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
