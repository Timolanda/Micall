import Link from 'next/link';
import { FaHome, FaUser, FaCog, FaShieldAlt } from 'react-icons/fa';

const navItems = [
  { href: '/', label: 'Home', icon: <FaHome /> },
  { href: '/live', label: 'Respond', icon: <FaShieldAlt /> },
  { href: '/profile', label: 'Profile', icon: <FaUser /> },
  { href: '/settings', label: 'Settings', icon: <FaCog /> },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-zinc-800 flex justify-around items-center h-16 z-50">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex flex-col items-center text-accent hover:text-primary transition-colors"
        >
          <span className="text-xl mb-1">{item.icon}</span>
          <span className="text-xs">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
} 