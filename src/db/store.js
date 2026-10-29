const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getInitialData() {
  const salt = bcrypt.genSaltSync(10);
  const traderPasswordHash = bcrypt.hashSync('password123', salt);
  const adminPasswordHash = bcrypt.hashSync('admin123', salt);

  return {
    users: [
      {
        id: 'usr_101',
        email: 'trader@example.com',
        fullName: 'Alex Vance',
        passwordHash: traderPasswordHash,
        role: 'USER',
        emailVerified: true,
        kycStatus: 'APPROVED',
        portfolio: {
          totalBalanceBtc: 0.25,
          availableBalanceBtc: 0.10,
          lockedInPlansBtc: 0.15
        },
        createdAt: '2026-10-01T10:00:00.000Z'
      },
      {
        id: 'adm_001',
        email: 'admin@satoshiyield.com',
        fullName: 'Master Operator',
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        emailVerified: true,
        kycStatus: 'APPROVED',
        portfolio: {
          totalBalanceBtc: 0,
          availableBalanceBtc: 0,
          lockedInPlansBtc: 0
        },
        createdAt: '2026-09-01T08:00:00.000Z'
      },
      {
        id: 'usr_102',
        email: 'pending@example.com',
        fullName: 'Elena Rostova',
        passwordHash: traderPasswordHash,
        role: 'USER',
        emailVerified: true,
        kycStatus: 'PENDING',
        portfolio: {
          totalBalanceBtc: 0.05,
          availableBalanceBtc: 0.05,
          lockedInPlansBtc: 0.00
        },
        createdAt: '2026-10-25T14:30:00.000Z'
      }
    ],
    emailVerifications: [],
    kycSubmissions: [
      {
        id: 'kyc_sub_102',
        userId: 'usr_102',
        userEmail: 'pending@example.com',
        fullName: 'Elena Rostova',
        documentType: 'PASSPORT',
        documentNumber: 'P892014892',
        documentFrontUrl: '/uploads/kyc/sample_passport_front.png',
        documentBackUrl: '/uploads/kyc/sample_passport_back.png',
        selfieUrl: '/uploads/kyc/sample_selfie.png',
        status: 'PENDING',
        rejectionReason: null,
        submittedAt: '2026-10-25T14:35:00.000Z'
      }
    ],
    stakingPlans: [
      {
        id: 'starter',
        name: 'Starter Hodler',
        dailyRatePercent: 1.5,
        minBtc: 0.005,
        maxBtc: 0.10,
        minDurationDays: 7,
        maxDurationDays: 30,
        badge: 'Beginner'
      },
      {
        id: 'pro',
        name: 'Pro Trader',
        dailyRatePercent: 2.5,
        minBtc: 0.10,
        maxBtc: 1.0,
        minDurationDays: 14,
        maxDurationDays: 60,
        badge: 'Popular'
      },
      {
        id: 'whale',
        name: 'Whale Yield',
        dailyRatePercent: 3.8,
        minBtc: 1.0,
        maxBtc: 5.0,
        minDurationDays: 30,
        maxDurationDays: 90,
        badge: 'High Yield'
      },
      {
        id: 'institutional',
        name: 'Institutional Tier',
        dailyRatePercent: 5.0,
        minBtc: 5.0,
        maxBtc: 50.0,
        minDurationDays: 60,
        maxDurationDays: 180,
        badge: 'VIP Elite'
      }
    ],
    stakingContracts: [
      {
        id: 'stk_001',
        userId: 'usr_101',
        planId: 'pro',
        planName: 'Pro Trader',
        stakedBtc: 0.15,
        dailyRatePercent: 2.5,
        durationDays: 30,
        startDate: '2026-10-15T12:00:00.000Z',
        endDate: '2026-11-14T12:00:00.000Z',
        autoCompound: true,
        accruedYieldBtc: 0.0124,
        status: 'ACTIVE'
      }
    ],
    transactions: [
      {
        id: 'tx_001',
        userId: 'usr_101',
        type: 'DEPOSIT',
        amountBtc: 0.25,
        amountUsd: 17500.00,
        network: 'Native SegWit',
        address: 'bc1q9x087vhq2r04u29e083nm4u0j2y52q79m9ptwf',
        txHash: '9f83ac14e82b7194602f3a8e990c76db1a4e21b8f0423bb0d436cf982631a012',
        status: 'COMPLETED',
        createdAt: '2026-10-10T09:15:00.000Z'
      },
      {
        id: 'tx_002',
        userId: 'usr_101',
        type: 'STAKE_LOCK',
        amountBtc: 0.15,
        amountUsd: 10500.00,
        network: 'Internal Staking Ledger',
        address: 'STAKING-CONTRACT-PRO',
        txHash: 'b561c9201940982bbdd1849102c4819039587391928472918301938592019aab',
        status: 'COMPLETED',
        createdAt: '2026-10-15T12:00:00.000Z'
      },
      {
        id: 'tx_003',
        userId: 'usr_101',
        type: 'YIELD_PAYOUT',
        amountBtc: 0.00375,
        amountUsd: 262.50,
        network: 'Internal Staking Ledger',
        address: 'YIELD-DISTRIBUTION',
        txHash: 'c772093849102a90192837490192834710293847109283471029384710293847',
        status: 'COMPLETED',
        createdAt: '2026-10-16T12:00:00.000Z'
      }
    ],
    withdrawals: [],
    adminStats: {
      totalAumBtc: 142.50,
      activeUsersCount: 1250
    }
  };
}

class Store {
  constructor() {
    this.data = null;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } else {
        this.data = getInitialData();
        this.save();
      }
    } catch (err) {
      console.error('Error loading store, resetting to initial data:', err);
      this.data = getInitialData();
      this.save();
    }
  }

  save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving store:', err);
    }
  }

  // Users
  findUserByEmail(email) {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  createUser(userData) {
    const user = {
      id: `usr_${Date.now()}`,
      createdAt: new Date().toISOString(),
      role: 'USER',
      emailVerified: false,
      kycStatus: 'UNVERIFIED',
      portfolio: {
        totalBalanceBtc: 0,
        availableBalanceBtc: 0,
        lockedInPlansBtc: 0
      },
      ...userData
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id, updates) {
    const user = this.findUserById(id);
    if (!user) return null;
    Object.assign(user, updates);
    this.save();
    return user;
  }

  // OTP Verifications
  createOtp(email, code) {
    // Remove existing OTP for this email
    this.data.emailVerifications = this.data.emailVerifications.filter(v => v.email !== email);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
    const record = {
      id: `otp_${Date.now()}`,
      email,
      code,
      expiresAt,
      used: false,
      createdAt: new Date().toISOString()
    };
    this.data.emailVerifications.push(record);
    this.save();
    return record;
  }

  verifyOtp(email, code) {
    const record = this.data.emailVerifications.find(
      v => v.email.toLowerCase() === email.toLowerCase() && !v.used
    );
    if (!record) return { valid: false, message: 'No verification code found. Please request a new one.' };

    if (new Date() > new Date(record.expiresAt)) {
      return { valid: false, message: 'Verification code has expired. Please request a new one.' };
    }

    if (record.code !== code) {
      return { valid: false, message: 'Invalid verification code.' };
    }

    record.used = true;
    this.save();
    return { valid: true };
  }

  // KYC
  submitKyc(userId, submissionData) {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');

    const existingIndex = this.data.kycSubmissions.findIndex(k => k.userId === userId);
    const submission = {
      id: `kyc_${Date.now()}`,
      userId,
      userEmail: user.email,
      fullName: submissionData.fullName || user.fullName,
      documentType: submissionData.documentType,
      documentNumber: submissionData.documentNumber,
      documentFrontUrl: submissionData.documentFrontUrl,
      documentBackUrl: submissionData.documentBackUrl,
      selfieUrl: submissionData.selfieUrl,
      status: 'PENDING',
      rejectionReason: null,
      submittedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      this.data.kycSubmissions[existingIndex] = submission;
    } else {
      this.data.kycSubmissions.push(submission);
    }

    user.kycStatus = 'PENDING';
    this.save();
    return submission;
  }

  reviewKyc(kycId, decision, rejectionReason = null) {
    const submission = this.data.kycSubmissions.find(k => k.id === kycId);
    if (!submission) return null;

    submission.status = decision; // 'APPROVED' | 'REJECTED'
    submission.rejectionReason = decision === 'REJECTED' ? rejectionReason : null;
    submission.reviewedAt = new Date().toISOString();

    const user = this.findUserById(submission.userId);
    if (user) {
      user.kycStatus = decision;
    }

    this.save();
    return submission;
  }

  getKycByUserId(userId) {
    return this.data.kycSubmissions.find(k => k.userId === userId);
  }

  getPendingKycQueue() {
    return this.data.kycSubmissions.filter(k => k.status === 'PENDING');
  }

  // Staking
  getStakingPlans() {
    return this.data.stakingPlans;
  }

  getUserStakingContracts(userId) {
    return this.data.stakingContracts.filter(c => c.userId === userId);
  }

  createStakingContract(userId, planId, amountBtc, durationDays, autoCompound = true) {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');
    const plan = this.data.stakingPlans.find(p => p.id === planId);
    if (!plan) throw new Error('Invalid staking plan');

    if (amountBtc > user.portfolio.availableBalanceBtc) {
      throw new Error('Insufficient available Bitcoin balance');
    }

    if (amountBtc < plan.minBtc || amountBtc > plan.maxBtc) {
      throw new Error(`Amount must be between ${plan.minBtc} BTC and ${plan.maxBtc} BTC`);
    }

    // Deduct available, add to locked
    user.portfolio.availableBalanceBtc = parseFloat((user.portfolio.availableBalanceBtc - amountBtc).toFixed(8));
    user.portfolio.lockedInPlansBtc = parseFloat((user.portfolio.lockedInPlansBtc + amountBtc).toFixed(8));
    user.portfolio.totalBalanceBtc = parseFloat((user.portfolio.availableBalanceBtc + user.portfolio.lockedInPlansBtc).toFixed(8));

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const contract = {
      id: `stk_${Date.now()}`,
      userId,
      planId: plan.id,
      planName: plan.name,
      stakedBtc: amountBtc,
      dailyRatePercent: plan.dailyRatePercent,
      durationDays,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      autoCompound,
      accruedYieldBtc: 0,
      status: 'ACTIVE'
    };

    this.data.stakingContracts.push(contract);

    // Record internal transaction
    this.data.transactions.push({
      id: `tx_${Date.now()}`,
      userId,
      type: 'STAKE_LOCK',
      amountBtc,
      amountUsd: amountBtc * 70000,
      network: 'Internal Staking Ledger',
      address: `STAKING-${plan.name.toUpperCase().replace(/\s+/g, '-')}`,
      txHash: require('crypto').randomBytes(32).toString('hex'),
      status: 'COMPLETED',
      createdAt: new Date().toISOString()
    });

    this.save();
    return contract;
  }

  // Transactions & Wallet
  getUserTransactions(userId) {
    return this.data.transactions
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  createDeposit(userId, amountBtc, network) {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');

    user.portfolio.availableBalanceBtc = parseFloat((user.portfolio.availableBalanceBtc + amountBtc).toFixed(8));
    user.portfolio.totalBalanceBtc = parseFloat((user.portfolio.totalBalanceBtc + amountBtc).toFixed(8));

    const tx = {
      id: `tx_${Date.now()}`,
      userId,
      type: 'DEPOSIT',
      amountBtc,
      amountUsd: amountBtc * 70000,
      network,
      address: 'bc1q' + require('crypto').randomBytes(18).toString('hex'),
      txHash: require('crypto').randomBytes(32).toString('hex'),
      status: 'COMPLETED',
      createdAt: new Date().toISOString()
    };

    this.data.transactions.push(tx);
    this.save();
    return tx;
  }

  requestWithdrawal(userId, amountBtc, address, network) {
    const user = this.findUserById(userId);
    if (!user) throw new Error('User not found');

    if (user.kycStatus !== 'APPROVED') {
      throw new Error('KYC verification is required before initiating withdrawals');
    }

    if (amountBtc > user.portfolio.availableBalanceBtc) {
      throw new Error(`Requested amount (${amountBtc} BTC) exceeds unlocked liquidity (${user.portfolio.availableBalanceBtc} BTC)`);
    }

    // Deduct from available balance immediately to prevent double spending
    user.portfolio.availableBalanceBtc = parseFloat((user.portfolio.availableBalanceBtc - amountBtc).toFixed(8));
    user.portfolio.totalBalanceBtc = parseFloat((user.portfolio.availableBalanceBtc + user.portfolio.lockedInPlansBtc).toFixed(8));

    const withdrawal = {
      id: `wth_${Date.now()}`,
      userId,
      userEmail: user.email,
      amountBtc,
      amountUsd: amountBtc * 70000,
      address,
      network,
      status: 'PENDING',
      requestedAt: new Date().toISOString(),
      txHash: null
    };

    this.data.withdrawals.push(withdrawal);

    const tx = {
      id: `tx_${Date.now()}`,
      userId,
      type: 'WITHDRAWAL',
      amountBtc,
      amountUsd: amountBtc * 70000,
      network,
      address,
      txHash: 'Pending Confirmation',
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    this.data.transactions.push(tx);

    this.save();
    return { withdrawal, transaction: tx };
  }

  reviewWithdrawal(withdrawalId, decision, txHash = null) {
    const withdrawal = this.data.withdrawals.find(w => w.id === withdrawalId);
    if (!withdrawal) return null;

    withdrawal.status = decision; // 'APPROVED' | 'REJECTED'
    withdrawal.reviewedAt = new Date().toISOString();
    withdrawal.txHash = decision === 'APPROVED' ? (txHash || require('crypto').randomBytes(32).toString('hex')) : null;

    // Update corresponding user transaction
    const tx = this.data.transactions.find(
      t => t.userId === withdrawal.userId && t.type === 'WITHDRAWAL' && t.status === 'PENDING'
    );

    if (decision === 'REJECTED') {
      // Refund balance to user
      const user = this.findUserById(withdrawal.userId);
      if (user) {
        user.portfolio.availableBalanceBtc = parseFloat((user.portfolio.availableBalanceBtc + withdrawal.amountBtc).toFixed(8));
        user.portfolio.totalBalanceBtc = parseFloat((user.portfolio.availableBalanceBtc + user.portfolio.lockedInPlansBtc).toFixed(8));
      }
      if (tx) tx.status = 'FAILED';
    } else if (decision === 'APPROVED') {
      if (tx) {
        tx.status = 'COMPLETED';
        tx.txHash = withdrawal.txHash;
      }
    }

    this.save();
    return withdrawal;
  }

  // Admin global operations
  getAdminAnalytics() {
    let calculatedAum = this.data.users.reduce((acc, u) => acc + (u.portfolio?.totalBalanceBtc || 0), 0);
    // Add baseline system reserve from Gemini spec
    const totalAumBtc = parseFloat((142.50 + calculatedAum).toFixed(2));
    const activeUsersCount = 1250 + this.data.users.length;
    const activeContractsCount = this.data.stakingContracts.filter(c => c.status === 'ACTIVE').length;
    const pendingKycCount = this.data.kycSubmissions.filter(k => k.status === 'PENDING').length;
    const pendingWithdrawalsCount = this.data.withdrawals.filter(w => w.status === 'PENDING').length;

    return {
      totalAumBtc,
      totalAumUsd: totalAumBtc * 70000,
      activeUsersCount,
      activeContractsCount,
      pendingKycCount,
      pendingWithdrawalsCount
    };
  }
}

module.exports = new Store();
