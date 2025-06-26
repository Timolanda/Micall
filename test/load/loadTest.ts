import autocannon from 'autocannon';
import { env } from '../../config/environment';

const DURATION = 30; // seconds
const CONNECTIONS = 100;

async function runLoadTest() {
  const testConfig = {
    url: env.API_URL,
    connections: CONNECTIONS,
    duration: DURATION,
    headers: {
      'Content-Type': 'application/json'
    },
    requests: [
      {
        method: 'GET',
        path: '/health'
      },
      {
        method: 'POST',
        path: '/auth/wallet-login',
        body: JSON.stringify({
          walletAddress: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
          signature: 'test-signature'
        })
      },
      {
        method: 'GET',
        path: '/emergency/active',
        headers: {
          'Authorization': 'Bearer ${TOKEN}'
        }
      }
    ]
  };

  const results = await autocannon(testConfig);
  console.log('Load Test Results:', results);
}

runLoadTest().catch(console.error); 