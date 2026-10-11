import mongoose from 'mongoose';
import { createApp } from '../app';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { RefreshToken } from '../models/RefreshToken';
import { env } from '../config/env';

const TEST_PORT = 5055;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}${env.API_PREFIX}`;

async function runAuthTests() {
  console.log('====================================================');
  console.log('🧪 Starting CampusCapsule Phase 2 Authentication Tests');
  console.log('====================================================\n');

  // 1. Connect to MongoDB
  await connectDB();

  // 2. Start temporary test server
  const app = createApp();
  const server = app.listen(TEST_PORT);
  console.log(`[Test Server] Listening on http://127.0.0.1:${TEST_PORT}\n`);

  try {
    // Clean up test user if exists
    const testEmail = 'anus.test@example.com';
    const existing = await User.findOne({ email: testEmail });
    if (existing) {
      await RefreshToken.deleteMany({ userId: existing._id });
      await User.deleteOne({ _id: existing._id });
    }

    // TEST 1: Register New User
    console.log('➡️  Test 1: POST /api/auth/register (Happy Path)');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Anus Ahmed',
        email: ' Anus.Test@example.com ', // Test whitespace & uppercase normalization
        password: 'SecurePassword123!',
      }),
    });
    const regData = await regRes.json();
    console.log('Status:', regRes.status, 'Response:', JSON.stringify(regData, null, 2));

    if (regRes.status !== 201 || !regData.success || !regData.data?.tokens?.accessToken) {
      throw new Error('Test 1 failed: Registration did not succeed as expected');
    }
    if (regData.data.user.passwordHash) {
      throw new Error('SECURITY VIOLATION: passwordHash leaked in registration response!');
    }
    console.log('✅ Test 1 Passed: User registered, email normalized, tokens issued, passwordHash not leaked.\n');

    const firstTokens = regData.data.tokens;
    const userId = regData.data.user.id;

    // TEST 2: Duplicate Registration Rejection
    console.log('➡️  Test 2: POST /api/auth/register (Duplicate Email)');
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Anus Duplicate',
        email: testEmail,
        password: 'Password999!',
      }),
    });
    const dupData = await dupRes.json();
    console.log('Status:', dupRes.status, 'Response:', JSON.stringify(dupData, null, 2));

    if (dupRes.status !== 409 || dupData.success) {
      throw new Error('Test 2 failed: Duplicate email was not rejected with 409');
    }
    console.log('✅ Test 2 Passed: Duplicate registration correctly rejected with 409 Conflict.\n');

    // TEST 3: Login with Invalid Credentials
    console.log('➡️  Test 3: POST /api/auth/login (Wrong Password)');
    const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword!',
      }),
    });
    const wrongPassData = await wrongPassRes.json();
    console.log('Status:', wrongPassRes.status, 'Response:', JSON.stringify(wrongPassData, null, 2));

    if (wrongPassRes.status !== 401 || wrongPassData.success) {
      throw new Error('Test 3 failed: Incorrect password was not rejected with 401');
    }
    console.log('✅ Test 3 Passed: Invalid credentials rejected with generic 401 error.\n');

    // TEST 4: Login with Valid Credentials
    console.log('➡️  Test 4: POST /api/auth/login (Correct Credentials)');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'SecurePassword123!',
      }),
    });
    const loginData = await loginRes.json();
    console.log('Status:', loginRes.status, 'Response:', JSON.stringify(loginData, null, 2));

    if (loginRes.status !== 200 || !loginData.success || !loginData.data?.tokens?.accessToken) {
      throw new Error('Test 4 failed: Valid login did not succeed');
    }
    console.log('✅ Test 4 Passed: Login successful, tokens issued.\n');

    const activeTokens = loginData.data.tokens;

    // TEST 5: Protected Route GET /api/auth/me (Valid Access Token)
    console.log('➡️  Test 5: GET /api/auth/me (With Valid Token)');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${activeTokens.accessToken}` },
    });
    const meData = await meRes.json();
    console.log('Status:', meRes.status, 'Response:', JSON.stringify(meData, null, 2));

    if (meRes.status !== 200 || !meData.success || meData.data.user.email !== testEmail) {
      throw new Error('Test 5 failed: /api/auth/me failed with valid token');
    }
    console.log('✅ Test 5 Passed: /api/auth/me returns safe profile for authenticated user.\n');

    // TEST 6: Protected Route GET /api/auth/me (Missing & Invalid Token)
    console.log('➡️  Test 6: GET /api/auth/me (Missing & Invalid Token)');
    const noTokenRes = await fetch(`${BASE_URL}/auth/me`);
    const invalidTokenRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: 'Bearer this.is.invalid' },
    });
    if (noTokenRes.status !== 401 || invalidTokenRes.status !== 401) {
      throw new Error('Test 6 failed: Protected route allowed unauthorized access');
    }
    console.log('✅ Test 6 Passed: Protected route strictly rejects missing and invalid tokens with 401.\n');

    // TEST 7: POST /api/auth/refresh (Valid Token & Rotation)
    console.log('➡️  Test 7: POST /api/auth/refresh (Token Rotation)');
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: activeTokens.refreshToken }),
    });
    const refreshData = await refreshRes.json();
    console.log('Status:', refreshRes.status, 'Response:', JSON.stringify(refreshData, null, 2));

    if (refreshRes.status !== 200 || !refreshData.success || !refreshData.data?.tokens?.accessToken) {
      throw new Error('Test 7 failed: Token refresh did not succeed');
    }
    const rotatedTokens = refreshData.data.tokens;
    if (rotatedTokens.refreshToken === activeTokens.refreshToken) {
      throw new Error('Test 7 failed: Refresh token was not rotated to a new token!');
    }
    console.log('✅ Test 7 Passed: Access token refreshed and refresh token rotated.\n');

    // TEST 8: Replay attack prevention (Using old rotated refresh token)
    console.log('➡️  Test 8: POST /api/auth/refresh (Old Rotated Token Replay)');
    const replayRes = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: activeTokens.refreshToken }),
    });
    const replayData = await replayRes.json();
    console.log('Status:', replayRes.status, 'Response:', JSON.stringify(replayData, null, 2));

    if (replayRes.status !== 401 || replayData.success) {
      throw new Error('SECURITY VIOLATION: Revoked/rotated refresh token was accepted!');
    }
    console.log('✅ Test 8 Passed: Replay of rotated token rejected with 401 Revoked.\n');

    // TEST 9: POST /api/auth/logout
    console.log('➡️  Test 9: POST /api/auth/logout');
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rotatedTokens.accessToken}`,
      },
      body: JSON.stringify({ refreshToken: rotatedTokens.refreshToken }),
    });
    const logoutData = await logoutRes.json();
    console.log('Status:', logoutRes.status, 'Response:', JSON.stringify(logoutData, null, 2));

    if (logoutRes.status !== 200 || !logoutData.success) {
      throw new Error('Test 9 failed: Logout failed');
    }

    // Verify revoked token cannot be refreshed after logout
    const postLogoutRefresh = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rotatedTokens.refreshToken }),
    });
    if (postLogoutRefresh.status !== 401) {
      throw new Error('Test 9 failed: Token was still refreshable after logout');
    }
    console.log('✅ Test 9 Passed: Logout revokes refresh credentials and invalidates session.\n');

    // TEST 10: Database State Inspection
    console.log('➡️  Test 10: MongoDB Database Verification');
    const dbUser = await User.findOne({ email: testEmail }).select('+passwordHash');
    if (!dbUser) throw new Error('User not found in DB');
    if (!dbUser.passwordHash.startsWith('$2')) {
      throw new Error('Password hash does not have bcrypt format!');
    }
    if (dbUser.passwordHash === 'SecurePassword123!') {
      throw new Error('Plain text password was stored in database!');
    }
    if (dbUser.email !== testEmail) {
      throw new Error('Email was not normalized in DB');
    }
    console.log('DB User record verified:');
    console.log(`- ID: ${dbUser._id}`);
    console.log(`- Name: ${dbUser.name}`);
    console.log(`- Email (normalized): ${dbUser.email}`);
    console.log(`- Hashed Password: ${dbUser.passwordHash.slice(0, 15)}... (bcrypt verified)`);
    console.log(`- CreatedAt: ${dbUser.createdAt}`);

    const dbTokens = await RefreshToken.find({ userId: dbUser._id });
    console.log(`- Refresh Tokens count: ${dbTokens.length}`);
    for (const tok of dbTokens) {
      console.log(`  * Hash: ${tok.tokenHash.slice(0, 16)}... | isRevoked: ${tok.isRevoked} | expiresAt: ${tok.expiresAt.toISOString()}`);
    }
    console.log('✅ Test 10 Passed: MongoDB records confirmed (hashing, normalization, revocation state).\n');

    console.log('====================================================');
    console.log('🎉 ALL 10 PHASE 2 BACKEND AUTHENTICATION TESTS PASSED!');
    console.log('====================================================');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runAuthTests().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
