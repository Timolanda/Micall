import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

const LoginForm = () => {
  const [showPassword, setShowPassword] = useState(false);
  
  return (
    <div className="w-full max-w-md space-y-8 p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Welcome to MiCall</h2>
        <p className="text-muted-foreground">Sign in to access your account</p>
      </div>
      
      <form className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
              placeholder="Enter your email"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              className="w-full pl-10 pr-10 py-2 border rounded-lg"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        
        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground py-2 rounded-lg hover:bg-primary/90"
        >
          Sign In
        </button>
      </form>
    </div>
  );
};

export default LoginForm; 