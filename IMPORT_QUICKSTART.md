# Participant Import System - Quick Start

## What Was Built

A complete participant management system for the event attendance platform supporting:

✅ **Manual Entry** - Add participants one-by-one through a form  
✅ **Bulk Import** - Upload CSV or Excel files with hundreds of participants  
✅ **Duo Tickets** - Support for paired participants (couples, groups)  
✅ **Real-time Validation** - Errors reported with row numbers and details  
✅ **Admin Panel Tab** - New "Import" tab with intuitive UI  

---

## Key Features

### 1. Manual Participant Entry

- Simple form with ticket type selector
- Support for solo and duo tickets
- Auto-generates unique ticket codes
- Instant feedback (success/error)

### 2. CSV/Excel Bulk Import

- Drag-and-drop or click to upload
- Supports `.csv` and `.xlsx` formats
- Shows import summary (imported count, errors, skipped)
- Detailed error list for troubleshooting

### 3. Ticket Type Support

| Type | Participants | Description |
|------|--------------|-------------|
| **Regular** | 1 | Standard seating |
| **Regular Duo** | 2 | Standard seating for 2 |
| **Front Row Solo** | 1 | Premium front row |
| **Front Row Duo** | 2 | Premium front row for 2 |

### 4. Smart Processing

- Automatic ticket code generation
- Separate tickets for each person (even in duo)
- Database validation on each row
- Error recovery (doesn't stop on failure)

---

## File Structure

**Excel/CSV columns needed:**

```
NAME | Registration No. | College Email Id | Contact No. | TICKET TYPE | NAME: | REGISTRATION NO.: | COLLEGE EMAIL ID: | CONTACT NO.:
```

- First 7 columns: Primary participant info
- Last 4 columns: Secondary participant (only for duo tickets)

**Example:**

```csv
Ahmed Ali,REG001,ahmed@college.edu,+91 98765 43210,Regular
Rajesh Kumar,REG002,rajesh@college.edu,+91 98765 43211,Regular Duo,Priya Sharma,REG002B,priya@college.edu,+91 98765 43212
```

---

## Setup Instructions

### 1. Install Backend Dependencies

```bash
cd backend
npm install  # Installs multer for file uploads
```

### 2. Start Backend Server

```bash
npm run dev
# Backend runs on http://localhost:4000
```

### 3. Start Admin Panel

```bash
cd admin-panel
npm run dev
# Admin panel runs on http://localhost:5173
```

### 4. Access Import System

1. Open http://localhost:5173/
2. Click **"Import"** tab in navigation
3. Choose **"Add Manually"** or **"Upload File"**

---

## Usage Examples

### Manual Entry Example

1. Open Import tab → "Add Manually"
2. Select ticket type: "Regular Duo"
3. Fill primary participant:
   - Name: "Rajesh Kumar"
   - Email: "rajesh@college.edu"
4. Fill secondary participant:
   - Name: "Priya Sharma"
   - Email: "priya@college.edu"
5. Click "Add Participant"
6. See success message with ticket codes

### CSV Upload Example

1. Create Excel file with sample data
2. Open Import tab → "Upload File"
3. Drag/drop the file or click to select
4. See results:
   ```
   ✓ Imported: 10
   ⚠ Skipped: 1
   ❌ Errors: Row 5 - Invalid ticket type
   ```

---

## What Was Changed

### Backend

- ✨ **New:** Enhanced `importService.ts` with registration sheet parsing
- ✨ **New:** API endpoints (`/import`, `/add-participant`)
- ✨ **New:** Multer dependency for file uploads
- ✨ **Updated:** `tickets.ts` routes

### Admin Panel

- ✨ **New:** `Import.tsx` component with manual form and file upload
- ✨ **New:** `import.css` styling
- ✨ **Updated:** `App.tsx` to include Import tab
- ✨ **Updated:** `api.ts` with generic POST helper

### Documentation

- ✨ **New:** Full user guide
- ✨ **New:** Implementation technical docs
- ✨ **New:** Column reference guide
- ✨ **New:** Setup checklist
- ✨ **New:** Sample CSV file

---

## API Reference

### Add Single Participant

```
POST /api/tickets/add-participant

{
  "eventId": "event-id",
  "name": "Ahmed Ali",
  "email": "ahmed@college.edu",
  "ticketType": "regular",
  "duo": {                    // Optional
    "name": "Fatima Khan",
    "email": "fatima@college.edu"
  }
}

Returns:
{
  "success": true,
  "ticketId": "...",
  "ticketCode": "XEN1-A3F2C91B"
}
```

### Bulk Import

```
POST /api/tickets/import

FormData:
- file: CSV or Excel file
- eventId: event-id

Returns:
{
  "success": true,
  "imported": 42,
  "skipped": 1,
  "errors": ["Row 10: invalid ticket type"]
}
```

---

## Documentation Files

| File | Purpose |
|------|---------|
| [PARTICIPANT_IMPORT_GUIDE.md](./PARTICIPANT_IMPORT_GUIDE.md) | Complete user guide with examples |
| [EXCEL_CSV_COLUMN_GUIDE.md](./EXCEL_CSV_COLUMN_GUIDE.md) | Column reference with visual examples |
| [PARTICIPANT_IMPORT_IMPLEMENTATION.md](./PARTICIPANT_IMPORT_IMPLEMENTATION.md) | Technical implementation details |
| [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md) | Testing and deployment checklist |
| [SYSTEM_VISUAL_SUMMARY.md](./SYSTEM_VISUAL_SUMMARY.md) | Architecture diagrams and flows |
| [sample_import.csv](./sample_import.csv) | Sample data for testing |

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Module not found: multer" | Run `npm install` in backend folder |
| Import tab not visible | Restart admin panel, clear browser cache |
| File upload fails | Check file format (.csv or .xlsx), max size ~10MB |
| Participants show 0 imported | Verify column headers match exactly, check TICKET TYPE values |
| No success message after manual add | Check backend is running, verify event ID is set |

---

## Next Steps

1. ✅ Install dependencies: `npm install` in backend
2. ✅ Start backend: `npm run dev` (backend folder)
3. ✅ Start admin: `npm run dev` (admin-panel folder)
4. ✅ Open http://localhost:5173/ and click Import tab
5. ✅ Test with sample_import.csv
6. ✅ Verify participants appear in mobile app

---

## Features Ready

- ✅ Manual entry form
- ✅ CSV/Excel upload
- ✅ Duo ticket support
- ✅ Error reporting
- ✅ Unique ticket codes
- ✅ Database integration

---

## Future Enhancements

📋 **Planned:**
- Google Sheets API integration
- Duplicate email detection
- Batch edit interface
- Export participants as CSV
- Scheduled sync from external forms

---

## Support

- **User Guide:** [PARTICIPANT_IMPORT_GUIDE.md](./PARTICIPANT_IMPORT_GUIDE.md)
- **Column Reference:** [EXCEL_CSV_COLUMN_GUIDE.md](./EXCEL_CSV_COLUMN_GUIDE.md)
- **Technical Docs:** [PARTICIPANT_IMPORT_IMPLEMENTATION.md](./PARTICIPANT_IMPORT_IMPLEMENTATION.md)
- **Testing:** [SETUP_CHECKLIST.md](./SETUP_CHECKLIST.md)

---

## Status

✅ **IMPLEMENTATION COMPLETE**  
✅ **READY FOR TESTING**  
✅ **ALL DOCUMENTATION PROVIDED**

**Last Updated:** February 25, 2026
