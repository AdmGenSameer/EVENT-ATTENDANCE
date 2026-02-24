# EventQR - Offline First Ticket Verification System

## Project Status: Phase 1, 2 & 3 Complete ✓

### What's Built

#### Backend (Node.js + Express + PostgreSQL/Supabase)
- ✅ Event CRUD with Ed25519 key generation
- ✅ Google Sheets API sync (auto-import participants)
- ✅ CSV upload & parsing
- ✅ QR token generation (signed with Ed25519)
- ✅ Supabase Auth integration (JWT + role-based access)
- ✅ Sync history tracking
- ✅ Public key export endpoint for scanners
- ✅ Scanner sync endpoints (tickets, check-ins)
- ✅ **Conflict resolution (earliest timestamp wins)**

#### Admin Panel (React + Vite + TypeScript)
- ✅ Supabase authentication
- ✅ Event management (create, edit, list)
- ✅ Google Sheets sync with progress tracking
- ✅ Sync history view with error logs
- ✅ Event detail page with ticket list
- ✅ QR code generation UI
- ✅ QR preview & download (per ticket)

#### Scanner App (Flutter)
- ✅ Ed25519 signature verification (offline)
- ✅ SQLite local storage (events, tickets, sync queue)
- ✅ Mobile scanner integration (QR scanning)
- ✅ Offline check-in flow
- ✅ Duplicate detection (local)
- ✅ Sync queue for background sync
- ✅ **Pre-event sync flow (setup screen)**
- ✅ **Background sync with connectivity check**
- ✅ **Offline mode indicator**
- ✅ **Manual sync button**
- ✅ **Pending sync counter**

---

## Setup Instructions

### Backend Setup

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values:
   # - DATABASE_URL (Supabase connection string)
   # - Supabase Auth config
   # - Google Sheets service account credentials
   ```

3. **Run Prisma migrations**
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```

4. **Start server**
   ```bash
   npm run dev
   ```

### Admin Panel Setup

1. **Install dependencies**
   ```bash
   cd admin-panel
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env:
   # - VITE_API_BASE=http://localhost:4000/api
   # - VITE_SUPABASE_URL
   # - VITE_SUPABASE_ANON_KEY
   ```

3. **Start dev server**
   ```bash
   npm run dev
   ```

### Scanner App Setup

1. **Install dependencies**
   ```bash
   cd scanner-app
   flutter pub get
   ```

2. **Configure API endpoint**
   - Open `lib/services/api_service.dart`
   - Update `baseUrl` with your backend URL:
     - Android emulator: `http://10.0.2.2:4000/api`
     - iOS simulator: `http://localhost:4000/api`
     - Real device: `http://YOUR_IP:4000/api`

3. **Run app**
   ```bash
   flutter run
   ```

4. **Setup for event**
   - Launch app, you'll see setup screen
   - Enter event slug/code (e.g., "dsc-event-2026")
   - Tap "Download & Continue"
   - App downloads all tickets for offline use
   - Automatically navigates to scanner screen

---

## API Endpoints

### Admin (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | List all events |
| POST | `/api/events` | Create event |
| GET | `/api/events/:id` | Get event details |
| PUT | `/api/events/:id` | Update event |
| POST | `/api/events/:id/import-csv` | Import tickets from CSV |
| POST | `/api/events/:id/sync-google-sheet` | Sync from Google Sheets |
| GET | `/api/events/:id/sync-history` | Get sync job history |
| POST | `/api/events/:id/generate-tickets` | Generate QR tokens |
| GET | `/api/events/:id/tickets` | List tickets |

### Scanner (Public/No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sync/events/:slug/public-key` | Get event public key |
| GET | `/api/sync/events/:id/tickets` | Download ticket list |
| POST | `/api/sync/checkins` | Push check-in queue |

---

## Data Flow

### Registration → Ticket Generation

1. User fills Google Form
2. Response saved to Google Sheets
3. Admin syncs from Sheets via admin panel
4. Backend parses rows and creates ticket records
5. Admin generates QR tokens (signed with Ed25519)
6. Tickets ready for distribution

### Scanner Sync (Pre-Event)

1. Scanner app fetches event public key by slug
2. Downloads full ticket list for event
3. Stores in local SQLite database
4. Ready for offline scanning

### Check-In Flow (Offline)

1. Scan QR code with mobile camera
2. Decode token and verify Ed25519 signature (local)
3. Check expiry timestamp (local)
4. Lookup ticket in SQLite (local)
5. If valid & not checked-in → mark as checked-in
6. Add to sync queue
7. Show success feedback

### Background Sync (When Online)

1. Periodically check connectivity
2. Post sync queue items to backend
3. Backend applies co4)

- [ ] Real-time dashboard (WebSocket/polling)
- [ ] Email ticket delivery (AWS SES)
- [ ] Export reports (CSV, PDF)
- [ ] Analytics & fraud detection dashboard
- [ ] Scanner device registration & API keys
- [ ] Battery optimization for scanner
- [ ] Sound/haptic feedback on scan
- [ ] Multi-event support in scanner UI
- [ ] Admin conflict resolution UI
- [ ] Rate limiting on APIsnner devices can have revocable keys

---

## Next Steps (Phase 3+)

- [ ] Scanner device registration & API keys
- [ ] Conflict resolution UI in admin panel
- [ ] Real-time dashboard (WebSocket/polling)
- [ ] Email ticket delivery (AWS SES)
- [ ] Analytics & fraud detection
- [ ] Export reports (CSV, PDF)
- [ ] Multi-scanner coordination
- [ ] Battery optimization
- [ ] Sound/haptic feedback

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, TypeScript, Prisma |
| Database | PostgreSQL (Supabase) |
| Admin | React, Vite, TypeScript |
| Scanner | Flutter, Dart |
| Auth | Supabase Auth (JWT) |
| Signing | Ed25519 (jose, cryptography) |
| Storage | SQLite (scanner local) |

---

## File Structure

```
EventManagementApp/
├── backend/
│   ├── prisma/schema.prisma
│   ├── src/
│   │   ├── config/
│   │   ├── db/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   └── server.ts
│   └── package.json
├── admin-panel/
│   ├── src/
│   │   ├── components/
│   │   ├── api.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
└── scanner-app/
    ├── lib/
    │   ├── models/
    │   ├── services/
    │   ├── screens/
    │   └── main.dart
    └── pubspec.yaml
```
