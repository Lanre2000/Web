const express = require('express');
const router = express.Router();
const store = require('../db/store');
const { authenticateToken, requireEmailVerified, requireKycApproved } = require('../middleware/auth');

// Get deposit addresses
router.get('/deposit-addresses', authenticateToken, (req, res) => {
  return res.json({
    addresses: {
      nativeSegwit: {
        network: 'Native SegWit (Bech32)',
        address: 'bc1q9x087vhq2r04u29e083nm4u0j2y52q79m9ptwf',
        memoRequired: false,
        confirmations: 2
      },
      lightning: {
        network: 'Bitcoin Lightning Network',
        address: 'lnbc2500u1pn8jhq2pp5d89f727c9a90918237910283749102938471029384710293847',
        memoRequired: false,
        confirmations: 'Instant'
      },
      bep20: {
        network: 'BNB Smart Chain (BTCB - BEP20)',
        address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
        memoRequired: false,
        confirmations: 15
      }
    }
  });
});

// Deposit simulation (for test / demo balance top-up)
router.post('/deposit-simulate', authenticateToken, requireEmailVerified, (req, res) => {
  try {
    const { amountBtc, network } = req.body;
    const amount = parseFloat(amountBtc);
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid Bitcoin deposit amount required.' });
    }

    const tx = store.createDeposit(req.user.id, amount, network || 'Native SegWit');
    const user = store.findUserById(req.user.id);

    return res.status(201).json({
      success: true,
      message: `Successfully credited ${amount} BTC deposit to available balance.`,
      transaction: tx,
      portfolio: user.portfolio
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Withdraw funds - requires KYC APPROVED and email verified
router.post('/withdraw', authenticateToken, requireEmailVerified, requireKycApproved, (req, res) => {
  try {
    const { amountBtc, destinationAddress, network } = req.body;
    const amount = parseFloat(amountBtc);

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid Bitcoin withdrawal amount is required.' });
    }

    if (!destinationAddress || destinationAddress.trim().length < 15) {
      return res.status(400).json({ error: 'Valid recipient Bitcoin wallet address is required.' });
    }

    const result = store.requestWithdrawal(
      req.user.id,
      amount,
      destinationAddress.trim(),
      network || 'Native SegWit'
    );

    const updatedUser = store.findUserById(req.user.id);

    return res.status(201).json({
      success: true,
      message: `Withdrawal request for ${amount} BTC submitted. Awaiting administrative authorization.`,
      withdrawal: result.withdrawal,
      transaction: result.transaction,
      portfolio: updatedUser.portfolio
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

// Get personal audit ledger with search and category filters
router.get('/transactions', authenticateToken, (req, res) => {
  const { type, search } = req.query;
  let txs = store.getUserTransactions(req.user.id);

  if (type && type !== 'ALL') {
    txs = txs.filter(t => t.type === type);
  }

  if (search) {
    const q = search.toLowerCase();
    txs = txs.filter(t =>
      (t.txHash && t.txHash.toLowerCase().includes(q)) ||
      (t.address && t.address.toLowerCase().includes(q)) ||
      (t.type && t.type.toLowerCase().includes(q))
    );
  }

  return res.json({ transactions: txs });
});

// Export personal ledger to CSV
router.get('/transactions/export', authenticateToken, (req, res) => {
  const txs = store.getUserTransactions(req.user.id);

  let csv = 'Transaction ID,Type,Amount BTC,Amount USD,Network,Destination/Source Address,TxHash,Status,Date\n';

  txs.forEach(t => {
    const row = [
      `"${t.id}"`,
      `"${t.type}"`,
      t.amountBtc,
      t.amountUsd,
      `"${t.network || 'BTC'}"`,
      `"${t.address || ''}"`,
      `"${t.txHash || ''}"`,
      `"${t.status}"`,
      `"${t.createdAt}"`
    ].join(',');
    csv += row + '\n';
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="satoshiyield_transactions_${req.user.id}.csv"`);
  return res.send(csv);
});

module.exports = router;
