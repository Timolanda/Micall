const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const router = express.Router();

// In-memory user store (for demo purposes)
let users = [];

// Secret key for JWT
const JWT_SECRET = 'supersecretkey'; // Change this in production

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Access denied, token missing!' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token!' });
    req.user = user;
    next();
  });
};

// Route for user registration (email/phone)
router.post('/register', async (req, res) => {
  const { username, email, password, phoneNumber } = req.body;

  // Validate input
  if (!username || (!email && !phoneNumber)) {
    return res.status(400).json({ message: 'Username, email or phone number is required' });
  }

  // Check if user already exists (based on email/phone)
  const userExists = users.find(user => user.username === username || user.email === email || user.phoneNumber === phoneNumber);
  if (userExists) {
    return res.status(400).json({ message: 'User already exists' });
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Add user to the database (in-memory)
  users.push({ username, email, phoneNumber, password: hashedPassword });

  res.status(201).json({ message: 'User registered successfully' });
});

// Route for user login (email/username/phone)
router.post('/login', async (req, res) => {
  const { username, email, phoneNumber, password } = req.body;

  // Find user in the database
  const user = users.find(user => user.username === username || user.email === email || user.phoneNumber === phoneNumber);
  if (!user) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // Compare passwords
  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // Generate JWT token
  const token = jwt.sign({ username: user.username, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

  res.json({ message: 'Login successful', token });
});

// Route for wallet-based signup/login
router.post('/wallet-auth', (req, res) => {
  const { walletAddress } = req.body;

  if (!walletAddress) {
    return res.status(400).json({ message: 'Wallet address is required' });
  }

  // Check if wallet already exists
  let user = users.find(user => user.walletAddress === walletAddress);

  if (!user) {
    // Create a new user with wallet address only (no password)
    user = { walletAddress };
    users.push(user);
  }

  // Generate JWT token for wallet user
  const token = jwt.sign({ walletAddress }, JWT_SECRET, { expiresIn: '1h' });

  res.json({ message: 'Wallet login successful', token });
});

// A protected route
router.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: `Hello, ${req.user.username || req.user.walletAddress}. You are authorized!` });
});

module.exports = router;
