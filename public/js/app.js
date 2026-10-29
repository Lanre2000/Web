// SatoshiYield Frontend Application Controller

class SatoshiYieldApp {
  constructor() {
    this.token = localStorage.getItem('sy_token') || null;
    this.currentUser = JSON.parse(localStorage.getItem('sy_user') || 'null');
    this.btcPrice = 71450.00;
    this.chart = null;
    this.currentTimeframe = '24H';
    this.depositAddresses = null;
    this.currentDepositNet = 'nativeSegwit';
    this.qrInstance = null;
    this.calcRate = 2.5; // Default Pro rate

    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.initChart();
    this.startPricePolling();

    if (this.token && this.currentUser) {
      await this.refreshCurrentUser();
      this.render();
    } else {
      // Default to trader demo for effortless reviewer onboarding
      await this.quickLogin('trader@example.com', 'password123');
    }

    lucide.createIcons();
  }

  setupEventListeners() {
    // Quick switcher dropdown toggle
    const qsBtn = document.getElementById('quickSwitchBtn');
    const qsMenu = document.getElementById('quickSwitchMenu');
    if (qsBtn && qsMenu) {
      qsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        qsMenu.classList.toggle('hidden');
      });
      document.addEventListener('click', () => {
        qsMenu.classList.add('hidden');
      });
    }
  }

  // API Client Helper
  async api(endpoint, options = {}) {
    const headers = options.headers || {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const res = await fetch(endpoint, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Server request failed');
      }
      return data;
    } catch (err) {
      this.showToast(err.message, 'error');
      throw err;
    }
  }

  // Toast Notifications
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    const colors = {
      success: 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200',
      error: 'bg-rose-950/90 border-rose-500/50 text-rose-200',
      info: 'bg-slate-900/90 border-amber-500/50 text-amber-200'
    };

    toast.className = `p-3.5 rounded-xl border text-xs shadow-2xl backdrop-blur-md flex items-center space-x-2.5 transition-all transform duration-300 pointer-events-auto ${colors[type] || colors.info}`;
    toast.innerHTML = `
      <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info'}" class="w-4 h-4 shrink-0"></i>
      <span class="font-medium">${message}</span>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-x-full');
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // Auth Handling
  async quickLogin(email, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.status === 403 && data.requiresOtp) {
        this.openOtpModal(data.email, data.otpHint);
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Login failed');

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('sy_token', data.token);
      localStorage.setItem('sy_user', JSON.stringify(data.user));

      this.showToast(`Logged in as ${data.user.fullName} (${data.user.role})`, 'success');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async refreshCurrentUser() {
    try {
      const res = await this.api('/api/auth/me');
      this.currentUser = res.user;
      localStorage.setItem('sy_user', JSON.stringify(res.user));
    } catch {
      this.logout();
    }
  }

  logout() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('sy_token');
    localStorage.removeItem('sy_user');
    this.render();
    this.showToast('You have signed out.', 'info');
  }

  openAuthModal(tab = 'login') {
    this.switchAuthTab(tab);
    document.getElementById('authModal').classList.remove('hidden');
  }

  switchAuthTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabLogin = document.getElementById('authTabLogin');
    const tabReg = document.getElementById('authTabRegister');

    if (tab === 'login') {
      loginForm.classList.remove('hidden');
      registerForm.classList.add('hidden');
      tabLogin.className = 'flex-1 pb-3 text-center text-sm font-bold border-b-2 border-amber-500 text-amber-400';
      tabReg.className = 'flex-1 pb-3 text-center text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-white';
    } else {
      loginForm.classList.add('hidden');
      registerForm.classList.remove('hidden');
      tabReg.className = 'flex-1 pb-3 text-center text-sm font-bold border-b-2 border-amber-500 text-amber-400';
      tabLogin.className = 'flex-1 pb-3 text-center text-sm font-semibold border-b-2 border-transparent text-slate-400 hover:text-white';
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    this.closeModal('authModal');
    await this.quickLogin(email, password);
  }

  async handleRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      this.closeModal('authModal');
      this.openOtpModal(data.email, data.otpHint);
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  openOtpModal(email, otpHint) {
    this.pendingOtpEmail = email;
    document.getElementById('otpTargetEmail').textContent = email;
    const hintBox = document.getElementById('otpDemoHintBox');
    const hintCode = document.getElementById('otpDemoCode');

    if (otpHint) {
      hintCode.textContent = otpHint;
      hintBox.classList.remove('hidden');
      this.pendingOtpHint = otpHint;
    } else {
      hintBox.classList.add('hidden');
    }

    document.getElementById('otpModal').classList.remove('hidden');
    lucide.createIcons();
  }

  autoFillOtp() {
    if (this.pendingOtpHint) {
      document.getElementById('otpCodeInput').value = this.pendingOtpHint;
    }
  }

  async handleVerifyOtp(e) {
    e.preventDefault();
    const code = document.getElementById('otpCodeInput').value.trim();
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.pendingOtpEmail, code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      this.closeModal('otpModal');
      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('sy_token', data.token);
      localStorage.setItem('sy_user', JSON.stringify(data.user));

      this.showToast('Email verified successfully! Welcome.', 'success');
      this.render();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  async resendOtp() {
    try {
      const res = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.pendingOtpEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Resend failed');

      this.openOtpModal(this.pendingOtpEmail, data.otpHint);
      this.showToast('Fresh 6-digit code dispatched.', 'info');
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('hidden');
  }

  // Price Ticker & Chart
  startPricePolling() {
    const fetchPrice = async () => {
      try {
        const res = await fetch('/api/market/btc-price');
        const data = await res.json();
        this.btcPrice = data.currentPrice;

        const priceEl = document.getElementById('headerBtcPrice');
        if (priceEl) {
          priceEl.textContent = `$${data.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        const highEl = document.getElementById('chartHighPrice');
        const lowEl = document.getElementById('chartLowPrice');
        if (highEl) highEl.textContent = `$${data.high24h}`;
        if (lowEl) lowEl.textContent = `$${data.low24h}`;

        // Live point update on chart
        if (this.chart && this.chart.data.datasets[0].data.length > 0) {
          const ds = this.chart.data.datasets[0].data;
          ds[ds.length - 1] = this.btcPrice;
          this.chart.update('none');
        }

        this.updatePortfolioUsd();
      } catch (err) {
        console.error('Ticker poll error:', err);
      }
    };

    fetchPrice();
    setInterval(fetchPrice, 4000);
  }

  initChart() {
    const ctx = document.getElementById('btcChart')?.getContext('2d');
    if (!ctx) return;

    const dataPoints = this.generateChartData('24H');

    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(247, 147, 26, 0.4)');
    gradient.addColorStop(1, 'rgba(247, 147, 26, 0.0)');

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dataPoints.labels,
        datasets: [{
          label: 'BTC/USD',
          data: dataPoints.prices,
          borderColor: '#f7931a',
          borderWidth: 2.5,
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: '#f7931a',
          pointHoverBorderWidth: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0e121b',
            titleColor: '#94a3b8',
            bodyColor: '#ffffff',
            bodyFont: { family: 'JetBrains Mono', weight: 'bold' },
            borderColor: 'rgba(247, 147, 26, 0.3)',
            borderWidth: 1,
            padding: 10,
            displayColors: false,
            callbacks: {
              label: (context) => `$${context.parsed.y.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#64748b', font: { size: 10, family: 'JetBrains Mono' } }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.04)' },
            ticks: {
              color: '#64748b',
              font: { size: 10, family: 'JetBrains Mono' },
              callback: (val) => `$${(val / 1000).toFixed(0)}k`
            }
          }
        }
      }
    });
  }

  setTimeframe(tf) {
    this.currentTimeframe = tf;
    document.querySelectorAll('.tf-btn').forEach(btn => {
      if (btn.dataset.tf === tf) {
        btn.className = 'tf-btn px-2.5 py-1 rounded-md bg-amber-500 text-slate-950 font-bold transition';
      } else {
        btn.className = 'tf-btn px-2.5 py-1 rounded-md text-slate-400 hover:text-white transition';
      }
    });

    const newData = this.generateChartData(tf);
    if (this.chart) {
      this.chart.data.labels = newData.labels;
      this.chart.data.datasets[0].data = newData.prices;
      this.chart.update();
    }
  }

  generateChartData(tf) {
    let count = 24;
    let base = 69800;
    const labels = [];
    const prices = [];

    if (tf === '24H') {
      count = 24;
      for (let i = 0; i < count; i++) {
        labels.push(`${i}:00`);
        base += (Math.random() - 0.48) * 150;
        prices.push(parseFloat(base.toFixed(2)));
      }
    } else if (tf === '7D') {
      count = 7;
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      for (let i = 0; i < count; i++) {
        labels.push(days[i]);
        base += (Math.random() - 0.45) * 800;
        prices.push(parseFloat(base.toFixed(2)));
      }
    } else if (tf === '30D') {
      count = 30;
      for (let i = 1; i <= count; i += 2) {
        labels.push(`Day ${i}`);
        base += (Math.random() - 0.47) * 900;
        prices.push(parseFloat(base.toFixed(2)));
      }
    } else if (tf === '1Y') {
      count = 12;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      base = 42000;
      for (let i = 0; i < count; i++) {
        labels.push(months[i]);
        base += (Math.random() - 0.3) * 3500;
        prices.push(parseFloat(base.toFixed(2)));
      }
    }

    prices[prices.length - 1] = this.btcPrice;
    return { labels, prices };
  }

  // Compounding ROI Calculator Logic
  setCalcRate(rate, btn) {
    this.calcRate = rate;
    document.querySelectorAll('.calc-rate-btn').forEach(b => {
      b.className = 'calc-rate-btn p-2 rounded-lg bg-slate-800 border border-slate-700 text-center hover:border-amber-500 transition';
    });
    btn.className = 'calc-rate-btn p-2 rounded-lg bg-amber-500/20 border border-amber-500 text-center text-amber-400 font-bold transition';
    this.updateCalculator();
  }

  updateCalculator() {
    const P = parseFloat(document.getElementById('calcAmountInput')?.value || 0.25);
    const t = parseInt(document.getElementById('calcDurationInput')?.value || 30, 10);
    const autoCompound = document.getElementById('calcCompoundToggle')?.checked;
    const r = this.calcRate / 100;

    const btcValEl = document.getElementById('calcBtcVal');
    const usdValEl = document.getElementById('calcUsdVal');
    const durValEl = document.getElementById('calcDurationVal');

    if (btcValEl) btcValEl.textContent = P.toFixed(3);
    if (usdValEl) usdValEl.textContent = `$${(P * this.btcPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    if (durValEl) durValEl.textContent = `${t} Days`;

    let finalAmount = 0;
    let yieldAmount = 0;

    if (autoCompound) {
      // Compounding: A = P * (1 + r)^t
      finalAmount = P * Math.pow(1 + r, t);
      yieldAmount = finalAmount - P;
    } else {
      // Simple Interest: Yield = P * r * t
      yieldAmount = P * r * t;
      finalAmount = P + yieldAmount;
    }

    const yieldEl = document.getElementById('calcYieldResult');
    const totalEl = document.getElementById('calcTotalResult');

    if (yieldEl) yieldEl.textContent = `+${yieldAmount.toFixed(5)} BTC`;
    if (totalEl) totalEl.textContent = `${finalAmount.toFixed(5)} BTC ($${(finalAmount * this.btcPrice).toLocaleString('en-US', { maximumFractionDigits: 0 })})`;
  }

  // Staking Subscriptions
  async loadStakingPlans() {
    try {
      const data = await this.api('/api/staking/plans');
      const grid = document.getElementById('stakingPlansGrid');
      if (!grid) return;

      grid.innerHTML = data.plans.map(p => `
        <div class="glass-panel p-5 relative flex flex-col justify-between hover:border-amber-500/50 transition-all group">
          <div>
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs font-bold text-white uppercase tracking-wider">${p.name}</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">${p.badge}</span>
            </div>
            <div class="mb-4">
              <span class="text-2xl font-extrabold text-amber-400 font-mono">${p.dailyRatePercent}%</span>
              <span class="text-xs text-slate-400">/ day yield</span>
            </div>
            <div class="space-y-1.5 text-xs text-slate-400 font-mono mb-6">
              <div class="flex justify-between">
                <span>Min Allocation:</span>
                <span class="text-slate-200">${p.minBtc} BTC</span>
              </div>
              <div class="flex justify-between">
                <span>Max Allocation:</span>
                <span class="text-slate-200">${p.maxBtc} BTC</span>
              </div>
              <div class="flex justify-between">
                <span>Lockup Terms:</span>
                <span class="text-slate-200">${p.minDurationDays} - ${p.maxDurationDays} Days</span>
              </div>
            </div>
          </div>
          <button onclick="app.openStakeModal('${p.id}', '${p.name}', ${p.dailyRatePercent}, ${p.minBtc}, ${p.maxBtc}, ${p.minDurationDays})" class="w-full py-2 bg-slate-800 group-hover:bg-amber-500 text-slate-300 group-hover:text-slate-950 font-bold text-xs rounded-lg transition">
            Stake in Tier
          </button>
        </div>
      `).join('');
    } catch (err) {
      console.error(err);
    }
  }

  async loadActiveContracts() {
    try {
      const data = await this.api('/api/staking/active');
      const container = document.getElementById('activeContractsList');
      const countBadge = document.getElementById('activePlansCountBadge');

      if (countBadge) {
        countBadge.textContent = `${data.contracts.length} Active Contract${data.contracts.length === 1 ? '' : 's'}`;
      }

      if (!container) return;

      if (data.contracts.length === 0) {
        container.innerHTML = `
          <div class="glass-panel p-6 text-center text-xs text-slate-400">
            No active staking contracts. Select a tier above to initiate automated Bitcoin yield generation.
          </div>
        `;
        return;
      }

      container.innerHTML = data.contracts.map(c => `
        <div class="glass-panel p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center space-x-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 pulse-indicator"></span>
              <h4 class="font-bold text-sm text-white">${c.planName}</h4>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase">${c.status}</span>
            </div>
            <div class="text-xs text-slate-400 font-mono">
              Started: ${new Date(c.startDate).toLocaleDateString()} | Maturity: ${new Date(c.endDate).toLocaleDateString()} (${c.durationDays} Days)
            </div>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <span class="text-slate-500 block text-[10px] uppercase">Locked Principal</span>
              <span class="font-bold text-white">${c.stakedBtc} BTC</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[10px] uppercase">Daily Rate</span>
              <span class="font-bold text-amber-400">${c.dailyRatePercent}% / d</span>
            </div>
            <div>
              <span class="text-slate-500 block text-[10px] uppercase">Compounding</span>
              <span class="font-semibold text-emerald-400">${c.autoCompound ? 'Active' : 'Disabled'}</span>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error(err);
    }
  }

  openStakeModal(planId, name, rate, min, max, minDays) {
    document.getElementById('stakePlanId').value = planId;
    document.getElementById('stakeModalPlanName').textContent = name;
    document.getElementById('stakeModalRate').textContent = `${rate}% / day`;
    document.getElementById('stakeModalBounds').textContent = `${min} - ${max} BTC`;
    document.getElementById('stakeAmount').value = min;
    document.getElementById('stakeAmount').min = min;
    document.getElementById('stakeAmount').max = max;
    document.getElementById('stakeDuration').value = minDays;
    document.getElementById('stakeDuration').min = minDays;

    const avail = this.currentUser?.portfolio?.availableBalanceBtc || 0;
    document.getElementById('stakeModalAvail').textContent = `${avail} BTC`;

    document.getElementById('stakeModal').classList.remove('hidden');
    lucide.createIcons();
  }

  async handleSubscribe(e) {
    e.preventDefault();
    const planId = document.getElementById('stakePlanId').value;
    const amountBtc = parseFloat(document.getElementById('stakeAmount').value);
    const durationDays = parseInt(document.getElementById('stakeDuration').value, 10);
    const autoCompound = document.getElementById('stakeAutoCompound').checked;

    try {
      const res = await this.api('/api/staking/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planId, amountBtc, durationDays, autoCompound })
      });

      this.closeModal('stakeModal');
      this.showToast(res.message, 'success');
      await this.refreshCurrentUser();
      this.render();
    } catch (err) {
      // error handled in api()
    }
  }

  // Wallet & Deposits
  async openDepositModal() {
    try {
      const data = await this.api('/api/wallet/deposit-addresses');
      this.depositAddresses = data.addresses;
      this.switchDepositNetwork(this.currentDepositNet);
      document.getElementById('depositModal').classList.remove('hidden');
      lucide.createIcons();
    } catch (err) {
      console.error(err);
    }
  }

  switchDepositNetwork(netKey) {
    this.currentDepositNet = netKey;
    const tabs = {
      nativeSegwit: document.getElementById('depNetSegwit'),
      lightning: document.getElementById('depNetLightning'),
      bep20: document.getElementById('depNetBep20')
    };

    Object.keys(tabs).forEach(k => {
      if (tabs[k]) {
        if (k === netKey) {
          tabs[k].className = 'flex-1 py-1.5 rounded-md bg-amber-500 text-slate-950 font-bold transition';
        } else {
          tabs[k].className = 'flex-1 py-1.5 rounded-md text-slate-400 hover:text-white transition';
        }
      }
    });

    if (!this.depositAddresses) return;
    const info = this.depositAddresses[netKey];
    if (!info) return;

    document.getElementById('depositAddressLabel').textContent = info.network;
    document.getElementById('depositAddressInput').value = info.address;

    // Render QR Code with QRCode.js
    const qrContainer = document.getElementById('depositQrCode');
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
      text: info.address,
      width: 160,
      height: 160,
      colorDark: '#07090e',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  }

  copyDepositAddress() {
    const input = document.getElementById('depositAddressInput');
    if (!input) return;
    navigator.clipboard.writeText(input.value);
    this.showToast('Deposit address copied to clipboard!', 'info');
  }

  async simulateDeposit() {
    const amountBtc = parseFloat(document.getElementById('simDepositAmount')?.value || 0.1);
    try {
      const res = await this.api('/api/wallet/deposit-simulate', {
        method: 'POST',
        body: JSON.stringify({ amountBtc, network: this.depositAddresses?.[this.currentDepositNet]?.network || 'Native SegWit' })
      });
      this.closeModal('depositModal');
      this.showToast(res.message, 'success');
      await this.refreshCurrentUser();
      this.render();
    } catch (err) {
      // error handled in api()
    }
  }

  // Withdrawals
  openWithdrawModal() {
    if (!this.currentUser) return;

    if (this.currentUser.kycStatus !== 'APPROVED') {
      this.showToast('KYC compliance verification is strictly required before unlocking withdrawals.', 'error');
      this.openKycModal();
      return;
    }

    const avail = this.currentUser.portfolio?.availableBalanceBtc || 0;
    document.getElementById('withdrawAvailLiquidity').textContent = `${avail} BTC`;
    document.getElementById('withdrawAmount').max = avail;
    document.getElementById('withdrawModal').classList.remove('hidden');
    lucide.createIcons();
  }

  setWithdrawMax() {
    const avail = this.currentUser?.portfolio?.availableBalanceBtc || 0;
    document.getElementById('withdrawAmount').value = avail;
  }

  async handleWithdraw(e) {
    e.preventDefault();
    const destinationAddress = document.getElementById('withdrawAddress').value;
    const amountBtc = parseFloat(document.getElementById('withdrawAmount').value);
    const network = document.getElementById('withdrawNetwork').value;

    try {
      const res = await this.api('/api/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({ destinationAddress, amountBtc, network })
      });
      this.closeModal('withdrawModal');
      this.showToast(res.message, 'success');
      await this.refreshCurrentUser();
      this.render();
    } catch (err) {
      // error handled in api()
    }
  }

  // Personal Ledger & CSV Export
  async loadTransactions() {
    try {
      const type = document.getElementById('txTypeFilter')?.value || 'ALL';
      const search = document.getElementById('txSearchInput')?.value || '';

      const data = await this.api(`/api/wallet/transactions?type=${encodeURIComponent(type)}&search=${encodeURIComponent(search)}`);
      const tbody = document.getElementById('txTableBody');
      if (!tbody) return;

      if (data.transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">No transactions recorded.</td></tr>`;
        return;
      }

      const typeStyles = {
        DEPOSIT: 'bg-emerald-500/20 text-emerald-400',
        WITHDRAWAL: 'bg-rose-500/20 text-rose-400',
        STAKE_LOCK: 'bg-sky-500/20 text-sky-400',
        YIELD_PAYOUT: 'bg-amber-500/20 text-amber-400'
      };

      tbody.innerHTML = data.transactions.map(t => `
        <tr class="hover:bg-slate-900/40 transition">
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${typeStyles[t.type] || 'bg-slate-800 text-slate-300'}">
              ${t.type}
            </span>
          </td>
          <td class="py-3 px-4 font-mono font-semibold text-white">
            ${t.amountBtc} BTC
            <span class="block text-[10px] text-slate-500 font-normal">≈ $${t.amountUsd?.toLocaleString() || '0'}</span>
          </td>
          <td class="py-3 px-4 text-slate-300">${t.network || 'BTC'}</td>
          <td class="py-3 px-4 font-mono text-slate-400 text-[11px] truncate max-w-[140px]" title="${t.txHash}">
            ${t.txHash}
          </td>
          <td class="py-3 px-4">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono ${t.status === 'COMPLETED' ? 'text-emerald-400 bg-emerald-500/10' : t.status === 'PENDING' ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400 bg-rose-500/10'}">
              ${t.status}
            </span>
          </td>
          <td class="py-3 px-4 text-slate-400 font-mono text-[11px]">
            ${new Date(t.createdAt).toLocaleDateString()} ${new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error(err);
    }
  }

  exportLedgerCsv() {
    if (!this.token) return;
    window.open(`/api/wallet/transactions/export?token=${encodeURIComponent(this.token)}`, '_blank');
  }

  // KYC Submission
  openKycModal() {
    document.getElementById('kycFullName').value = this.currentUser?.fullName || '';
    document.getElementById('kycModal').classList.remove('hidden');
    lucide.createIcons();
  }

  async handleKycSubmit(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append('fullName', document.getElementById('kycFullName').value);
    formData.append('documentType', document.getElementById('kycDocType').value);
    formData.append('documentNumber', document.getElementById('kycDocNumber').value);

    const front = document.getElementById('kycFrontFile').files[0];
    const back = document.getElementById('kycBackFile').files[0];
    const selfie = document.getElementById('kycSelfieFile').files[0];

    if (front) formData.append('documentFront', front);
    if (back) formData.append('documentBack', back);
    if (selfie) formData.append('selfie', selfie);

    try {
      const res = await this.api('/api/kyc/submit', {
        method: 'POST',
        body: formData
      });

      this.closeModal('kycModal');
      this.showToast(res.message, 'success');
      await this.refreshCurrentUser();
      this.render();
    } catch (err) {
      // error handled in api()
    }
  }

  // ADMIN OPERATIONS
  async loadAdminAnalytics() {
    try {
      const data = await this.api('/api/admin/analytics');
      const a = data.analytics;

      document.getElementById('adminAumBtc').textContent = `${a.totalAumBtc} BTC`;
      document.getElementById('adminAumUsd').textContent = `$${a.totalAumUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
      document.getElementById('adminActiveUsers').textContent = a.activeUsersCount.toLocaleString();
      document.getElementById('adminPendingKycCount').textContent = a.pendingKycCount;
      document.getElementById('adminPendingWithdrawalsCount').textContent = a.pendingWithdrawalsCount;
    } catch (err) {
      console.error(err);
    }
  }

  async loadAdminKycQueue() {
    try {
      const data = await this.api('/api/admin/kyc-queue');
      const container = document.getElementById('adminKycList');
      const badge = document.getElementById('kycQueueBadge');

      if (badge) badge.textContent = `${data.queue.length} Pending Submission${data.queue.length === 1 ? '' : 's'}`;
      if (!container) return;

      if (data.queue.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-xs text-slate-500">KYC compliance queue is clean. All identity submissions reviewed.</div>`;
        return;
      }

      container.innerHTML = data.queue.map(k => `
        <div class="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-amber-400"></span>
              <span class="font-bold text-white text-sm">${k.fullName}</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">${k.documentType}</span>
            </div>
            <div class="text-xs text-slate-400 font-mono">
              Email: <span class="text-amber-400">${k.userEmail}</span> | Number: ${k.documentNumber} | Submitted: ${new Date(k.submittedAt).toLocaleDateString()}
            </div>
          </div>
          <button onclick="app.inspectKyc('${k.id}', '${k.fullName}', '${k.userEmail}', '${k.documentType}', '${k.documentNumber}', '${k.documentFrontUrl}', '${k.documentBackUrl}', '${k.selfieUrl}')" class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-lg transition shadow-md shadow-purple-600/20">
            Inspect & Verify
          </button>
        </div>
      `).join('');
    } catch (err) {
      console.error(err);
    }
  }

  inspectKyc(id, name, email, docType, docNum, front, back, selfie) {
    document.getElementById('inspectKycId').value = id;
    document.getElementById('inspectKycName').textContent = name;
    document.getElementById('inspectKycEmail').textContent = email;
    document.getElementById('inspectKycDocType').textContent = docType;
    document.getElementById('inspectKycDocNumber').textContent = docNum;
    document.getElementById('inspectKycFrontImg').src = front;
    document.getElementById('inspectKycBackImg').src = back;
    document.getElementById('inspectKycSelfieImg').src = selfie;
    document.getElementById('inspectKycRejectReason').value = '';

    document.getElementById('adminKycModal').classList.remove('hidden');
    lucide.createIcons();
  }

  async adminDecideKyc(decision) {
    const id = document.getElementById('inspectKycId').value;
    const rejectionReason = document.getElementById('inspectKycRejectReason').value.trim();

    if (decision === 'REJECTED' && !rejectionReason) {
      this.showToast('Please provide a specific rejection reason note.', 'error');
      return;
    }

    try {
      const res = await this.api(`/api/admin/kyc/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision, rejectionReason })
      });

      this.closeModal('adminKycModal');
      this.showToast(res.message, 'success');
      this.loadAdminKycQueue();
      this.loadAdminAnalytics();
    } catch (err) {
      // error handled in api()
    }
  }

  async loadAdminWithdrawals() {
    try {
      const data = await this.api('/api/admin/withdrawals');
      const container = document.getElementById('adminWithdrawalsList');
      if (!container) return;

      if (data.withdrawals.length === 0) {
        container.innerHTML = `<div class="p-6 text-center text-xs text-slate-500">No pending withdrawal authorizations.</div>`;
        return;
      }

      container.innerHTML = data.withdrawals.map(w => `
        <div class="p-4 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-rose-400"></span>
              <span class="font-bold text-white text-sm">${w.amountBtc} BTC</span>
              <span class="text-[10px] font-mono text-slate-400">≈ $${w.amountUsd?.toLocaleString()}</span>
            </div>
            <div class="text-xs text-slate-400 font-mono">
              User: <span class="text-amber-400">${w.userEmail}</span> | Network: ${w.network}
            </div>
            <div class="text-[10px] text-slate-500 font-mono truncate max-w-sm">
              Dest: ${w.address}
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button onclick="app.adminDecideWithdrawal('${w.id}', 'APPROVED')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition">
              Authorize Broadcast
            </button>
            <button onclick="app.adminDecideWithdrawal('${w.id}', 'REJECTED')" class="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition">
              Reject & Refund
            </button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error(err);
    }
  }

  async adminDecideWithdrawal(id, decision) {
    try {
      const res = await this.api(`/api/admin/withdrawals/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision })
      });
      this.showToast(res.message, 'success');
      this.loadAdminWithdrawals();
      this.loadAdminAnalytics();
    } catch (err) {
      // error handled in api()
    }
  }

  async loadAdminUsers() {
    try {
      const search = document.getElementById('adminUserSearch')?.value || '';
      const data = await this.api(`/api/admin/users?search=${encodeURIComponent(search)}`);
      const tbody = document.getElementById('adminUserTableBody');
      if (!tbody) return;

      tbody.innerHTML = data.users.map(u => `
        <tr class="hover:bg-slate-900/40 transition">
          <td class="py-3 px-4">
            <div class="font-bold text-white">${u.fullName || 'Trader'}</div>
            <div class="text-slate-400 text-[10px] font-mono">${u.email}</div>
          </td>
          <td class="py-3 px-4 font-mono font-semibold">${u.role}</td>
          <td class="py-3 px-4">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono ${u.emailVerified ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}">
              ${u.emailVerified ? 'Verified' : 'Unverified'}
            </span>
          </td>
          <td class="py-3 px-4">
            <span class="px-1.5 py-0.5 rounded text-[10px] font-mono ${u.kycStatus === 'APPROVED' ? 'text-emerald-400 bg-emerald-500/10' : u.kycStatus === 'PENDING' ? 'text-amber-400 bg-amber-500/10' : 'text-rose-400 bg-rose-500/10'}">
              ${u.kycStatus}
            </span>
          </td>
          <td class="py-3 px-4 font-mono text-emerald-400 font-bold">${u.portfolio?.availableBalanceBtc || 0} BTC</td>
          <td class="py-3 px-4 font-mono text-sky-400">${u.portfolio?.lockedInPlansBtc || 0} BTC</td>
          <td class="py-3 px-4 text-right">
            <button onclick="app.openAdminUserModal('${u.id}', '${u.email}', ${u.portfolio?.availableBalanceBtc || 0}, '${u.kycStatus}', '${u.role}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded transition">
              Edit
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error(err);
    }
  }

  openAdminUserModal(id, email, avail, kyc, role) {
    document.getElementById('adminUserId').value = id;
    document.getElementById('adminUserModalEmail').textContent = email;
    document.getElementById('adminUserAvailBtc').value = avail;
    document.getElementById('adminUserKycStatus').value = kyc;
    document.getElementById('adminUserRole').value = role;
    document.getElementById('adminUserModal').classList.remove('hidden');
    lucide.createIcons();
  }

  async handleAdminUserUpdate(e) {
    e.preventDefault();
    const id = document.getElementById('adminUserId').value;
    const availableBalanceBtc = parseFloat(document.getElementById('adminUserAvailBtc').value);
    const kycStatus = document.getElementById('adminUserKycStatus').value;
    const role = document.getElementById('adminUserRole').value;

    try {
      const res = await this.api(`/api/admin/users/${id}/adjust-balance`, {
        method: 'POST',
        body: JSON.stringify({ availableBalanceBtc, kycStatus, role })
      });
      this.closeModal('adminUserModal');
      this.showToast(res.message, 'success');
      this.loadAdminUsers();
      this.loadAdminAnalytics();
    } catch (err) {
      // error handled in api()
    }
  }

  // Main UI Render Controller
  render() {
    const userView = document.getElementById('userView');
    const adminView = document.getElementById('adminView');
    const authProfile = document.getElementById('authProfileContainer');
    const unauthProfile = document.getElementById('unauthContainer');

    if (!this.currentUser) {
      if (authProfile) authProfile.classList.add('hidden');
      if (unauthProfile) unauthProfile.classList.remove('hidden');
      if (userView) userView.classList.add('hidden');
      if (adminView) adminView.classList.add('hidden');
      return;
    }

    if (authProfile) authProfile.classList.remove('hidden');
    if (unauthProfile) unauthProfile.classList.add('hidden');

    // Update avatar and name
    const initials = (this.currentUser.fullName || this.currentUser.email).substring(0, 2).toUpperCase();
    document.getElementById('userAvatar').textContent = initials;
    document.getElementById('userFullName').textContent = this.currentUser.fullName || this.currentUser.email;

    const roleBadge = document.getElementById('userRoleBadge');
    roleBadge.textContent = this.currentUser.role;
    roleBadge.className = `text-[9px] font-mono px-1 rounded ${this.currentUser.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-300'}`;

    const kycBadge = document.getElementById('userKycBadge');
    kycBadge.textContent = `KYC ${this.currentUser.kycStatus}`;
    if (this.currentUser.kycStatus === 'APPROVED') {
      kycBadge.className = 'text-[9px] font-mono px-1 rounded bg-emerald-500/20 text-emerald-400';
    } else if (this.currentUser.kycStatus === 'PENDING') {
      kycBadge.className = 'text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-400';
    } else {
      kycBadge.className = 'text-[9px] font-mono px-1 rounded bg-rose-500/20 text-rose-400';
    }

    // Role-based view switching
    if (this.currentUser.role === 'ADMIN') {
      if (userView) userView.classList.add('hidden');
      if (adminView) adminView.classList.remove('hidden');

      this.loadAdminAnalytics();
      this.loadAdminKycQueue();
      this.loadAdminWithdrawals();
      this.loadAdminUsers();
    } else {
      if (userView) userView.classList.remove('hidden');
      if (adminView) adminView.classList.add('hidden');

      this.renderKycBanner();
      this.updatePortfolioDisplay();
      this.updateCalculator();
      this.loadStakingPlans();
      this.loadActiveContracts();
      this.loadTransactions();
    }

    lucide.createIcons();
  }

  showDashboard() {
    this.render();
  }

  renderKycBanner() {
    const banner = document.getElementById('kycBanner');
    const title = document.getElementById('kycBannerTitle');
    const msg = document.getElementById('kycBannerMsg');
    const icon = document.getElementById('kycBannerIcon');
    const btn = document.getElementById('kycBannerActionBtn');

    if (!banner || !this.currentUser) return;

    if (this.currentUser.kycStatus === 'APPROVED') {
      banner.classList.add('hidden');
      return;
    }

    banner.classList.remove('hidden');

    if (this.currentUser.kycStatus === 'PENDING') {
      banner.className = 'rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4';
      icon.className = 'mt-0.5 p-2 rounded-lg bg-amber-500/20 text-amber-400';
      icon.innerHTML = `<i data-lucide="clock" class="w-5 h-5"></i>`;
      title.textContent = 'KYC Verification Under Review';
      title.className = 'font-bold text-sm text-amber-300';
      msg.textContent = 'Your identity documents are currently queued for administrative verification. Deposits and withdrawals will unlock upon approval.';
      btn.textContent = 'Submission Pending';
      btn.className = 'text-xs font-semibold px-4 py-2 rounded-lg bg-slate-800 text-slate-400 cursor-not-allowed';
      btn.disabled = true;
    } else if (this.currentUser.kycStatus === 'REJECTED') {
      banner.className = 'rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4';
      icon.className = 'mt-0.5 p-2 rounded-lg bg-rose-500/20 text-rose-400';
      icon.innerHTML = `<i data-lucide="alert-octagon" class="w-5 h-5"></i>`;
      title.textContent = 'KYC Submission Rejected';
      title.className = 'font-bold text-sm text-rose-300';
      msg.textContent = 'Your previous verification documents did not meet compliance requirements. Please resubmit clear documentation.';
      btn.textContent = 'Resubmit KYC Documents';
      btn.className = 'text-xs font-semibold px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition';
      btn.disabled = false;
    } else {
      // UNVERIFIED
      banner.className = 'rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4';
      icon.className = 'mt-0.5 p-2 rounded-lg bg-amber-500/20 text-amber-400';
      icon.innerHTML = `<i data-lucide="shield-alert" class="w-5 h-5"></i>`;
      title.textContent = 'Identity Compliance Required';
      title.className = 'font-bold text-sm text-amber-300';
      msg.textContent = 'Please complete KYC identity verification to unlock Bitcoin deposits, withdrawals, and staking allocations.';
      btn.textContent = 'Complete KYC Now';
      btn.className = 'text-xs font-semibold px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition';
      btn.disabled = false;
    }
  }

  updatePortfolioDisplay() {
    const pf = this.currentUser?.portfolio || { totalBalanceBtc: 0, availableBalanceBtc: 0, lockedInPlansBtc: 0 };

    const totalEl = document.getElementById('portfolioTotalBtc');
    const lockedEl = document.getElementById('portfolioLockedBtc');
    const availEl = document.getElementById('portfolioAvailBtc');

    if (totalEl) totalEl.textContent = pf.totalBalanceBtc.toFixed(8);
    if (lockedEl) lockedEl.textContent = pf.lockedInPlansBtc.toFixed(8);
    if (availEl) availEl.textContent = pf.availableBalanceBtc.toFixed(8);

    this.updatePortfolioUsd();
  }

  updatePortfolioUsd() {
    const pf = this.currentUser?.portfolio || { totalBalanceBtc: 0, availableBalanceBtc: 0, lockedInPlansBtc: 0 };
    const totalUsd = document.getElementById('portfolioTotalUsd');
    const lockedUsd = document.getElementById('portfolioLockedUsd');
    const availUsd = document.getElementById('portfolioAvailUsd');

    if (totalUsd) totalUsd.textContent = `$${(pf.totalBalanceBtc * this.btcPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (lockedUsd) lockedUsd.textContent = `$${(pf.lockedInPlansBtc * this.btcPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (availUsd) availUsd.textContent = `$${(pf.availableBalanceBtc * this.btcPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

// Initialize Application on DOM Ready
let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new SatoshiYieldApp();
});
