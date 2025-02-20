const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const ethers = require('ethers');

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.status(200).json({ message: "Server is running!" });
});

app.post('/api/wallet-login', async (req, res) => {
  try {
    const { walletAddress, signature } = req.body;
    const recoveredAddress = ethers.utils.verifyMessage("Login to MiCall", signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).json({ message: "Invalid signature." });
    }

    return res.status(200).json({ message: "Login successful", walletAddress });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

// Export the Express app
module.exports = app;
