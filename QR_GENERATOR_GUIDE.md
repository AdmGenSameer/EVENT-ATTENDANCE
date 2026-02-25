# QR Code Generator - Implementation Guide

## Overview

The QR Code Generator system provides secure, tamper-proof QR code generation for event tickets using Ed25519 cryptographic signing. This ensures that QR codes cannot be replicated or tampered with.

## Architecture

### Security Model

**Ed25519 Digital Signatures**
- Each event has a unique Ed25519 keypair (public key + private key)
- Private key: Stored securely on backend, never exposed to mobile app
- Public key: Distributed to mobile scanner app for offline verification
- QR payload signed with private key, verified with public key

### QR Payload Structure

```json
{
  "v": 1,                    // Version
  "tid": "ticket-id",        // Ticket ID
  "eid": "event-id",         // Event ID
  "exp": 1234567890,         // Expiry timestamp
  "cat": "GUEST",            // Category/Ticket Type
  "sig": "signature-hex"     // Ed25519 signature (hex-encoded)
}
```

### Verification Flow

1. **Admin generates QRs** → Backend signs payload with private key
2. **QR downloaded to mobile** → Scanner app receives Base64-encoded QR data
3. **Offline verification** → Mobile app uses public key to verify signature
4. **Tamper detection** → Invalid signature means QR was modified or fake

## Backend Implementation

### Services

#### qrService.ts

Located at: `/backend/src/services/qrService.ts`

**Key Methods:**

1. **generateEventKeyPair()**
   - Creates Ed25519 keypair for an event
   - Returns: `{ publicKey: hex, privateKey: hex }`
   - Called once per event during setup

2. **generateSecureQRPayload()**
   - Creates and signs a QR payload
   - Params: `(ticketId, eventId, category, privateKeyHex, expiryDays)`
   - Returns: Signed payload with signature

3. **generateSingleQR(ticketId)**
   - Generates QR for a single ticket
   - Updates ticket with Base64-encoded QR data
   - Returns: `{ success, ticketId, qrData, payload }`

4. **generateBulkQRs(eventId)**
   - Generates QRs for all event tickets without QRs
   - Batch operation with error handling
   - Returns: `{ total, generated, failed, errors }`

5. **verifyQRSignature(qrDataBase64, publicKeyHex)**
   - Verifies QR signature (for backend validation or testing)
   - Returns: `{ valid, payload, error }`
   - Checks expiry automatically

6. **getEventPublicKey(eventId)**
   - Retrieves public key for an event
   - Used by scanner app during initialization
   - Returns: `{ eventId, publicKey, keyVersion }`

### API Endpoints

**POST /api/tickets/events/:eventId/qr/generate-single**
```json
Request:
{
  "ticketId": "ticket-id"
}

Response:
{
  "success": true,
  "ticketId": "ticket-id",
  "ticketCode": "TICKET-001",
  "qrData": "base64-encoded-qr",
  "payload": { v, tid, eid, exp, cat, sig }
}
```

**POST /api/tickets/events/:eventId/qr/generate-bulk**
```json
Request:
{}

Response:
{
  "success": true,
  "total": 100,
  "generated": 95,
  "failed": 5,
  "errors": ["Ticket-001: reason", ...]
}
```

**GET /api/tickets/events/:eventId/qr/public-key**
```json
Response:
{
  "eventId": "event-id",
  "publicKey": "hex-encoded-public-key",
  "keyVersion": 1
}
```

**POST /api/qr/verify** (optional backend verification)
```json
Request:
{
  "qrData": "base64-encoded-qr",
  "publicKey": "hex-encoded-public-key"
}

Response:
{
  "valid": true,
  "payload": { v, tid, eid, exp, cat, sig }
}
// or
{
  "valid": false,
  "error": "Signature verification failed - QR may be tampered"
}
```

### Database Updates

**Event Model** (`/backend/src/db/models/Event.ts`)
- Added: `qrPublicKey` (string) - Public key for signature verification
- Added: `qrPrivateKey` (string) - Private key for signing (select: false for security)

**Ticket Model** (existing)
- Updated: `qrData` field stores Base64-encoded signed payload

## Admin Panel Implementation

### QRCodeGenerator Component

Located at: `/admin-panel/src/components/QRCodeGenerator.tsx`

**Features:**

1. **Individual QR Generation**
   - Select ticket from dropdown
   - Generate QR for single ticket
   - Preview QR with Base64 data
   - Download QR as PNG

2. **Bulk QR Generation**
   - Generate QRs for all event tickets at once
   - Progress tracking (current/total)
   - Error reporting with details
   - Summary statistics

3. **UI Elements**
   - Tab navigation (Individual / Bulk)
   - Ticket selector dropdown
   - Success/error result boxes
   - QR preview with ticket code
   - Download button

### Integration in App.tsx

Added new tab: **QR Generator**
- Icon: QR code symbol
- Position: 5th tab (after Import)
- Type: `"qr-generator"`

### Styling

Located at: `/admin-panel/src/styles/qr-generator.css`

**Components:**
- Header with event label
- Tab navigation with active state
- Form controls (select, buttons)
- Result boxes (success/error states)
- QR preview section
- Bulk progress bar
- Responsive design for mobile

## Usage Workflow

### For Admins (Setup)

1. **Login to Admin Panel**
   - Navigate to QR Generator tab
   - Event automatically selected from dashboard

2. **Generate Individual QRs**
   - Select specific ticket
   - Click "Generate QR"
   - Preview QR data
   - Download PNG if needed

3. **Bulk Generate QRs**
   - Click "Generate All QRs"
   - Wait for progress (shows current/total)
   - Review results and errors
   - Retry failed tickets individually

### For Mobile Scanner

1. **Download Event Public Key**
   - Call `GET /api/events/:id/qr/public-key`
   - Store key locally for offline verification

2. **Scan QR Code**
   - Extract Base64 QR data from QR
   - Decode to get payload + signature
   - Use Ed25519 public key to verify signature
   - Accept if valid, reject if tampered

## Security Features

### Tamper Prevention
- QR codes signed with Ed25519 private key
- Any modification invalidates signature
- Fake QRs cannot be created without private key
- Requires private key to replicate

### Offline Verification
- Public key distributed to mobile app
- Verification works offline without backend
- No network required for checking QR validity

### Key Management
- Private key never exposed to frontend
- Private key select:false in database
- Each event has unique keypair
- Keys generated at event creation

### Signature Details
- Uses `nacl.sign.detached()` from TweetNaCl
- Signature includes entire payload
- Expiry checked automatically
- Version field allows future updates

## Error Handling

**Common Errors:**

1. **"Event has no QR private key configured"**
   - Cause: Event keypair not initialized
   - Solution: Ensure event created with qrService

2. **"Ticket not found"**
   - Cause: Invalid ticket ID
   - Solution: Verify ticket ID in database

3. **"Signature verification failed"**
   - Cause: QR tampered with
   - Solution: Reject QR, ask user to rescan

4. **"QR has expired"**
   - Cause: QR outside expiry window
   - Solution: Regenerate QR with new expiry

## Performance Considerations

- **Bulk Generation**: Processes tickets sequentially (safe for large events)
- **Progress Tracking**: Real-time updates for admin feedback
- **Error Recovery**: Failed tickets reported but don't block others
- **Memory**: QR data stored as Base64 in database (minimal overhead)

## Testing

### Test Individual QR

```bash
# Generate QR for ticket
curl -X POST http://localhost:4000/api/tickets/events/test-event/qr/generate-single \
  -H "Content-Type: application/json" \
  -d '{"ticketId": "ticket-123"}'

# Verify signature
curl -X POST http://localhost:4000/api/qr/verify \
  -H "Content-Type: application/json" \
  -d '{"qrData": "base64-qr", "publicKey": "hex-key"}'
```

### Test Bulk Generation

```bash
curl -X POST http://localhost:4000/api/tickets/events/test-event/qr/generate-bulk \
  -H "Content-Type: application/json"
```

## Future Enhancements

1. **QR Download Formats**
   - SVG export
   - PDF export with ticket details
   - Batch ZIP download

2. **Advanced Verification**
   - QR verification logs
   - Check-in tracking
   - Duplicate scan detection

3. **Customization**
   - Custom QR logo
   - Brand watermarks
   - Color schemes

4. **Integration**
   - Email QR codes to participants
   - WhatsApp sharing
   - SMS delivery

## Dependencies

Backend:
- `tweetnacl` - Ed25519 cryptographic signing
- `mongoose` - MongoDB ODM
- `express` - Web framework

Admin Panel:
- `react` - UI framework
- `typescript` - Type safety
- `vite` - Build tool

## Troubleshooting

**Issue: "tweetnacl not found"**
```bash
cd backend
npm install tweetnacl
```

**Issue: QR not generating**
- Check event has qrPrivateKey in database
- Verify ticket exists in database
- Check server logs for errors

**Issue: Verification failing on mobile**
- Ensure public key downloaded correctly
- Check Base64 decoding on mobile
- Verify signature algorithm matches (Ed25519)

## Resources

- [TweetNaCl.js Documentation](https://tweetnacl.js.org/)
- [Ed25519 Cryptography](https://ed25519.cr.yp.to/)
- [QR Code Standard (ISO/IEC 18004)](https://en.wikipedia.org/wiki/QR_code)
