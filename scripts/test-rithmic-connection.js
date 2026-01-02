// =============================================================================
// TEST RITHMIC CONNECTION
// =============================================================================
// Tests the Rithmic API connection using demo credentials
// NOTE: Rithmic requires registered credentials from a broker like Apex
// =============================================================================

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const WebSocket = require('ws');

// Demo server configuration
const RITHMIC_DEMO_URL = 'wss://rituz00100.rithmic.com:443';

// Test credentials - Replace with your actual Rithmic credentials
// You get these from your prop firm (Apex, TopStep, etc.)
const TEST_CREDENTIALS = {
  userId: process.env.RITHMIC_USER_ID || 'YOUR_USER_ID',
  password: process.env.RITHMIC_PASSWORD || 'YOUR_PASSWORD',
  systemName: process.env.RITHMIC_SYSTEM_NAME || 'Apex',  // Your broker's system name
  appName: 'StuntMan',
  appVersion: '1.0.0',
  fcmId: process.env.RITHMIC_FCM_ID || '',
  ibId: process.env.RITHMIC_IB_ID || '',
};

// Template IDs (Rithmic Protocol)
const TEMPLATE = {
  REQUEST_LOGIN: 10,
  RESPONSE_LOGIN: 11,
  REQUEST_HEARTBEAT: 18,
  RESPONSE_HEARTBEAT: 19,
};

console.log('═══════════════════════════════════════════════════════════════════');
console.log('              RITHMIC CONNECTION TEST');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');

// Check for credentials
if (TEST_CREDENTIALS.userId === 'YOUR_USER_ID' || TEST_CREDENTIALS.password === 'YOUR_PASSWORD') {
  console.log('⚠️  WARNING: No Rithmic credentials configured!');
  console.log('');
  console.log('To test the connection, you need to set environment variables:');
  console.log('');
  console.log('  RITHMIC_USER_ID      - Your Rithmic username');
  console.log('  RITHMIC_PASSWORD     - Your Rithmic password');
  console.log('  RITHMIC_SYSTEM_NAME  - Your broker system (e.g., "Apex", "TopStep")');
  console.log('  RITHMIC_FCM_ID       - FCM ID (optional)');
  console.log('  RITHMIC_IB_ID        - IB ID (optional)');
  console.log('');
  console.log('Or add them to your .env.local file:');
  console.log('');
  console.log('  RITHMIC_USER_ID=your_username');
  console.log('  RITHMIC_PASSWORD=your_password');
  console.log('  RITHMIC_SYSTEM_NAME=Apex');
  console.log('');
  console.log('You get these credentials from your prop firm (Apex, TopStep, MFF, etc.)');
  console.log('after funding or getting an evaluation account.');
  console.log('');
  console.log('───────────────────────────────────────────────────────────────────');
  console.log('');
  console.log('📋 Attempting connection anyway to test network connectivity...');
  console.log('');
}

// Test WebSocket connectivity
async function testConnection() {
  console.log(`🔌 Connecting to: ${RITHMIC_DEMO_URL}`);
  console.log('');

  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    try {
      const ws = new WebSocket(RITHMIC_DEMO_URL, {
        rejectUnauthorized: false,  // Allow self-signed certs in dev
      });

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('Connection timeout (10 seconds)'));
      }, 10000);

      ws.on('open', () => {
        const connectTime = Date.now() - startTime;
        console.log(`✅ WebSocket connected in ${connectTime}ms`);
        console.log('');

        clearTimeout(timeout);

        // Try to authenticate
        console.log('🔐 Attempting authentication...');
        console.log(`   User: ${TEST_CREDENTIALS.userId}`);
        console.log(`   System: ${TEST_CREDENTIALS.systemName}`);
        console.log('');

        const loginMessage = {
          templateId: TEMPLATE.REQUEST_LOGIN,
          user: TEST_CREDENTIALS.userId,
          password: TEST_CREDENTIALS.password,
          systemName: TEST_CREDENTIALS.systemName,
          appName: TEST_CREDENTIALS.appName,
          appVersion: TEST_CREDENTIALS.appVersion,
          infraType: 1,  // TICKER_PLANT
        };

        if (TEST_CREDENTIALS.fcmId) {
          loginMessage.fcmId = TEST_CREDENTIALS.fcmId;
        }
        if (TEST_CREDENTIALS.ibId) {
          loginMessage.ibId = TEST_CREDENTIALS.ibId;
        }

        ws.send(JSON.stringify(loginMessage));
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('📨 Received message:');
          console.log(`   Template ID: ${message.templateId}`);

          if (message.templateId === TEMPLATE.RESPONSE_LOGIN) {
            if (message.rpCode === '0' || message.rpCode === 0) {
              console.log('');
              console.log('✅ AUTHENTICATION SUCCESSFUL!');
              console.log('');
              console.log('🎉 Rithmic connection is working properly!');
              console.log('');
              ws.close();
              resolve({ success: true, latency: Date.now() - startTime });
            } else {
              console.log('');
              console.log('❌ AUTHENTICATION FAILED');
              console.log(`   Code: ${message.rpCode}`);
              console.log(`   Message: ${message.textMsg || 'Unknown error'}`);
              console.log('');

              if (message.rpCode === '20' || message.textMsg?.includes('credentials')) {
                console.log('💡 This usually means:');
                console.log('   - Invalid username or password');
                console.log('   - Wrong system name (should match your broker)');
                console.log('   - Account not activated for API access');
                console.log('');
              }

              ws.close();
              resolve({ success: false, error: message.textMsg || `Error code: ${message.rpCode}` });
            }
          } else {
            console.log(`   Data: ${JSON.stringify(message).slice(0, 200)}`);
          }
        } catch (e) {
          console.log('   (Binary/non-JSON message received)');
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        console.log('');
        console.log('❌ WebSocket error:');
        console.log(`   ${error.message}`);
        console.log('');

        if (error.message.includes('ENOTFOUND')) {
          console.log('💡 Cannot resolve hostname. Check your internet connection.');
        } else if (error.message.includes('ECONNREFUSED')) {
          console.log('💡 Connection refused. The server may be down or blocking connections.');
        } else if (error.message.includes('certificate')) {
          console.log('💡 SSL certificate issue. This is common in development.');
        }

        reject(error);
      });

      ws.on('close', (code, reason) => {
        clearTimeout(timeout);
        if (code !== 1000) {
          console.log(`   Connection closed: ${code} - ${reason || 'No reason provided'}`);
        }
      });

    } catch (error) {
      reject(error);
    }
  });
}

// Run the test
async function main() {
  try {
    const result = await testConnection();

    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');

    if (result.success) {
      console.log('✅ TEST PASSED: Rithmic connection is working!');
      console.log(`   Total latency: ${result.latency}ms`);
      console.log('');
      console.log('Next steps:');
      console.log('   1. Your credentials are valid and working');
      console.log('   2. You can now use the Rithmic client in your trading system');
      console.log('   3. Subscribe to market data and start trading!');
    } else {
      console.log('⚠️  TEST INCOMPLETE: Connected but authentication failed');
      console.log(`   Error: ${result.error}`);
      console.log('');
      console.log('Next steps:');
      console.log('   1. Verify your credentials with your prop firm');
      console.log('   2. Ensure your account has API access enabled');
      console.log('   3. Check the system name matches your broker');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');

  } catch (error) {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('❌ TEST FAILED: Could not connect to Rithmic');
    console.log(`   Error: ${error.message}`);
    console.log('');
    console.log('Possible causes:');
    console.log('   - Firewall blocking WebSocket connections');
    console.log('   - Rithmic servers temporarily unavailable');
    console.log('   - Network connectivity issues');
    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');
    process.exit(1);
  }
}

main();
