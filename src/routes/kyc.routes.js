const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const store = require('../db/store');
const { authenticateToken } = require('../middleware/auth');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'kyc');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const fieldName = file.fieldname;
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    cb(null, `${req.user ? req.user.id : 'anon'}_${fieldName}_${uniqueSuffix}${ext}`);
  }
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME_TYPES.includes(file.mimetype) && ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.originalname}. Only JPG, PNG, and WebP images are permitted for KYC compliance.`));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter
});

// Submit KYC
router.post(
  '/submit',
  authenticateToken,
  upload.fields([
    { name: 'documentFront', maxCount: 1 },
    { name: 'documentBack', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
  ]),
  (req, res) => {
    try {
      const { documentType, documentNumber, fullName } = req.body;

      if (!documentType) {
        return res.status(400).json({ error: 'Document type (PASSPORT, DRIVERS_LICENSE, NATIONAL_ID) is required.' });
      }

      const files = req.files || {};
      const frontPath = files.documentFront ? `/uploads/kyc/${files.documentFront[0].filename}` : '/uploads/kyc/sample_id_front.png';
      const backPath = files.documentBack ? `/uploads/kyc/${files.documentBack[0].filename}` : '/uploads/kyc/sample_id_back.png';
      const selfiePath = files.selfie ? `/uploads/kyc/${files.selfie[0].filename}` : '/uploads/kyc/sample_selfie.png';

      const submission = store.submitKyc(req.user.id, {
        fullName: fullName || req.user.fullName,
        documentType,
        documentNumber: documentNumber || 'DOC-' + Math.floor(100000 + Math.random() * 900000),
        documentFrontUrl: frontPath,
        documentBackUrl: backPath,
        selfieUrl: selfiePath
      });

      return res.status(201).json({
        success: true,
        message: 'Identity documents submitted successfully. Verification status is now PENDING review.',
        submission,
        kycStatus: 'PENDING'
      });
    } catch (err) {
      console.error('KYC submission error:', err);
      return res.status(500).json({ error: err.message || 'Internal server error during KYC submission.' });
    }
  }
);

// Get KYC status
router.get('/status', authenticateToken, (req, res) => {
  const submission = store.getKycByUserId(req.user.id);
  return res.json({
    kycStatus: req.user.kycStatus,
    submission: submission || null
  });
});

module.exports = router;
