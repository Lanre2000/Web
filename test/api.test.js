const assert = require('assert');
const http = require('http');
const app = require('../server');
const store = require('../src/db/store');

let server;
let baseUrl;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };

    let postData = null;
    if (body) {
      if (typeof body === 'object') {
        postData = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      } else {
        postData = body;
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json !== null ? json : data
        });
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting SatoshiYield Automated Integration Tests ---\n');

  // Start temporary server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`Test server running on ${baseUrl}`);
      resolve();
    });
  });

  try {
    // 1. Health & Market Price endpoint
    console.log('1. Testing Market Price Endpoint...');
    const priceRes = await request('GET', '/api/market/btc-price');
    assert.strictEqual(priceRes.status, 200);
    assert(priceRes.data.currentPrice > 0, 'Current price must be positive');
    assert.strictEqual(priceRes.data.symbol, 'BTC/USD');
    console.log('   ✓ Market price ticker response OK');

    // 2. Authentication: Register with OTP
    console.log('2. Testing User Registration & OTP Dispatch...');
    const testEmail = `test_${Date.now()}@satoshiyield.com`;
    const regRes = await request('POST', '/api/auth/register', {
      email: testEmail,
      password: 'password123',
      fullName: 'Test Auditor'
    });
    assert.strictEqual(regRes.status, 201);
    assert(regRes.data.otpHint, 'OTP Hint should be returned in test mode');
    const otpCode = regRes.data.otpHint;
    console.log(`   ✓ Registration success, received OTP: ${otpCode}`);

    // Verify OTP
    console.log('3. Testing OTP Verification & Token Issue...');
    const verifyRes = await request('POST', '/api/auth/verify-otp', {
      email: testEmail,
      code: otpCode
    });
    assert.strictEqual(verifyRes.status, 200);
    assert(verifyRes.data.token, 'JWT Token must be issued');
    assert.strictEqual(verifyRes.data.user.emailVerified, true);
    const userToken = verifyRes.data.token;
    const userId = verifyRes.data.user.id;
    console.log('   ✓ OTP validated, account verified, JWT token acquired');

    // 4. RBAC Authorization Gate
    console.log('4. Testing RBAC Security: Standard User Blocked From Admin API...');
    const adminBlockedRes = await request('GET', '/api/admin/analytics', null, {
      'Authorization': `Bearer ${userToken}`
    });
    assert.strictEqual(adminBlockedRes.status, 403, 'User must receive 403 Forbidden for admin route');
    console.log('   ✓ RBAC enforced: Regular user blocked from admin endpoints');

    // 5. Admin Authentication & Access
    console.log('5. Testing Admin Login & Access Control...');
    const adminLoginRes = await request('POST', '/api/auth/login', {
      email: 'admin@satoshiyield.com',
      password: 'admin123'
    });
    assert.strictEqual(adminLoginRes.status, 200);
    const adminToken = adminLoginRes.data.token;

    const adminAnalyticsRes = await request('GET', '/api/admin/analytics', null, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(adminAnalyticsRes.status, 200);
    assert(adminAnalyticsRes.data.analytics.totalAumBtc >= 142.50, 'AUM reflects system spec');
    console.log('   ✓ Admin authorized, analytics retrieved successfully');

    // 6. Compounding ROI Calculation Math
    console.log('6. Testing Compounding ROI Calculation Formula: A = P * (1 + r)^t ...');
    const P = 0.5;
    const r = 2.5; // 2.5% daily
    const t = 30; // 30 days
    const calcRes = await request('POST', '/api/staking/calculate-roi', {
      amountBtc: P,
      dailyRatePercent: r,
      durationDays: t,
      autoCompound: true
    });
    assert.strictEqual(calcRes.status, 200);
    const expectedFinal = P * Math.pow(1 + (r / 100), t);
    const diff = Math.abs(calcRes.data.finalAmountBtc - expectedFinal);
    assert(diff < 0.001, `Calculated final amount ${calcRes.data.finalAmountBtc} must match expected ${expectedFinal}`);
    console.log(`   ✓ Compounding formula validated: Principal ${P} BTC -> Maturity ${calcRes.data.finalAmountBtc} BTC`);

    // 7. KYC Compliance Workflow & Withdrawal Gating
    console.log('7. Testing KYC Enforcement: Unverified User Blocked From Withdrawal...');
    const withdrawAttempt1 = await request('POST', '/api/wallet/withdraw', {
      amountBtc: 0.01,
      destinationAddress: 'bc1q9x087vhq2r04u29e083nm4u0j2y52q79m9ptwf',
      network: 'Native SegWit'
    }, {
      'Authorization': `Bearer ${userToken}`
    });
    assert.strictEqual(withdrawAttempt1.status, 403, 'Withdrawal must fail with 403 when KYC is unverified');
    console.log('   ✓ KYC compliance gate enforced: Withdrawal blocked for unverified user');

    // Submit KYC
    console.log('8. Testing KYC Document Submission...');
    const kycSubRes = await request('POST', '/api/kyc/submit', {
      documentType: 'PASSPORT',
      documentNumber: 'P992019481',
      fullName: 'Test Auditor'
    }, {
      'Authorization': `Bearer ${userToken}`
    });
    assert.strictEqual(kycSubRes.status, 201);
    assert.strictEqual(kycSubRes.data.kycStatus, 'PENDING');
    const kycId = kycSubRes.data.submission.id;
    console.log(`   ✓ KYC submission accepted, status PENDING (ID: ${kycId})`);

    // Admin approves KYC
    console.log('9. Testing Admin KYC Queue Approval...');
    const approveRes = await request('POST', `/api/admin/kyc/${kycId}/review`, {
      decision: 'APPROVED'
    }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(approveRes.status, 200);
    assert.strictEqual(approveRes.data.submission.status, 'APPROVED');
    console.log('   ✓ Admin approval processed, user KYC marked APPROVED');

    // 10. Deposit & Staking Subscriptions
    console.log('10. Testing Wallet Deposit Simulation & Staking Lockup...');
    const depRes = await request('POST', '/api/wallet/deposit-simulate', {
      amountBtc: 0.50,
      network: 'Native SegWit'
    }, {
      'Authorization': `Bearer ${userToken}`
    });
    assert.strictEqual(depRes.status, 201);
    assert.strictEqual(depRes.data.portfolio.availableBalanceBtc, 0.50);

    // Subscribe to Starter Staking Plan (min 0.005, max 0.10)
    const stakeRes = await request('POST', '/api/staking/subscribe', {
      planId: 'starter',
      amountBtc: 0.05,
      durationDays: 14,
      autoCompound: true
    }, {
      'Authorization': `Bearer ${userToken}`
    });
    assert.strictEqual(stakeRes.status, 201);
    assert.strictEqual(stakeRes.data.portfolio.availableBalanceBtc, 0.45);
    assert.strictEqual(stakeRes.data.portfolio.lockedInPlansBtc, 0.05);
    console.log('   ✓ Staking allocation successful: 0.05 BTC locked, 0.45 BTC available');

    // 11. Transaction Ledger & CSV Export
    console.log('11. Testing Transaction Audit Ledger & CSV Export...');
    const txRes = await request('GET', '/api/wallet/transactions', null, {
      'Authorization': `Bearer ${userToken}`
    });
    assert.strictEqual(txRes.status, 200);
    assert(txRes.data.transactions.length >= 2, 'Should have deposit and stake lock records');

    const csvRes = await request('GET', '/api/wallet/transactions/export', null, {
      'Authorization': `Bearer ${userToken}`
    });
    assert.strictEqual(csvRes.status, 200);
    assert(csvRes.data.includes('Transaction ID,Type,Amount BTC'), 'CSV header present');
    assert(csvRes.data.includes('DEPOSIT'), 'Deposit record present in CSV');
    console.log('   ✓ Transaction audit ledger & CSV export verified');

    console.log('\n======================================================');
    console.log('  ALL INTEGRATION TESTS PASSED SUCCESSFULLY! (11/11)  ');
    console.log('======================================================\n');
  } finally {
    server.close();
  }
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
}
