const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { authenticateToken, requireEmailVerified } = require('../middleware/auth');

// Get all staking plans
router.get('/plans', (req, res) => {
  const plans = store.getStakingPlans();
  return res.json({ plans });
});

// Calculate ROI endpoint
router.post('/calculate-roi', (req, res) => {
  const { amountBtc, dailyRatePercent, durationDays, autoCompound } = req.body;

  const P = parseFloat(amountBtc) || 0;
  const r = (parseFloat(dailyRatePercent) || 0) / 100;
  const t = parseInt(durationDays, 10) || 0;

  if (P <= 0 || r <= 0 || t <= 0) {
    return res.status(400).json({ error: 'Valid principal, rate, and duration are required.' });
  }

  let finalAmount = 0;
  let totalYield = 0;

  if (autoCompound) {
    // A = P * (1 + r)^t
    finalAmount = P * Math.pow(1 + r, t);
    totalYield = finalAmount - P;
  } else {
    // Simple Interest: Yield = P * r * t
    totalYield = P * r * t;
    finalAmount = P + totalYield;
  }

  return res.json({
    principalBtc: P,
    dailyRatePercent: dailyRatePercent,
    durationDays: t,
    autoCompound: Boolean(autoCompound),
    totalYieldBtc: parseFloat(totalYield.toFixed(8)),
    finalAmountBtc: parseFloat(finalAmount.toFixed(8)),
    totalYieldUsd: parseFloat((totalYield * 70000).toFixed(2)),
    finalAmountUsd: parseFloat((finalAmount * 70000).toFixed(2))
  });
});

// Get user active contracts
router.get('/active', authenticateToken, (req, res) => {
  const contracts = store.getUserStakingContracts(req.user.id);
  return res.json({ contracts });
});

// Subscribe to a staking tier
router.post('/subscribe', authenticateToken, requireEmailVerified, (req, res) => {
  try {
    const { planId, amountBtc, durationDays, autoCompound } = req.body;

    if (!planId || !amountBtc || !durationDays) {
      return res.status(400).json({ error: 'Plan ID, amount in BTC, and duration days are required.' });
    }

    const btcAmount = parseFloat(amountBtc);
    const days = parseInt(durationDays, 10);

    const contract = store.createStakingContract(
      req.user.id,
      planId,
      btcAmount,
      days,
      Boolean(autoCompound)
    );

    // Refresh updated user portfolio
    const updatedUser = store.findUserById(req.user.id);

    return res.status(201).json({
      success: true,
      message: `Successfully locked ${btcAmount} BTC into ${contract.planName}.`,
      contract,
      portfolio: updatedUser.portfolio
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
