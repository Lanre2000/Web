# SatoshiYield BTC Investment Web Application
## Technical Implementation Plan & System Specification

---

## 1. Executive Summary & Architecture Overview

The **SatoshiYield Bitcoin Investment Web Application** is an enterprise-grade cryptocurrency yield generation and staking management platform. The platform features real-time Bitcoin price streaming, interactive compounding yield calculators, multi-tiered lockup contracts, email-based OTP verification, Know Your Customer (KYC) identity compliance, and Role-Based Access Control (RBAC) separating **User** and **Admin** dashboards.

### System Architecture Diagram

```
                                    ┌────────────────────────┐
                                    │ Single-Page Web App    │
                                    │  (Tailwind CSS / JS)   │
                                    └───────────┬────────────┘
                                                │
                                    ┌───────────▼────────────┐
                                    │  RBAC Auth Router      │
                                    └─────┬────────────┬─────┘
                                          │            │
                   ┌──────────────────────┴┐          ┌┴──────────────────────┐
                   │    User Dashboard     │          │    Admin Dashboard    │
                   └──────────┬────────────┘          └──────────┬────────────┘
                              │                                  │
    ┌─────────────────────────┼────────────────────────┐         │
    │                         │                        │         │
┌───▼─────────────┐   ┌───────▼────────┐   ┌───────────▼──┐   ┌──▼─────────────┐
│ Auth & Email    │   │ Portfolio &    │   │ KYC          │   │ System Control │
│ Verification    │   │ Yield Engine   │   │ Submissions  │   │ & Approvals    │
└─────────────────┘   └────────────────┘   └──────────────┘   └────────────────┘
```

---

## 2. Technology Stack & Component Dependencies

| Layer | Technology / Dependency | Operational Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | HTML5, Tailwind CSS, Lucide Icons | Responsive UI with custom dark mode theme (`#0B0E14` base). |
| **Charting Engine** | Chart.js v4.x | Real-time BTC market price graphs with 24H, 7D, 30D, and 1Y timeframe toggles. |
| **QR Code Engine** | QRCode.js | Dynamic client-side QR code rendering for BTC, Lightning, and BEP20 deposit addresses. |
| **Authentication** | JWT, Bcrypt, NodeMailer / SendGrid | Role-based token validation, password hashing, and 6-digit email OTP delivery. |
| **Backend API Layer** | Node.js (Express) or Python (FastAPI) | REST APIs for staking contracts, wallet operations, and KYC document workflows. |
| **Database & Storage** | PostgreSQL + Encrypted Cloud Bucket (S3) | Relational ledger tracking and secure, encrypted storage for identity documents. |

---

## 3. Dual Dashboard Architecture (RBAC)

Access is strictly controlled by JWT role claims (`USER` vs `ADMIN`).

### A. User Dashboard Specifications
1. **Portfolio Overview Banner**:
   - Total Portfolio Value (USD & BTC equivalent).
   - Total Staked Balance & Cumulative Earnings.
   - Unlocked Available Liquidity.
2. **Interactive Market Chart**:
   - Real-time simulated price ticker.
   - Timeframe toggles (24H, 7D, 30D, 1Y).
   - 24h High, 24h Low, and Network Hashrate metrics.
3. **Compounding ROI Calculator**:
   - Dynamic sliders for deposit amount ($100 – $50,000) and lockup term (7 – 180 days).
   - Auto-compounding interest toggle using formula: $A = P \times (1 + r)^t$.
4. **Staking Contracts Panel**:
   - Tier selection: *Starter Hodler* (1.5%/d), *Pro Trader* (2.5%/d), *Whale Yield* (3.8%/d), *Institutional* (5.0%/d).
   - Live progress indicator for active lockups.
5. **Deposit & Withdrawal Engine**:
   - Network selection: Native SegWit, Lightning Network, BEP20.
   - Dynamic QR code generation & clipboard copy.
   - Withdrawal request interface validated against unlocked available liquidity.
6. **Searchable Personal Audit Ledger**:
   - Search by transaction hash, amount, or type filter.

### B. Admin Dashboard Specifications
1. **Global Platform Analytics**:
   - Total Assets Under Management (AUM in BTC and USD).
   - Count of active users, open staking contracts, and active network yield payouts.
2. **KYC Verification Approval Queue**:
   - Side-by-side view of user profile data and uploaded identity documents (ID/Passport + Selfie).
   - Actions: `Approve` or `Reject` (with required rejection reason feedback).
3. **Financial Control & Withdrawal Approvals**:
   - Queue of pending withdrawal requests.
   - On-chain transaction confirmation trigger and manual adjustment capability.
4. **User Account Management**:
   - Searchable user database.
   - View/edit user balances, override KYC status, or suspend accounts.
5. **Platform Yield Configurator**:
   - Ability to modify daily interest rates, contract terms, and minimum/maximum tier bounds globally.

---

## 4. Authentication, Email OTP & KYC Compliance Pipeline

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Authentication Workflow                         │
└────────────────────────────────────────────────────────────────────────┘
 [User Signs Up] ──> [Send 6-Digit Email OTP] ──> [Input OTP Verification]
                                                          │
                                                          ▼
                                              [emailVerified = true]
                                                          │
                                                          ▼
                                                [Access Dashboard]

┌────────────────────────────────────────────────────────────────────────┐
│                          KYC Review Workflow                           │
└────────────────────────────────────────────────────────────────────────┘
 [Upload ID + Selfie] ──> [Status: PENDING] ──> [Admin Queue Review]
                                                      │
                            ┌─────────────────────────┴────────────────────────┐
                            ▼                                                  ▼
                    [Admin Approves]                                   [Admin Rejects]
                            │                                                  │
                            ▼                                                  ▼
                  [kycStatus = APPROVED]                            [kycStatus = REJECTED]
             (Full Deposit/Withdraw Access)                     (Feedback Note Sent)
```

### Flow Rules & Security Enforcements
1. **Email OTP Verification**:
   - OTP consists of a cryptographically generated 6-digit numeric code.
   - Valid for 10 minutes from dispatch.
   - Maximum 3 resend attempts per hour per IP address.
   - Unverified accounts cannot access dashboard features or execute trades.
2. **KYC Compliance Gating**:
   - States: `UNVERIFIED` $\rightarrow$ `PENDING` $\rightarrow$ `APPROVED` / `REJECTED`.
   - Users with `UNVERIFIED` or `PENDING` status can explore market metrics and calculators, but deposits, staking activations, and withdrawals remain strictly disabled until `APPROVED`.

---

## 5. Database Schema & Data Models

### `Users` Table
| Column | Type | Constraints / Details |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `email` | String | Unique, Indexed |
| `passwordHash` | String | Bcrypted |
| `role` | Enum | `'USER'` \| `'ADMIN'` |
| `emailVerified` | Boolean | Default: `false` |
| `kycStatus` | Enum | `'UNVERIFIED'` \| `'PENDING'` \| `'APPROVED'` \| `'REJECTED'` |
| `createdAt` | Timestamp | Default: `NOW()` |

### `EmailVerifications` Table
| Column | Type | Constraints / Details |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `email` | String | Foreign Key / Target Email |
| `codeHash` | String | Hashed 6-digit OTP |
| `expiresAt` | Timestamp | `NOW() + 10 Minutes` |
| `used` | Boolean | Default: `false` |

### `KYCSubmissions` Table
| Column | Type | Constraints / Details |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `userId` | UUID | Foreign Key linked to `Users.id` |
| `documentType` | String | Passport, Driver's License, National ID |
| `documentFrontUrl` | String | Encrypted S3 Bucket Object URL |
| `documentBackUrl` | String | Encrypted S3 Bucket Object URL |
| `selfieUrl` | String | Encrypted S3 Bucket Object URL |
| `status` | Enum | `'PENDING'` \| `'APPROVED'` \| `'REJECTED'` |
| `rejectionReason` | String | Nullable (populated on rejection) |

### `StakingContracts` Table
| Column | Type | Constraints / Details |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `userId` | UUID | Foreign Key linked to `Users.id` |
| `planName` | String | Starter, Pro, Whale, Institutional |
| `stakedAmountUsd` | Decimal | Amount locked |
| `dailyRatePercent` | Decimal | e.g., 2.50 |
| `durationDays` | Integer | e.g., 14 |
| `startDate` | Timestamp | Lockup start |
| `endDate` | Timestamp | Lockup maturity |
| `status` | Enum | `'ACTIVE'` \| `'COMPLETED'` \| `'TERMINATED'` |

### `Transactions` Table
| Column | Type | Constraints / Details |
| :--- | :--- | :--- |
| `id` | UUID | Primary Key |
| `userId` | UUID | Foreign Key linked to `Users.id` |
| `type` | Enum | `'DEPOSIT'` \| `'WITHDRAWAL'` \| `'YIELD_PAYOUT'` |
| `amountUsd` | Decimal | USD Equivalent |
| `amountBtc` | Decimal | BTC Value |
| `txHash` | String | On-chain Transaction Hash |
| `status` | Enum | `'PENDING'` \| `'COMPLETED'` \| `'FAILED'` |
| `createdAt` | Timestamp | Creation timestamp |

---

## 6. Development Phases & Implementation Roadmap

```
Phase 1: Auth & OTP Engine
 └── Phase 2: Dual Dashboard & RBAC Routing
      └── Phase 3: KYC Pipeline & Admin Queue
           └── Phase 4: Staking Engine & Calculators
                └── Phase 5: Wallet Ops & CSV Audit Reports
```

1. **Phase 1: Authentication & Email OTP Engine**:
   - Sign-up & sign-in page development.
   - Integration of SMTP server for OTP dispatch and verification code check endpoint.
2. **Phase 2: RBAC & Dashboard Scaffolding**:
   - Implement frontend router checking JWT claims.
   - Build User Dashboard overview and Admin Dashboard base view.
3. **Phase 3: KYC Submission & Admin Verification Subsystem**:
   - Multi-step document upload interface with client-side image compression.
   - Admin verification interface with approve/reject triggers.
4. **Phase 4: Yield Staking Engine & Interactive Calculators**:
   - Chart.js market chart initialization with timeframes.
   - Compound ROI calculation sliders and contract activation logic.
5. **Phase 5: Financial Operations, Ledger & Audit Reporting**:
   - Deposit QR code engine, withdrawal modal validation.
   - Real-time searchable transaction ledger with CSV export capabilities.

---

## 7. GEMINI.md Compliance Verification Checklist

- [x] Sign-up flow sends a 6-digit OTP code to the user's email before granting dashboard access.
- [x] Unverified email users are prevented from accessing portfolio tools.
- [x] RBAC enforcement isolates `/admin` views from standard users.
- [x] Admin dashboard provides AUM statistics, user account controls, and KYC queue management.
- [x] KYC verification required prior to processing BTC deposits or liquidity withdrawals.
- [x] Compound interest calculator implements $A = P \times (1 + r)^t$ formula.
- [x] Withdrawal requests validate that requested funds do not exceed available unlocked balance.
- [x] Searchable transaction table includes filterable categories and CSV export option.