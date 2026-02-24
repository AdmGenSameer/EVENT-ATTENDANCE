# EventQR Quick Start Guide

## Prerequisites

- Node.js 20+ installed
- Flutter 3.3+ installed (for scanner app)
- PostgreSQL database (or Supabase account)
- Google Cloud Service Account (for Sheets sync)

## Setup Steps

### 1. Backend Setup (5 minutes)

```bash
cd backend

# Install dependencies (already done)
npm install

# Create .env file
cp .env.example .env
```

Edit `.env` with your values:
```env
PORT=4000
DATABASE_URL="postgresql://user:password@localhost:5432/eventqr"

# Supabase Auth
SUPABASE_JWT_ISSUER="https://YOUR_PROJECT.supabase.co/auth/v1"
SUPABASE_JWT_AUDIENCE="authenticated"
SUPABASE_JWKS_URL="https://YOUR_PROJECT.supabase.co/auth/v1/jwks"
SUPABASE_ADMIN_ROLE="admin"

# Google Sheets (for participant import)
GOOGLE_SHEETS_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_PROJECT_ID="your-project-id"
GOOGLE_SHEETS_RANGE="Form Responses 1"
GOOGLE_SHEETS_MAX_ROWS=2000
```

```bash
# Run Prisma migrations
npm run prisma:migrate

# Generate Prisma client
npm run prisma:generate

# Start development server
npm run dev
```

Backend will run at `http://localhost:4000`

### 2. Admin Panel Setup (3 minutes)

```bash
cd ../admin-panel

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_BASE=http://localhost:4000/api
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

```bash
# Start development server
npm run dev
```

Admin panel will open at `http://localhost:5173`

### 3. Scanner App Setup (5 minutes)

**On a machine with Flutter installed:**

```bash
cd ../scanner-app

# Install dependencies
flutter pub get

# Update API endpoint
# Edit lib/services/api_service.dart:
# - For Android emulator: http://10.0.2.2:4000/api
# - For iOS simulator: http://localhost:4000/api  
# - For real device: http://YOUR_IP:4000/api

# Run app
flutter run
```

## First Time Usage

### Step 1: Create Admin User in Supabase

1. Go to Supabase Dashboard → Authentication → Users
2. Create a new user
3. Go to SQL Editor and run:
```sql
UPDATE auth.users 
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'your-admin@example.com';
```

### Step 2: Create Your First Event

1. Open admin panel (`http://localhost:5173`)
2. Login with admin credentials
3. Click "Create Event"
4. Fill in event details (name, slug, date)
5. Click "Save"

### Step 3: Import Participants

**Option A: Google Sheets**
1. In event detail page, click "Sync from Google Sheet"
2. Enter Google Sheet ID
3. Click "Start Sync"
4. Wait for import to complete

**Option B: CSV Upload**
1. Prepare CSV with columns: name, email, phone, ticket_type, etc.
2. Click "Upload CSV"
3. Select file and upload

### Step 4: Generate QR Tickets

1. Click "Generate Tickets" button
2. Backend creates signed QR tokens for all tickets
3. View QR codes in ticket list
4. Download individual QRs or send via email

### Step 5: Setup Scanner Device

1. Open scanner app on mobile device
2. Enter event code (slug), e.g., "dsc-event-2026"
3. Click "Download & Continue"
4. App downloads all tickets for offline use
5. Start scanning QR codes!

## Testing the Full Flow

1. **Backend**: `curl http://localhost:4000/api/health` → Should return `{"status":"ok"}`
2. **Admin Panel**: Login → Create event → Upload CSV → Generate tickets
3. **Scanner**: Download event → Scan QR (use QR from admin panel preview)

## Common Issues

### Backend won't start
- Check DATABASE_URL is correct
- Run `npm run prisma:migrate` 
- Check all env vars are set

### Admin panel can't login
- Check Supabase URL and anon key
- Verify user has `admin` role in app_metadata
- Check browser console for errors

### Scanner can't download tickets
- Verify backend is running
- Check API URL in api_service.dart
- For Android emulator, use `10.0.2.2` not `localhost`
- For real device, use your computer's IP address

### QR verification fails
- Ensure public key is downloaded correctly
- Check token expiry (default 30 days)
- Verify Ed25519 signature format

## Project Structure

```
EventManagementApp/
├── backend/          # Node.js API (Port 4000)
├── admin-panel/      # React Admin UI (Port 5173)
├── scanner-app/      # Flutter Scanner
├── README.md         # Full documentation
├── QUICKSTART.md     # This file
└── plan.txt          # Original requirements
```

## What's Working (Phase 1-3 ✓)

✅ Event CRUD with Ed25519 keys  
✅ Google Sheets sync  
✅ QR generation with signatures  
✅ Supabase authentication  
✅ Admin panel UI  
✅ Scanner offline check-in  
✅ Background sync system  
✅ Conflict resolution  
✅ Offline mode indicator  

## Next: Phase 4

- Real-time dashboard
- Email delivery (AWS SES)
- Scanner device registration
- Analytics & fraud detection
- Export reports

## Support

- Check README.md for detailed API docs
- See plan.txt for architecture details
- Backend logs are in console (structured JSON)
- Scanner logs use debugPrint (check device logs)
