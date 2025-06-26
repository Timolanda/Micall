import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { verifyMessage } from 'ethers';

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get('/', (req: Request, res: Response) => {
  res.status(200).json({ message: "Server is running!" });
});

app.post('/api/wallet-login', async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature } = req.body;
    const recoveredAddress = verifyMessage("Login to MiCall", signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).json({ message: "Invalid signature." });
    }

    return res.status(200).json({ message: "Login successful", walletAddress });
  } catch (error: any) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});

// Export the Express app
export default app; 