const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { authenticateToken, requireRole } = require('../middleware/auth');

// All admin routes require ADMIN role
router.use(authenticateToken, requireRole('ADMIN'));

// Platform Analytics & AUM
router.get('/analytics', (req, res) => {
  const analytics = store.getAdminAnalytics();
  return res.json({ analytics });
});

// KYC Verification Queue
router.get('/kyc-queue', (req, res) => {
  const queue = store.getPendingKycQueue();
  return res.json({ queue });
});

// Review KYC Submission (Approve / Reject)
router.post('/kyc/:id/review', (req, res) => {
  const { decision, rejectionReason } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ error: 'Decision must be either APPROVED or REJECTED.' });
  }

  if (decision === 'REJECTED' && (!rejectionReason || rejectionReason.trim().length === 0)) {
    return res.status(400).json({ error: 'A specific rejection reason feedback note is required.' });
  }

  const updated = store.reviewKyc(req.params.id, decision, rejectionReason);
  if (!updated) {
    return res.status(404).json({ error: 'KYC submission not found.' });
  }

  return res.json({
    success: true,
    message: `KYC submission marked as ${decision}.`,
    submission: updated
  });
});

// Pending Withdrawals Queue
router.get('/withdrawals', (req, res) => {
  const pending = store.data.withdrawals.filter(w => w.status === 'PENDING');
  return res.json({ withdrawals: pending });
});

// Review Withdrawal Request (Approve / Reject)
router.post('/withdrawals/:id/review', (req, res) => {
  const { decision, txHash } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(400).json({ error: 'Decision must be APPROVED or REJECTED.' });
  }

  const updated = store.reviewWithdrawal(req.params.id, decision, txHash);
  if (!updated) {
    return res.status(404).json({ error: 'Withdrawal request not found.' });
  }

  return res.json({
    success: true,
    message: `Withdrawal request ${decision}.`,
    withdrawal: updated
  });
});

// User Management Directory
router.get('/users', (req, res) => {
  const { search } = req.query;
  let users = store.data.users.map(({ passwordHash, ...safeUser }) => safeUser);

  if (search) {
    const q = search.toLowerCase();
    users = users.filter(u =>
      u.email.toLowerCase().includes(q) ||
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      u.id.toLowerCase().includes(q)
    );
  }

  return res.json({ users });
});

// Manual Balance / Status Adjustment
router.post('/users/:id/adjust-balance', (req, res) => {
  const { availableBalanceBtc, kycStatus, role } = req.body;
  const user = store.findUserById(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  if (availableBalanceBtc !== undefined) {
    const newAvail = parseFloat(availableBalanceBtc);
    user.portfolio.availableBalanceBtc = newAvail;
    user.portfolio.totalBalanceBtc = parseFloat((newAvail + user.portfolio.lockedInPlansBtc).toFixed(8));
  }

  if (kycStatus && ['UNVERIFIED', 'PENDING', 'APPROVED', 'REJECTED'].includes(kycStatus)) {
    user.kycStatus = kycStatus;
  }

  if (role && ['USER', 'ADMIN'].includes(role)) {
    user.role = role;
  }

  store.save();
  const { passwordHash, ...safeUser } = user;
  return res.json({
    success: true,
    message: 'User updated successfully.',
    user: safeUser
  });
});

// Global Yield Configurator
router.put('/yield-config', (req, res) => {
  const { planId, dailyRatePercent, minBtc, maxBtc } = req.body;
  const plan = store.data.stakingPlans.find(p => p.id === planId);

  if (!plan) {
    return res.status(404).json({ error: 'Staking tier plan not found.' });
  }

  if (dailyRatePercent !== undefined) plan.dailyRatePercent = parseFloat(dailyRatePercent);
  if (minBtc !== undefined) plan.minBtc = parseFloat(minBtc);
  if (maxBtc !== undefined) plan.maxBtc = parseFloat(maxBtc);

  store.save();

  return res.json({
    success: true,
    message: `Staking tier ${plan.name} configuration updated.`,
    plan
  });
});

module.exports = router;
