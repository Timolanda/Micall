import React from "react";
import { NavLink } from "react-router-dom";
import { Home, User, Settings } from "lucide-react";

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t shadow-md p-2 flex justify-around items-center">
      <NavLink to="/" className={({ isActive }) => isActive ? "text-blue-500" : "text-gray-500"}>
        <Home size={24} />
        <span className="text-xs">Home</span>
      </NavLink>

      <NavLink to="/profile" className={({ isActive }) => isActive ? "text-blue-500" : "text-gray-500"}>
        <User size={24} />
        <span className="text-xs">Profile</span>
      </NavLink>

      <NavLink to="/settings" className={({ isActive }) => isActive ? "text-blue-500" : "text-gray-500"}>
        <Settings size={24} />
        <span className="text-xs">Settings</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
