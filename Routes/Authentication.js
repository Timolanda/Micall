import React, { useState } from 'react';

interface User {
  username: string;
  password: string;
  token: string;
}

interface Props {}

const AuthAPI: React.FC<Props> = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');

  const handleSignUp = () => {
    if (username && password) {
      const user: User = { username, password, token: generateToken() };
      localStorage.setItem('user', JSON.stringify(user));
      setIsLoggedIn(true);
      setToken(user.token);
    } else {
      setError('Please enter both username and password');
    }
  };

  const handleLogin = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user: User = JSON.parse(storedUser);
      if (user.username === username && user.password === password) {
        setIsLoggedIn(true);
        setToken(user.token);
      } else {
        setError('Invalid username or password');
      }
    } else {
      setError('User not found');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken('');
  };

  const generateToken = () => {
    return Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
  };

  const validateToken = () => {
    if (token) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user: User = JSON.parse(storedUser);
        return user.token === token;
      }
    }
    return false;
  };

  return (
    <div className="max-w-md mx-auto p-4 mt-10 bg-white rounded-md shadow-md">
      <h1 className="text-3xl font-bold mb-4">MiCall Authentication API</h1>
      {isLoggedIn ? (
        <div>
          <p className="text-lg font-bold mb-2">Welcome, {username}!</p>
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      ) : (
        <div>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="block w-full p-2 mb-2 border border-gray-400 rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full p-2 mb-4 border border-gray-400 rounded"
          />
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2"
            onClick={handleLogin}
          >
            Login
          </button>
          <button
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleSignUp}
          >
            Sign Up
          </button>
          {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default AuthAPI;
