const jwt = require('jsonwebtoken');
const store = require('../db/store');

const JWT_SECRET = process.env.JWT_SECRET || 'satoshiyield_super_secure_jwt_secret_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required. Please authenticate.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired session token.' });
    }

    // Refresh user from store to reflect live changes (balance, KYC, role)
    const user = store.findUserById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'User account no longer exists.' });
    }

    req.user = user;
    next();
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Access denied. Requires ${role} role permissions.` });
    }
    next();
  };
}

function requireEmailVerified(req, res, next) {
  if (!req.user.emailVerified) {
    return res.status(403).json({
      error: 'Email verification required. Please verify the 6-digit OTP sent to your email.'
    });
  }
  next();
}

function requireKycApproved(req, res, next) {
  if (req.user.kycStatus !== 'APPROVED') {
    return res.status(403).json({
      error: 'KYC identity compliance required. Your identity must be APPROVED before this operation.',
      kycStatus: req.user.kycStatus
    });
  }
  next();
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  requireRole,
  requireEmailVerified,
  requireKycApproved
};
