# BookMySlot

BookMySlot is a full-stack service booking and scheduling management platform featuring distinct Customer and Admin portals, real-time availability slot locking, test-mode Stripe payment integration, interactive analytics, and responsive cross-device views.

---

## 🌐 Live Production Links

* 🚀 **Live Web Application**: [https://book-my-slot-mu.vercel.app](https://book-my-slot-mu.vercel.app)
* ⚙️ **Live Backend API**: [https://bookmyslot-production.up.railway.app](https://bookmyslot-production.up.railway.app)
* 📦 **GitHub Repository**: [https://github.com/akshat3021/BookMySlot.git](https://github.com/akshat3021/BookMySlot.git)

### 🔑 Live Demo Credentials

| Role | Email / Login ID | Password | Access & Features |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@bookmyslot.com` | `secureadminpass` | Full Admin Dashboard, Manage Services, Create/Delete Slots, View Analytics |
| **Customer** | `jane.miller@outlook.com` | `password123` | Service Explorer, Slot Reservations, Stripe Checkout, Reschedule & Cancel |

---

## Tech Stack

*   **Frontend**: React (Vite), Vanilla CSS (Custom Design System with responsive media queries), Recharts (Analytics Data Visualization).
*   **Backend**: Node.js, Express, PostgreSQL (`pg` connection pool), `jsonwebtoken` (JWT Authentication), `bcryptjs` (Password Hashing), `dotenv`, Custom Rate Limiting middleware.
*   **Payments**: Stripe Checkout Sessions & Webhooks (`stripe` SDK with raw signature verification).
*   **Database**: PostgreSQL (v13+) using UUID primary keys, foreign key constraints, and atomic transaction locks (`SELECT FOR UPDATE`).

---

## Prerequisites

*   **Node.js**: v18 or higher
*   **npm**: v9 or higher
*   **PostgreSQL**: v13 or higher (listening on port 5432)

---

## Setup & Installation

### 1. Environment Configuration

1.  **Backend Environment File**:
    Copy `backend/.env.example` to `backend/.env`:
    ```bash
    cp backend/.env.example backend/.env
    ```
    Configure your local PostgreSQL credentials in `backend/.env`:
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
    STRIPE_SECRET_KEY=sk_test_mock_key
    STRIPE_WEBHOOK_SECRET=whsec_mock_key
    FRONTEND_URL=http://localhost:3000
    ```

2.  **Frontend Environment File**:
    Copy `frontend/.env.example` to `frontend/.env`:
    ```bash
    cp frontend/.env.example frontend/.env
    ```
    Ensure the backend endpoint URL is set:
    ```env
    VITE_API_URL=http://127.0.0.1:5000
    ```

---

### 2. Database Creation & Schema Migrations

1.  **Create Database**:
    ```bash
    createdb -U postgres bookmyslot
    ```
2.  **Apply Core Schema**:
    ```bash
    psql -U postgres -d bookmyslot -f db/init.sql
    ```
3.  **Apply Status Migration**:
    ```bash
    psql -U postgres -d bookmyslot -f db/completed_status.sql
    ```

---

### 3. Demo Data Seeding & Admin Creation

1.  **Seed Demo Data**:
    Populate active/deactivated services, availability slots, realistic customer accounts, past/upcoming/cancelled bookings, and payment records:
    ```bash
    cd backend
    node src/scripts/seedDemoData.js --confirm-seed
    ```
    *Seeded Credentials:*
    *   **Admin**: `admin@bookmyslot.com` / `secureadminpass`
    *   **Customer**: `jane.miller@outlook.com` / `password123`
    *   **Customer**: `marcus.chen@gmail.com` / `password123`

2.  **Create Custom Admin Account (Optional CLI)**:
    ```bash
    node backend/src/scripts/createAdmin.js <email> <password> <first_name> <last_name>
    ```

3.  **Database Backup Utility**:
    Generate a timestamped SQL dump in `db/backups/`:
    ```bash
    node db/backup.js
    ```

---

## Running Locally

1.  **Start Backend Server**:
    ```bash
    cd backend
    npm install
    npm run dev
    ```
    *(Backend API runs at `http://localhost:5000`)*

2.  **Start Frontend Client**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    *(Frontend application runs at `http://localhost:3000`)*

---

## Architecture & Data Flow

*   **Frontend (Client Layer)**:
    *   React Single-Page Application (SPA) served via Vite on port 3000.
    *   Manages user authentication tokens in `localStorage` and injects `Authorization: Bearer <token>` into outgoing requests via a central `apiFetch` wrapper.
    *   Renders role-based UI views (Public Service Explorer, Customer Booking Dashboard, Admin Control Center with Bookings Table, Services Manager, Slots Manager, and Recharts Analytics).

*   **Backend (API Layer)**:
    *   Express REST API server listening on port 5000.
    *   Enforces security middleware: `cors` (locked to `FRONTEND_URL`), `rateLimiter` (on auth/contact endpoints), `authenticateToken` (JWT verification), and `requireRole` (RBAC authorization).
    *   Enforces domain rules server-side: 24-hour limit on confirmed booking modifications, partial PUT updates, status transition rules (`confirmed` -> `completed`), and input sanitization.

*   **Payment Processing**:
    *   Creates test-mode Stripe Checkout Sessions (`/api/payments/checkout-session`) returning redirect URLs to the client.
    *   Listens for Stripe webhook events (`/api/payments/webhook`), validates raw HMAC signatures using `stripe.webhooks.constructEvent`, and performs idempotency checks before updating payment logs.

*   **Database (Data Layer)**:
    *   PostgreSQL relational store tracking `users`, `services`, `availability_slots`, `bookings`, and `payments`.
    *   Executes atomic transactions (`BEGIN` ... `COMMIT`) with row-level locks (`SELECT ... FOR UPDATE`) during slot reservations and reschedules to guarantee zero double-booking race conditions under high concurrency.
