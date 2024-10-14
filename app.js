const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ethers = require('ethers');  // For wallet-based authentication

const app = express();
app.use(cors());
app.use(bodyParser.json());

// In-memory store for users (you should use a proper database like MongoDB in production)
let users = {};

// Route for wallet-based login/authentication
app.post('/api/wallet-login', async (req, res) => {
  const { walletAddress, signature } = req.body;

  try {
    // Verify the wallet address and signature
    const recoveredAddress = ethers.utils.verifyMessage("Login to MiCall", signature);
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).send({ message: "Invalid signature." });
    }

    // Register or log in the user using the wallet address
    if (!users[walletAddress]) {
      users[walletAddress] = {
        address: walletAddress,
        createdAt: new Date(),
        method: 'wallet',  // Mark that the user signed up via wallet
      };
    }

    // Return success with the wallet address
    return res.status(200).send({ message: "Login successful", walletAddress });
  } catch (error) {
    console.error("Error during wallet authentication:", error);
    return res.status(500).send({ message: "Login failed." });
  }
});

// Route for email-based sign up
app.post('/api/signup-email', (req, res) => {
  const { email, password } = req.body;

  // Simple validation
  if (!email || !password) {
    return res.status(400).send({ message: "Email and password are required." });
  }

  // Check if the user already exists
  if (users[email]) {
    return res.status(400).send({ message: "Email is already registered." });
  }

  // Register the new user
  users[email] = {
    email,
    password,  // Store hashed passwords in production
    createdAt: new Date(),
    method: 'email',  // Mark that the user signed up via email
  };

  return res.status(200).send({ message: "Signup successful", email });
});

// Route for phone number-based sign up
app.post('/api/signup-phone', (req, res) => {
  const { phoneNumber, code } = req.body;

  // Validate the phone number and code
  if (!phoneNumber || !code) {
    return res.status(400).send({ message: "Phone number and verification code are required." });
  }

  // In production, you'd verify the code before allowing sign up

  // Check if the user already exists
  if (users[phoneNumber]) {
    return res.status(400).send({ message: "Phone number is already registered." });
  }

  // Register the new user
  users[phoneNumber] = {
    phoneNumber,
    createdAt: new Date(),
    method: 'phone',  // Mark that the user signed up via phone
  };

  return res.status(200).send({ message: "Signup successful", phoneNumber });
});

// Basic route to get all users (for testing purposes)
app.get('/api/users', (req, res) => {
  res.send(users);
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
