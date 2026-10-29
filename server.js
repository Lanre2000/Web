const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./src/routes/auth.routes');
const kycRoutes = require('./src/routes/kyc.routes');
const stakingRoutes = require('./src/routes/staking.routes');
const walletRoutes = require('./src/routes/wallet.routes');
const adminRoutes = require('./src/routes/admin.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads', 'kyc');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static assets
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Live CoinGecko BTC Price Feed with Fallback to Dynamic Simulation
let lastBtcPrice = 71450.00;
let lastFetchTime = 0;
let cachedMarketData = null;

async function getBtcMarketData() {
  const now = Date.now();
  // Cache CoinGecko responses for 15 seconds to respect rate limits
  if (cachedMarketData && now - lastFetchTime < 15000) {
    return cachedMarketData;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true',
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.bitcoin && data.bitcoin.usd) {
        lastBtcPrice = data.bitcoin.usd;
        lastFetchTime = now;
        cachedMarketData = {
          symbol: 'BTC/USD',
          source: 'CoinGecko Live API',
          currentPrice: lastBtcPrice,
          change24hPercent: parseFloat((data.bitcoin.usd_24h_change || 3.42).toFixed(2)),
          high24h: (lastBtcPrice * 1.025).toFixed(2),
          low24h: (lastBtcPrice * 0.978).toFixed(2),
          networkHashrateEh: 648.2,
          nextHalvingBlocks: 142850,
          timestamp: new Date().toISOString()
        };
        return cachedMarketData;
      }
    }
  } catch (err) {
    // CoinGecko unreachable or offline: fallback to dynamic simulated tick
  }

  // Graceful simulation fallback
  const delta = (Math.random() - 0.49) * 45;
  lastBtcPrice = parseFloat((lastBtcPrice + delta).toFixed(2));
  cachedMarketData = {
    symbol: 'BTC/USD',
    source: 'Dynamic Simulation Engine',
    currentPrice: lastBtcPrice,
    change24hPercent: 3.42,
    high24h: (lastBtcPrice * 1.025).toFixed(2),
    low24h: (lastBtcPrice * 0.978).toFixed(2),
    networkHashrateEh: 648.2,
    nextHalvingBlocks: 142850,
    timestamp: new Date().toISOString()
  };
  return cachedMarketData;
}

app.get('/api/market/btc-price', async (req, res) => {
  const data = await getBtcMarketData();
  return res.json(data);
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/staking', stakingRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/admin', adminRoutes);

// Fallback for SPA routing
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` SatoshiYield BTC Platform Server running on:`);
    console.log(` -> http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
