# Slotify — Full Stack Platform (React Native + Express)

Slotify is a high-frequency real-time availability management platform for salon and studio owners, coupled with a developer/admin portal and real-time live preview.

---

## Workspace Structure

```
d:/Slotify/
├── backend/                  # Plain Node.js + Express.js API & Socket.io server
│   ├── src/
│   │   ├── controllers/      # auth, shop, and admin controllers
│   │   ├── entities/         # TypeORM entities (User, Shop, ShopDay)
│   │   ├── middleware/       # JWT authMiddleware & requireRole
│   │   ├── migrations/       # TypeORM database migrations
│   │   ├── routes/           # Express modular routers (/auth, /shops, /admin)
│   │   ├── scripts/          # Database seed script
│   │   ├── services/         # Slot generation & reconciliation logic
│   │   ├── sockets/          # Socket.io room broadcaster
│   │   ├── dataSource.ts     # TypeORM Postgres DataSource
│   │   └── server.ts         # Express + HTTP + Socket.io entry point
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                 # Expo (React Native) Mobile App
    ├── src/
    │   ├── api/              # Axios client, authApi, shopApi, adminApi, socket.ts
    │   ├── components/       # LivingStatusOrb, ExtrudedTimeline, ExtrudedSlotCard,
    │   │                     # BackgroundMesh, LivePreviewCard, DurationPicker,
    │   │                     # QuickActionsBar, WorkingHoursModal, AnimatedButton
    │   ├── context/          # AuthContext (JWT session & role routing)
    │   ├── navigation/       # AppNavigator (Role-based screen router)
    │   ├── screens/          # LoginScreen, OwnerDashboardScreen, AdminDashboardScreen,
    │   │                     # CreateShopModal, EditShopModal
    │   ├── theme/            # Obsidian/Emerald/Amber dark mode design system
    │   └── utils/            # Cross-platform SecureStore / localStorage wrapper
    ├── app.config.js         # Dynamic Expo config
    ├── App.tsx               # Root entry
    ├── package.json
    └── tsconfig.json
```

---

## Quick Start Guide

### 1. Start the Backend API (Port 5000)
```bash
cd backend
npm install
npm run seed       # Seeds admin & demo salons with live slots into PostgreSQL
npm run dev        # Launches Express + Socket.io server
```

### 2. Start the Mobile App (Expo)
In a second terminal:
```bash
cd frontend
npm install
npm run start      # Or "npm run web" to test in browser immediately
```

---

## Demo Credentials

| Role | Email | Password | Details |
|---|---|---|---|
| **Platform Admin** | `admin@slotify.com` | `admin123` | Full access to manage all shops & view platform metrics |
| **Shop Owner 1** | `owner@luxe.com` | `owner123` | Luxe Salon & Studio (30m slots, 09:00–19:00) |
| **Shop Owner 2** | `barber@apex.com` | `barber123` | Apex Barbershop & Grooming (45m slots, 10:00–20:00) |
| **Shop Owner 3** | `glow@lounge.com` | `glow123` | Glow Aesthetics Lounge (60m slots, 09:00–18:00) |

*(Quick-fill buttons for these accounts are built directly into the login screen).*

---

## Key Technical Features

1. **Schedule Reconciliation**: When an owner changes slot durations (e.g. 30m → 45m) or working hours, existing booked slots are retained and overlapping new slots are marked booked.
2. **Real-Time Pipe**: Updates in the owner panel broadcast across `shop:${id}` Socket.io rooms, updating the embedded Live Preview Card instantly.
3. **Motion Direction**:
   - Living status orb with breathing pulse.
   - Extruded 3D timeline with elevation spring for current time.
   - Departure-board split-flap `rotateX` slot flip on toggle.
   - Selection beam tracking vertical drag gestures for bulk status changes.
   - Drifting gradient-mesh background.
