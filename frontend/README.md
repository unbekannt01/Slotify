# Slotify — React Native (Expo) Mobile App

High-fidelity mobile application for salon owners and platform administrators, built with **Expo**, **React Native Reanimated (v3)**, **Gesture Handler**, and real-time **Socket.io** integration.

---

## Roles & Features

### 1. Client / Shop Owner Mode
- **Living Status Orb**: Radial glass orb at the top with a breathing pulse animation (`withRepeat(withTiming(...))`) — green for available, amber for busy, dim/static when closed.
- **Editable 3D Day Timeline**: Extruded status segments with duplicated shadow drop layers. The current-time segment is dynamically lifted upward with a Reanimated spring.
- **Split-Flap Slot Flip**: Tapping a slot executes a `rotateX` 90° flip (down → status change → back up), mimicking departure board flap mechanics.
- **Selection Beam**: Dragging across slots with pan gestures reveals a glowing highlight beam that lifts touched slots for bulk availability updates.
- **Slot Duration Selector**: Instant 15 / 30 / 45 / 60 minute duration switcher that regenerates today's grid on the server while preserving booked slots.
- **Operating Hours Controls**: Modal to adjust daily opening and closing hours.
- **Quick Availability Actions**:
  - "Take a Break" (pauses next 60m slots)
  - "Close Today" (closes remainder of the day)
  - "Open All" (reopens unbooked slots)
- **Live Customer Preview Card**: Read-only card subscribed to the shop's real-time Socket.io channel, verifying what external customers see instantaneously.

### 2. Admin / Developer Mode
- **Platform Metrics Overview**: Real-time counters for total shops, active available shops, busy shops, and slots booked today.
- **Shop Directory**: Filterable list of all onboarded shops with owner details, current status, and working hours.
- **Shop & Owner Provisioning Modal**: Atomically create new salon records and linked owner user accounts.
- **Shop Management & Edit**: Modify shop parameters or decommission shops.

### 3. Quick Demo Switching
On the login screen, single-tap preset buttons let you test both roles immediately:
- **Owner Demo (Luxe Salon)**: `owner@luxe.com` / `owner123`
- **Owner Demo (Apex Barber)**: `barber@apex.com` / `barber123`
- **Admin Demo (Platform Dev)**: `admin@slotify.com` / `admin123`

---

## Tech Stack

- **Framework**: Expo (Managed Workflow, React Native 0.86)
- **Navigation**: React Navigation (`@react-navigation/native-stack`)
- **Motion & Gestures**: `react-native-reanimated` (v3), `react-native-gesture-handler`
- **Visuals & Glass**: `expo-linear-gradient`, `expo-blur`, `@expo/vector-icons`
- **Storage**: `expo-secure-store` (with web `localStorage` fallback)
- **API & Real-Time**: `axios` with automatic JWT Bearer injection, `socket.io-client`

---

## Environment Variables (`.env`)

Copy `.env.example` to `.env`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:5000
```

> **Note for Android Emulators / Physical Devices**:
> - Android Emulator: use `http://10.0.2.2:5000`
> - Physical device on Wi-Fi: use your computer's local IP (e.g. `http://192.168.1.X:5000`)
> - Web / iOS Simulator: `http://localhost:5000`

---

## Setup & Running

### 1. Install dependencies
```bash
npm install
```

### 2. Start Expo
```bash
# Start Metro bundler
npm run start

# Or run directly on web browser:
npm run web

# Or launch on connected Android device/emulator:
npm run android
```

---

## Deliberately Deferred (Per Build Brief Section 6)

- No customer-facing screens in this app (a separate one-page static website will consume the backend's public `GET /shops/:id/status` endpoint).
- No in-app payment processing (direct call-to-book CTA).
- Push notifications stubs for future milestone.
