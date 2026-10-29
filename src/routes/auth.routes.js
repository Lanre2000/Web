const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('../db/store');
const emailService = require('../services/email.service');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (store.findUserByEmail(email)) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = store.createUser({
      email,
      fullName: fullName || email.split('@')[0],
      passwordHash,
      role: 'USER',
      emailVerified: false,
      kycStatus: 'UNVERIFIED'
    });

    // Generate 6-digit OTP
    const otp = generateOtp();
    store.createOtp(email, otp);

    // Dispatch via dual-mode email service
    const dispatch = await emailService.sendOtpEmail(email, otp);

    return res.status(201).json({
      success: true,
      message: dispatch.mode === 'SMTP'
        ? `Verification code sent to ${email}.`
        : `Registration successful. 6-digit verification code dispatched (Demo Mode active).`,
      email: user.email,
      mode: dispatch.mode,
      otpHint: dispatch.mode === 'DEMO' ? otp : undefined
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
});

// Verify OTP
router.post('/verify-otp', (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and 6-digit code are required.' });
    }

    const verification = store.verifyOtp(email, code);
    if (!verification.valid) {
      return res.status(400).json({ error: verification.message });
    }

    const user = store.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    store.updateUser(user.id, { emailVerified: true });

    // Issue JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      message: 'Email successfully verified. Welcome to SatoshiYield.',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        emailVerified: true,
        kycStatus: user.kycStatus,
        portfolio: user.portfolio
      }
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    return res.status(500).json({ error: 'Internal server error during OTP verification.' });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = store.findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'No account registered with this email.' });
    }

    const otp = generateOtp();
    store.createOtp(email, otp);

    const dispatch = await emailService.sendOtpEmail(email, otp);

    return res.json({
      success: true,
      message: 'A fresh 6-digit verification code has been dispatched.',
      mode: dispatch.mode,
      otpHint: dispatch.mode === 'DEMO' ? otp : undefined
    });
  } catch (err) {
    console.error('Resend OTP error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = store.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check email verification gate
    if (!user.emailVerified) {
      const otp = generateOtp();
      store.createOtp(user.email, otp);
      const dispatch = await emailService.sendOtpEmail(user.email, otp);

      return res.status(403).json({
        requiresOtp: true,
        email: user.email,
        message: 'Email address has not been verified. Please input the 6-digit OTP.',
        mode: dispatch.mode,
        otpHint: dispatch.mode === 'DEMO' ? otp : undefined
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        emailVerified: user.emailVerified,
        kycStatus: user.kycStatus,
        portfolio: user.portfolio
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

// Get current profile
router.get('/me', authenticateToken, (req, res) => {
  const { passwordHash, ...safeUser } = req.user;
  return res.json({
    user: safeUser
  });
});

module.exports = router;
