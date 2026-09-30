# Slotify — Backend API & Real-time Server

High-frequency, live availability API and real-time Socket.io engine for **Slotify**. Built with plain Node.js + Express.js and PostgreSQL via TypeORM.

---

## Tech Stack & Architecture

- **Runtime**: Node.js (v20+ / v22+)
- **Framework**: Express.js (plain, direct routers, controllers, and middleware)
- **Database**: PostgreSQL with TypeORM entities & migrations
- **Authentication**: JWT (`jsonwebtoken`) with `bcrypt` password hashing
- **Real-Time Engine**: Socket.io attached directly to the Express HTTP server
- **Execution / Tooling**: TypeScript with `tsx` & TypeORM CLI

---

## Environment Variables (`.env`)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `5000` | HTTP & Socket.io server port |
| `NODE_ENV` | `development` | Runtime environment (`development` / `production`) |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_USERNAME` | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | `""` | PostgreSQL password |
| `DB_NAME` | `slotify` | PostgreSQL database name |
| `JWT_SECRET` | `...` | Secret key for signing authentication tokens |
| `CORS_ORIGIN` | `*` | Allowed CORS origins for REST & Socket.io |

---

## Setup & Running

### 1. Install dependencies
```bash
npm install
```

### 2. Prepare PostgreSQL database
Create database `slotify` if not already created:
```sql
CREATE DATABASE slotify;
```

### 3. Run migrations or seed demo data
```bash
# Run initial migration
npm run migration:run

# Seed admin and sample salon/barber shops with realistic slots
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```

The server starts on `http://localhost:5000` with Socket.io listening on the same port.
Health check: `GET http://localhost:5000/health`.

### 5. Production Build
```bash
npm run build
npm run start
```

---

## API Surface

### 1. Authentication
- `POST /auth/login` — Authenticate admin or owner, returns signed JWT and shop details.
- `GET /auth/me` — (Bearer token required) Returns authenticated user profile and managed shop.

### 2. Public Read Endpoints (For future customer website & app discovery)
- `GET /shops` — List all shops with their current live status (`available`, `busy`, `closed`), slot counts, and next available slot.
- `GET /shops/:id/status` — Get specific shop's live status, today's date, and full JSONB slots array.

### 3. Owner Endpoints (Bearer token + Owner or Admin role required)
- `PATCH /shops/:id/settings` — Update operating hours (`workingHoursStart`, `workingHoursEnd`) and `slotDurationMinutes` (15, 30, 45, 60m). Reconciles today's schedule while preserving existing bookings. Broadcasts `shop_updated` over Socket.io.
- `PATCH /shops/:id/slots` — Single slot toggle, bulk range update, or quick actions (`close_break`, `close_rest_of_today`, `open_all`). Broadcasts `shop_updated` and `slot_changed` over Socket.io channel `shop:${id}`.

### 4. Admin Endpoints (Bearer token + Admin role required)
- `GET /admin/shops` — Directory of all platform shops with owner accounts and live counts.
- `POST /admin/shops` (or `POST /admin/owners`) — Provision a new shop record and owner account in an atomic transaction.
- `PATCH /admin/shops/:id` — Update shop parameters.
- `DELETE /admin/shops/:id` — Delete a shop and associated schedule data.
- `GET /admin/stats` — Platform metrics: total shops, available count, busy count, and total slots booked today.

---

## Real-Time Socket.io Events

Subscribers join rooms keyed by `shop:${shopId}`:
- Client emits `join_shop`: `{ shopId }`
- Client emits `leave_shop`: `{ shopId }`
- Server emits `shop_updated`: Full updated shop status and slot breakdown
- Server emits `slot_changed`: Changed slot items

---

## Deliberately Deferred (Out of Scope for this Phase)

Per the build brief specifications:
- No customer-facing booking app (future one-page static website will use `GET /shops/:id/status`).
- No in-app payments (direct "Call to Book" CTA).
- No push notification service (persistent Socket.io channel handles real-time updates).
- No Redis adapter (unneeded until Socket.io scales horizontally across multiple servers).
