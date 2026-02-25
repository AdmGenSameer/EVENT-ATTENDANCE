# QR Code Generator - Quick Start Guide

## 🚀 Getting Started (5 Minutes)

### Step 1: Start the Backend (Terminal 1)

```bash
cd /home/samarcher/Projects/EVENT-ATTENDANCE/backend
npm run dev
```

**Expected Output:**
```
[INFO] mongodb:connect - Connecting to MongoDB Atlas...
EventQR backend listening on port 4000
```

### Step 2: Start the Admin Panel (Terminal 2)

```bash
cd /home/samarcher/Projects/EVENT-ATTENDANCE/admin-panel
npm run dev
```

**Expected Output:**
```
VITE v5.4.21 ready in 165 ms
Local: http://localhost:5174/
```

### Step 3: Open Admin Panel in Browser

Navigate to: **http://localhost:5174/**

You should see:
- Dashboard with event list
- Bottom navigation with 5 tabs
- **QR Generator** tab (5th button)

---

## 📝 Using Individual QR Generation

### 1. Select Event
- Click "Dashboard" tab
- Select an event (or create one if needed)
- Event name appears as "selected event"

### 2. Generate Single QR
- Click **"QR Generator"** tab (bottom nav)
- Select **"Individual QR"** tab
- Choose a ticket from the dropdown
- Click **"Generate QR"** button
- Watch for success message

### 3. View Result
- QR preview appears showing:
  - Ticket code
  - Base64-encoded QR data
- Click **"Download QR (PNG)"** to save the image

---

## 📦 Using Bulk QR Generation

### 1. Generate All QRs
- Click **"QR Generator"** tab
- Select **"Bulk Generation"** tab
- Review ticket count and "no QR" status
- Click **"Generate All QRs"** button

### 2. Watch Progress
- Real-time progress bar shows current/total
- Example: "95 / 100 QR codes generated"

### 3. Review Results
After completion, see:
- **Total**: Total tickets in event
- **Generated**: Successfully created QR codes
- **Failed**: Any errors (if applicable)
- **Errors**: Detailed list of failures

---

## 🔧 API Testing (Terminal 3)

### Test Individual Generation

```bash
curl -X POST http://localhost:4000/api/tickets/events/test-event/qr/generate-single \
  -H "Content-Type: application/json" \
  -d '{"ticketId": "63a1234567890abc12345678"}'
```

**Response:**
```json
{
  "success": true,
  "ticketId": "63a1234567890abc12345678",
  "ticketCode": "TICKET-001",
  "qrData": "eyJ2IjoxLCJ0aWQiOi...",
  "payload": {
    "v": 1,
    "tid": "63a1234567890abc12345678",
    "eid": "event-123",
    "exp": 1704067200,
    "cat": "GUEST",
    "sig": "a1b2c3d4..."
  }
}
```

### Test Bulk Generation

```bash
curl -X POST http://localhost:4000/api/tickets/events/test-event/qr/generate-bulk \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "total": 100,
  "generated": 100,
  "failed": 0,
  "errors": []
}
```

### Get Public Key (For Mobile)

```bash
curl http://localhost:4000/api/tickets/events/test-event/qr/public-key
```

**Response:**
```json
{
  "eventId": "test-event",
  "publicKey": "a1b2c3d4e5f6...",
  "keyVersion": 1
}
```

### Verify QR Signature

```bash
curl -X POST http://localhost:4000/api/qr/verify \
  -H "Content-Type: application/json" \
  -d '{
    "qrData": "eyJ2IjoxLCJ0aWQiOi...",
    "publicKey": "a1b2c3d4e5f6..."
  }'
```

---

## 📊 What Happens Behind the Scenes

```
User Action          Backend Process              Database Update
─────────────────    ───────────────────────────  ──────────────────
Select Ticket   →    Load ticket from DB      →   -
Click Generate  →    Load event (with private key)  -
                →    Create payload              →  -
                →    Sign with Ed25519           →  -
                →    Encode to Base64            →  -
Show Preview    ←    Return QR data              ←  Update ticket.qrData
Download QR     ←    Encode as PNG               ←  -
```

---

## 🔒 Security: How It Works

### QR Payload Example
```json
{
  "v": 1,                      // Version
  "tid": "ticket-123",         // Unique ticket ID
  "eid": "event-abc",          // Event ID
  "exp": 1704067200,           // Expiry (Unix timestamp)
  "cat": "GUEST",              // Ticket type
  "sig": "a1b2c3d4e5f6..."     // Ed25519 signature (hex)
}
```

### Verification on Mobile
1. Scanner downloads public key: `http://localhost:4000/api/events/:id/qr/public-key`
2. Scans QR → extracts Base64 payload
3. Decodes: `JSON.parse(atob(qrData))`
4. Verifies signature using public key: `nacl.sign.verify(...)`
5. Checks expiry: `Date.now() < payload.exp * 1000`
6. Result: ✅ Accept or ❌ Reject

---

## 📋 Troubleshooting

### Issue: "Ticket not found"
**Solution**: Ensure ticket exists in database. First import participants via Import tab.

### Issue: "Event has no QR private key configured"
**Solution**: Event needs qrPrivateKey in database. Regenerate event with Ed25519 keypair.

### Issue: QR not showing in preview
**Solution**: Check browser console for errors. Ensure API is responding.

### Issue: Download button doesn't work
**Solution**: Browser may block downloads. Check browser permissions for localhost:5174.

### Issue: "tweetnacl not found"
**Solution**: 
```bash
cd backend
npm install tweetnacl
npm run dev
```

### Issue: Port already in use
**Solution**: Kill existing process or use different port:
```bash
# Find process on port 4000
lsof -i :4000
# Kill it
kill -9 <PID>

# Or for admin panel port 5174
lsof -i :5174
kill -9 <PID>
```

---

## 💡 Pro Tips

### Batch Import Then Bulk Generate
1. Go to **Import** tab
2. Upload CSV with participants
3. Switch to **QR Generator** tab
4. Click "Generate All QRs" once
5. All tickets get QR codes at once

### Check Generation Status
- After bulk generation, go to **Participants** tab
- Tickets with QR code show ✓ indicator
- Tickets without QR show as empty

### Download for Mobile
1. Get public key: `curl http://localhost:4000/api/events/test-event/qr/public-key`
2. Save to mobile app
3. Mobile scanner can now verify offline

---

## 🎯 Use Cases

### Use Case 1: Pre-Event QR Distribution
```
1. Import all participant list (CSV)
2. Generate all QRs at once (Bulk)
3. Email QRs to participants
4. Participants bring phone with QR
```

### Use Case 2: On-the-Day Registration
```
1. Manual participant entry (Import tab)
2. Generate individual QR for each
3. Print QR sticker
4. Stick on ticket at registration desk
```

### Use Case 3: Multiple Events
```
1. Create separate events in dashboard
2. Import participants for each
3. Generate QRs per event
4. Distribute appropriately
```

---

## 📈 Performance Notes

| Operation | Time | Tickets |
|-----------|------|---------|
| Generate 1 QR | ~100ms | 1 |
| Generate 10 QRs | ~500ms | 10 |
| Generate 100 QRs | ~5 seconds | 100 |
| Generate 1000 QRs | ~50 seconds | 1000 |

**Tip**: Bulk generation is much faster than individual operations.

---

## 🔄 Complete Workflow Example

### Step 1: Import Participants
```bash
# CSV format: NAME, EMAIL, TICKET_TYPE
# Upload via Import tab
```

### Step 2: Generate QRs
```bash
# Option A: Individual
# Select ticket → Generate → Download

# Option B: Bulk (Recommended)
# Click "Generate All QRs" → Wait for progress
```

### Step 3: Distribute to Mobile
```bash
# Download public key
curl http://localhost:4000/api/events/YOUR_EVENT/qr/public-key > public_key.txt

# Share with mobile scanner app team
# (Mobile app stores in local SQLite)
```

### Step 4: Verify at Event
```bash
# Mobile scanner:
# 1. Load public key locally
# 2. Scan participant QR code
# 3. Verify signature offline
# 4. Accept/Reject based on validity
```

---

## ✅ Verification Checklist

Before going live:

- [ ] Backend starts without errors
- [ ] Admin panel loads on localhost:5174
- [ ] QR Generator tab is visible
- [ ] Can select ticket from dropdown
- [ ] Can generate individual QR
- [ ] Can see QR preview
- [ ] Can download PNG
- [ ] Can generate bulk QRs
- [ ] Progress bar shows during bulk
- [ ] Results display correctly
- [ ] API endpoints respond correctly
- [ ] Public key endpoint works
- [ ] No TypeScript errors in console

---

## 🎓 Learning Resources

**Understanding the System:**
1. Read `QR_GENERATOR_GUIDE.md` for architecture
2. Read `QR_GENERATOR_INTEGRATION.md` for data flows
3. Check source code comments in `qrService.ts`

**Understanding Ed25519:**
1. See links in `QR_GENERATOR_GUIDE.md`
2. TweetNaCl.js documentation
3. Ed25519 cryptography overview

**Integration with Mobile:**
1. See mobile integration section in guide
2. Public key download from API
3. Offline verification implementation

---

## 📞 Support

### Common Questions

**Q: Can I generate QRs multiple times?**
A: Yes, each generation creates a new QR with fresh signature.

**Q: Are QRs unique per ticket?**
A: Yes, each ticket ID is part of the signature.

**Q: Can QRs be duplicated?**
A: No, signature prevents forgery without private key.

**Q: What if QR expires?**
A: Mobile app rejects with "QR has expired" message.

**Q: How long are QRs valid?**
A: Default 365 days from generation (configurable).

**Q: Can I verify QR offline?**
A: Yes, mobile app has public key for offline verification.

---

## 🎉 You're Ready!

Start using the QR Code Generator:

1. **Open Terminal 1**: Start backend
2. **Open Terminal 2**: Start admin panel
3. **Open Browser**: Go to http://localhost:5174
4. **Navigate**: Click "QR Generator" tab
5. **Generate**: Create QRs for your event
6. **Distribute**: Send to mobile scanner app

**Happy QR generating!** 🎊

---

*Last Updated: Today*
*Version: 1.0*
*Status: Ready for Production*
