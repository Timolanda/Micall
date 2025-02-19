import React from "react";
import { NavLink } from "react-router-dom";
import { Home, User, Settings, Bell, Shield } from "lucide-react";

const BottomNav = () => {
  const navItems = [
    {
      to: "/",
      icon: <Home className="h-6 w-6" />,
      label: "Home",
      badge: null
    },
    {
      to: "/alerts",
      icon: <Bell className="h-6 w-6" />,
      label: "Alerts",
      badge: 2 // Dynamic badge count from your state management
    },
    {
      to: "/emergency",
      icon: <Shield className="h-6 w-6" />,
      label: "Emergency",
      className: "bg-destructive text-destructive-foreground rounded-full p-4 -mt-8 shadow-lg"
    },
    {
      to: "/profile",
      icon: <User className="h-6 w-6" />,
      label: "Profile",
      badge: null
    },
    {
      to: "/settings",
      icon: <Settings className="h-6 w-6" />,
      label: "Settings",
      badge: null
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
      <div className="flex items-center justify-around h-16 px-4 max-w-md mx-auto">
        {navItems.map(({ to, icon, label, badge, className }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `
              relative flex flex-col items-center justify-center
              ${isActive ? 'text-primary' : 'text-muted-foreground'}
              ${className || ''}
            `}
          >
            {/* Icon */}
            {icon}

            {/* Label */}
            <span className="text-xs mt-1">{label}</span>

            {/* Badge */}
            {badge && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground 
                text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {badge}
              </span>
            )}

            {/* Active Indicator */}
            <span
              className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full transition-all
                ${isActive ? 'bg-primary scale-100' : 'scale-0'}
              `}
            />
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav; 