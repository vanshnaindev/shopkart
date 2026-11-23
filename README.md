# ShopKart

MERN-style e-commerce platform: **React 19 + Vite + Tailwind v4** frontend and an **Express + TypeScript** REST API backend.

```
shopkart/
├── frontend/   React app (Vite dev server on :5173, proxies /api -> backend)
├── backend/    Express API (:5000), embedded JSON store or MongoDB (Mongoose)
├── docker-compose.mongo.yml  Local single-node replica set for MongoDB
└── package.json  root scripts
```

## Quick start

Requires Node.js 18+ (tested on Node 22 and Node 24).

```bash
npm install        # installs root, backend and frontend dependencies
npm run dev        # starts API on :5000 and web app on :5173
```

Open http://localhost:5173

Optional: `cp backend/.env.example backend/.env` to configure `JWT_SECRET`, `MONGODB_URI`, Razorpay keys, etc.
With no `MONGODB_URI`, the API automatically uses a high-performance embedded JSON store (`backend/src/data/store.json`, created on first run and seeded automatically).

## Demo accounts

| Role     | Email                 | Password          |
| -------- | --------------------- | ----------------- |
| Admin    | admin@shopkart.com    | AdminPassword123! |
| Customer | customer@shopkart.com | Customer123!      |

## Scripts (run from `shopkart/`)

| Command                                        | What it does                                                                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                  | API + web together                                                                                                                                   |
| `npm run dev:backend` / `npm run dev:frontend` | one side only                                                                                                                                        |
| `npm run build`                                | production build of the frontend (`frontend/dist`)                                                                                                   |
| `npm run seed`                                 | reset the data store to pristine seed data (works on JSON and MongoDB)                                                                               |
| `npm run lint`                                 | Lint checks across both apps (`eslint src/` and `tsc --noEmit`)                                                                                      |
| `npm run format`                               | Format all files across the repository using Prettier                                                                                                |
| `npm run format:check`                         | Verify formatting compliance across all files using Prettier                                                                                         |
| `npm test`                                     | Run automated Vitest + Supertest test suite covering auth, cart, orders, coupons, payments, admin, validation, security                              |
| `npm run test:coverage`                        | Run automated test suite with coverage reporting on `backend/src/routes`                                                                             |
| `npm run test:smoke`                           | Phase 1 API contract smoke test (auth, catalog, cart, wishlist)                                                                                      |
| `npm run test:smoke2`                          | Phase 2 contract smoke test (orders, coupons, payments, stock safety, cancel/return, RBAC)                                                           |
| `npm run test:smoke3`                          | Phase 3 contract smoke test (admin portal, analytics, product/category/coupon CRUD, inventory audit, reviews moderation, reports CSV escaping, RBAC) |
| `npm run test:all-modes`                       | Automated test runner executing Phase 1, 2, and 3 smoke suites across **BOTH** JSON store and MongoDB modes (244 tests per mode, 488 total)          |
| `npm run migrate:json-to-mongo`                | Migrates data from `store.json` to MongoDB idempotently                                                                                              |

## Storage Backends & Repository Architecture

ShopKart features a unified repository pattern (`backend/src/repository/types.ts`) with two swappable implementations:

1. **Embedded JSON Store (`JsonRepository`)**: Lightweight, zero-dependency persistence layer using `backend/src/data/store.json`. Ideal for quick prototyping, local dev without Docker, and resource-constrained environments.
2. **MongoDB / Mongoose (`MongoRepository`)**: Production-grade document store with schema validation, indexes, atomic stock decrement, and multi-document ACID transactions.

### How Storage Mode Selection Works

At startup, the backend checks the `MONGODB_URI` environment variable:

- If `MONGODB_URI` is **unset or empty**: Launches in `json` mode and logs `ℹ️ MONGODB_URI not provided; running high-performance embedded persistent JSON store (mode: json).`
- If `MONGODB_URI` is **set**: Connects via Mongoose, validates the connection, and logs `🚀 Connected to MongoDB successfully. Running with Mongoose repository (mode: mongodb).` If connection fails, it safely falls back to JSON store.
- Current storage mode is inspectable at runtime via `GET /api/health` under the `storageMode` property (`"json" | "mongodb"`).

### MongoDB Features & Optimizations

- **Atomic Stock Decrement:** Stock deduction during order placement uses `findOneAndUpdate({ _id: productId, stock: { $gte: quantity } }, { $inc: { stock: -quantity } })`, preventing race conditions and overselling even under high concurrency.
- **Transactions & Standalone Fallback:** Orders and restock operations execute inside multi-document ACID transactions when connected to a replica set (including MongoDB Atlas and our local compose setup). If running against a standalone mongod without replica set support, the repository automatically falls back to conditional atomic updates.
- **Indexing:**
  - Unique indexes: `User.email`, `Product.slug`, `Product.sku`, `Coupon.code`, `InventoryLog.id`.
  - Full-text search index: `Product` text index covering `name`, `description`, `brand`, and `tags`.
  - Filter and sort indexes: `Product` compound index on `category`, `price`, `averageRating`, `createdAt`; `Order` compound index on `userId` and `createdAt`.
- **Response Shape Preservation:** All models map MongoDB's `_id` to string identifiers matching the exact TypeScript interfaces expected by the frontend.

## Setting Up MongoDB

### Option A: Local MongoDB with Docker Compose (Recommended for Local Dev)

We provide a `docker-compose.mongo.yml` configuration with a single-node replica set (`rs0`) required for MongoDB multi-document transactions:

```bash
# Start MongoDB replica set container on port 27017
docker compose -f docker-compose.mongo.yml up -d

# Check health (replica set initiates automatically)
docker compose -f docker-compose.mongo.yml ps

# Set MONGODB_URI in backend/.env or your terminal:
MONGODB_URI="mongodb://localhost:27017/shopkart?replicaSet=rs0&directConnection=true"

# Seed the database
npm run seed

# Run dev server with MongoDB
npm run dev

# Stop the container when finished
docker compose -f docker-compose.mongo.yml down
```

### Option B: MongoDB Atlas (Cloud)

MongoDB Atlas provides fully managed multi-node replica sets with transaction support out of the box.

1. **Create an Account and Cluster:**
   - Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
   - Create a free shared cluster (M0 sandbox).
2. **Configure Database Access:**
   - Navigate to **Security** -> **Database Access**.
   - Add a database user (e.g. `shopkart_admin`) with password authentication and `readWriteAnyDatabase` privileges.
3. **Configure Network Access:**
   - Navigate to **Security** -> **Network Access**.
   - Add an IP address entry (allow `0.0.0.0/0` for cloud deployment or your specific IP for development).
4. **Obtain Connection String:**
   - Go to **Database** -> **Connect** -> **Drivers** (Node.js).
   - The connection string follows this format:
     ```
     mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/shopkart?retryWrites=true&w=majority
     ```
   - Replace `<username>`, `<password>`, and `<cluster-name>` with your credentials.
5. **Set in `backend/.env`:**
   ```env
   MONGODB_URI=mongodb+srv://shopkart_admin:YourSecurePassword@cluster0.abcde.mongodb.net/shopkart?retryWrites=true&w=majority
   ```
6. **Seed & Run:**
   ```bash
   npm run seed
   npm run dev
   ```

## Data Migration: JSON Store to MongoDB

If you have existing data in `backend/src/data/store.json` and want to migrate it into MongoDB:

```bash
# Migrate using the URI configured in backend/.env (or specify MONGODB_URI explicitly):
MONGODB_URI="mongodb://localhost:27017/shopkart?replicaSet=rs0&directConnection=true" npm run migrate:json-to-mongo
```

The migration script (`backend/scripts/migrate-json-to-mongo.ts`):

- Connects to MongoDB.
- Reads `store.json`.
- Migrates Users (preserving bcrypt hashed passwords and addresses).
- Migrates Categories, Products, Coupons, Orders, Reviews, and Inventory Logs.
- Uses idempotent `$set` and `upsert: true` operations so it is completely safe to run multiple times without duplicating records or corrupting state.

## How the frontend talks to the backend

The frontend calls relative `/api/...` URLs (`frontend/src/services/api.ts`). In development Vite proxies them to `http://localhost:5000` (override with `VITE_API_PROXY_TARGET` in `frontend/.env`). JWT is sent as `Authorization: Bearer <token>`.

## Phases

| Phase | Scope                                                                                                                                                            | Status  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 1     | Foundation and wiring: project structure, proxy, dependency cleanup, one-command dev, contract tests for auth, catalog, cart, wishlist                           | Done    |
| 2     | Orders, coupons, payments (price recalculation, stock safety, cancel/return, Razorpay)                                                                           | Done    |
| 3     | Admin portal (analytics, CRUD, inventory logs, reports)                                                                                                          | Done    |
| 4     | Real MongoDB (Mongoose) live path: unified repository abstraction, atomic stock decrement, replica set transactions, indexing, migration utility, docker-compose | Done    |
| 5     | Security hardening, defensive middleware, authentication rules, lockout, and automated Vitest/Supertest test suites                                              | Done    |
| 6     | Docker and deployment                                                                                                                                            | Planned |
