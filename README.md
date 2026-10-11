# BookMySlot 🗓️💳

[![Frontend Deployment](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://book-my-slot-mu.vercel.app)
[![Backend Deployment](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)](https://bookmyslot-e9gs.onrender.com)
[![Database](https://img.shields.io/badge/Database-Supabase%20PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**BookMySlot** is a full-stack, enterprise-grade appointment booking and resource scheduling management web platform. It delivers real-time slot locking, seamless Stripe payments with webhook lifecycle events, role-based Customer & Admin dashboards, interactive revenue and service analytics, and resilient cold-start handling.

---

## 📸 Preview

![BookMySlot Landing Page](docs/screenshots/landing-page.png)

---

## 🌐 Live Production Links

* 🚀 **Web App (Vercel)**: [https://book-my-slot-mu.vercel.app](https://book-my-slot-mu.vercel.app)
* ⚙️ **Backend API (Render)**: [https://bookmyslot-e9gs.onrender.com](https://bookmyslot-e9gs.onrender.com)
* 🩺 **API Health Check**: [https://bookmyslot-e9gs.onrender.com/health](https://bookmyslot-e9gs.onrender.com/health)
* 📦 **GitHub Repository**: [https://github.com/akshat3021/BookMySlot.git](https://github.com/akshat3021/BookMySlot.git)

### 🔑 Live Demo Credentials

| Role | Email / Login ID | Password | Access & Features |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@bookmyslot.com` | `secureadminpass` | Comprehensive Admin Dashboard, Services CRUD, Availability Slot Planner, Recharts Analytics |
| **Customer** | `jane.miller@outlook.com` | `password123` | Service Catalog, Interactive Slot Reservation, Stripe Checkout, Rescheduling & Cancellations |
| **Customer** | `marcus.chen@gmail.com` | `password123` | Booking history and appointments tracking |

---

## ✨ Key Features

- **Double-Booking Immunity**: Uses PostgreSQL atomic transactions with row-level locks (`SELECT ... FOR UPDATE`) to prevent concurrent booking conflicts.
- **Stripe Checkout & Webhooks**: Supports frictionless payment flows with HMAC-SHA256 signature verification and idempotency handling.
- **Role-Based Access Control (RBAC)**: Distinct permissions and token-secured navigation for Customers and Administrators.
- **Service & Slot Lifecycle Management**:
  - Soft deactivation and reactivation of services.
  - Granular slot generation with custom dates, start/end windows, and status tracking (`available`, `booked`, `blocked`).
- **Rescheduling & Cancellation Rules**: Automated business logic ensuring schedule changes respect policy windows (e.g., cancellation frees the slot immediately).
- **Interactive Analytics**: Data visualization using Recharts for booking trends, revenue distributions, and popular services.
- **Resilient Cloud Architecture**:
  - **Render (Node.js)** backend paired with an automated **UptimeRobot** monitor to prevent free-tier dyno sleeps.
  - **Supabase (PostgreSQL)** connection pooler with IPv4 session pooling and secure SSL certificate handling.
  - **Vercel** edge CDN serving the optimized React frontend.

---

## 🛠️ Tech Stack & Architecture

### **Frontend Client**
* **Framework**: React 18, Vite
* **Styling**: Vanilla CSS (Custom Design System, modern typography, responsive media queries)
* **Visualizations**: [Recharts](https://recharts.org/) (Bar charts, Line graphs, interactive tooltips)
* **State & Networking**: Native React Hooks (`useState`, `useEffect`, `useRef`), Centralized `apiFetch` with active cold-start and token expiration interceptors

### **Backend API**
* **Runtime**: Node.js, Express
* **Database Driver**: `pg` (Node-Postgres Connection Pooling with custom SSL compatibility)
* **Authentication & Security**: `jsonwebtoken` (JWT), `bcryptjs` (Salted Password Hashing), `cors`, custom request rate limiters
* **Payments SDK**: `@stripe/stripe-node` (raw buffer parsing for webhook cryptographic validation)

### **Database & Cloud Infrastructure**
* **Database Engine**: PostgreSQL 15+ (Hosted on Supabase with UUID primary keys and relational integrity)
* **Hosting**:
  * **Frontend**: [Vercel](https://vercel.com)
  * **Backend**: [Render](https://render.com)
  * **Database**: [Supabase](https://supabase.com)
  * **Liveness Monitoring**: [UptimeRobot](https://uptimerobot.com)

---

## 📐 Architecture & Concurrency Model

```mermaid
flowchart TD
    Client[React Frontend / Vercel] -->|HTTPS / REST API| API[Express API / Render]
    API -->|JWT Authentication| Auth[Auth & RBAC Middleware]
    API -->|Session Pooler IPv4| DB[(Supabase PostgreSQL)]
    Client -->|Checkout Redirect| Stripe[Stripe Checkout]
    Stripe -->|Signed Webhooks| API
    UptimeRobot[UptimeRobot Ping /health] -->|Every 10 min| API
```

* **Slot Locking Mechanism**: When reserving or rescheduling, the backend begins a transaction (`BEGIN`) and locks the target slot (`SELECT * FROM availability_slots WHERE id = $1 FOR UPDATE`). This guarantees that concurrent booking attempts are serialized, entirely eliminating race conditions.

---

## 💻 Local Development Setup

### 1. Prerequisites
* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher
* **PostgreSQL**: `v13+` (or a remote Supabase / Neon DB instance)

---

### 2. Environment Configuration

#### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
Fill in the configuration:
```env
PORT=5000
NODE_ENV=development
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bookmyslot
JWT_SECRET=super_secret_dev_key_bookmyslot_123!
JWT_EXPIRES_IN=24h
STRIPE_SECRET_KEY=sk_test_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
FRONTEND_URL=http://localhost:3000
```
*(Or specify `DATABASE_URL=postgresql://user:pass@host:5432/bookmyslot`)*

#### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:
```bash
cp frontend/.env.example frontend/.env
```
Ensure the API URL is set:
```env
VITE_API_URL=http://127.0.0.1:5000
```

---

### 3. Database Migration & Seed

1. **Run Database Migrations**:
   Execute the schema scripts located in `db/`:
   ```bash
   psql -U postgres -d bookmyslot -f db/init.sql
   psql -U postgres -d bookmyslot -f db/completed_status.sql
   psql -U postgres -d bookmyslot -f db/contact.sql
   ```

2. **Seed Demo Data**:
   Populate services, availability slots, realistic customer accounts, past/upcoming/cancelled bookings, and payment records:
   ```bash
   cd backend
   node src/scripts/seedDemoData.js --confirm-seed
   ```

---

### 4. Running the Applications

#### Start Backend
```bash
cd backend
npm install
npm run dev
```
*Backend API will run at `http://localhost:5000` (Health check: `http://localhost:5000/health`)*

#### Start Frontend
```bash
cd frontend
npm install
npm run dev
```
*Frontend application will run at `http://localhost:3000`*

---

## 📂 Project Structure

```text
BookMySlot/
├── docs/
│   └── screenshots/
│       └── landing-page.png       # Application UI preview
├── db/
│   ├── init.sql                   # Core relational schema & tables
│   ├── completed_status.sql       # Status constraint migrations
│   ├── contact.sql                # Contact messages schema
│   └── backup.js                  # Automated SQL backup utility
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # PostgreSQL pooler & SSL configuration
│   │   ├── controllers/           # Route controller logic (Auth, Bookings, Slots, etc.)
│   │   ├── middleware/            # JWT auth, rate limiter, role verification
│   │   ├── routes/                # Express endpoint definitions
│   │   ├── scripts/               # Seed scripts and DB migration helpers
│   │   └── server.js              # Express entrypoint & webhook handler
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Main application component & routing
│   │   ├── main.jsx               # React DOM entrypoint
│   │   └── index.css              # Custom responsive stylesheet & variables
│   └── package.json
├── render.yaml                    # Infrastructure-as-code for Render deployment
└── README.md
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
