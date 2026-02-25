# Participant Import Guide

This guide explains how to use the new participant import system in the admin panel.

## Overview

The import system allows you to add participants to your event in three ways:
1. **Manual Entry** - Add individual participants one at a time
2. **CSV/Excel Upload** - Batch import from a spreadsheet file
3. (Future) Google Sheets API integration

## Ticket Types

The system supports 4 ticket types:

| Type | Single/Duo | Description |
|------|-----------|-------------|
| **Regular** | Single | Standard ticket for 1 person |
| **Regular Duo** | Duo | Standard ticket for 2 people |
| **Front Row Solo** | Single | Premium front row seat for 1 person |
| **Front Row Duo** | Duo | Premium front row seat for 2 people |

**Duo tickets** require details for both participants. The system automatically creates two separate ticket codes - one for each person.

---

## Method 1: Manual Entry

### Steps

1. Open the **Import** tab in the admin panel
2. Click **Add Manually** sub-tab
3. Select the ticket type
4. Fill in the primary participant details:
   - **Name** - Full name (required)
   - **Email** - College email address (required)
   - **Registration No.** - Registration number (optional)
   - **Contact No.** - Phone number (optional)

5. If you selected a "Duo" ticket type, additional fields appear for the second participant
6. Click **Add Participant**

### Example

**Scenario:** Add a couple with duo tickets

```
Ticket Type: Regular Duo
Primary: Rajesh Kumar (rajesh@college.edu)
Secondary: Priya Sharma (priya@college.edu)
```

Result: Two tickets created - one for Rajesh, one for Priya, both marked as a couple.

---

## Method 2: Excel/CSV Upload

### Supported File Formats

- `.csv` (Comma-separated values)
- `.xlsx` (Excel workbook)
- `.xls` (Excel 97-2003)

### Excel Sheet Structure

Your spreadsheet should have these columns (in any order):

#### Required Columns
```
NAME                    Registration No.      College Email Id     Contact No.          TICKET TYPE
Ahmed Ali              REG2024001            ahmed@college.edu    +91 98765 43210      Regular
Fatima Khan            REG2024002            fatima@college.edu   +91 98765 43211      Front Row Solo
```

#### For Duo Tickets
Add these additional columns for the second participant:

```
NAME:                   REGISTRATION NO.:      COLLEGE EMAIL ID:    CONTACT NO.:
Sarah Connor           REG2024003            sarah@college.edu    +91 98765 43212
John Davis             REG2024004            john@college.edu     +91 98765 43213
```

### Full Example Spreadsheet

```csv
NAME,Registration No.,College Email Id,Contact No.,TICKET TYPE,NAME:,REGISTRATION NO.:,COLLEGE EMAIL ID:,CONTACT NO.:
Ahmed Ali,REG2024001,ahmed@college.edu,+91 98765 43210,Regular,,,,
Rajesh Kumar,REG2024002,rajesh@college.edu,+91 98765 43211,Regular Duo,Priya Sharma,REG2024003,priya@college.edu,+91 98765 43212
Maya Patel,REG2024004,maya@college.edu,+91 98765 43213,Front Row Solo,,,,
Vikram Singh,REG2024005,vikram@college.edu,+91 98765 43214,Front Row Duo,Ananya Desai,REG2024006,ananya@college.edu,+91 98765 43215
```

### Upload Steps

1. Open the **Import** tab
2. Click **Upload File** sub-tab
3. Click the upload area or drag-and-drop your CSV/Excel file
4. The system will:
   - Parse the file
   - Validate all entries
   - Create tickets for valid rows
   - Report any errors

### Import Results

After upload, you'll see:
- **Imported count** - Successfully created tickets
- **Skipped count** - Rows that were skipped
- **Errors list** - Detailed error messages for troubleshooting

### Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing primary participant name or email` | NAME or COLLEGE EMAIL ID empty | Ensure all participants have name and email |
| `Invalid ticket type "xxx"` | Typo in ticket type | Use exact values: `regular`, `regular duo`, `front row solo`, `front row duo` |
| `Duo ticket missing second participant data` | NAME: or COLLEGE EMAIL ID: empty for duo | For duo tickets, provide second participant info |

---

## Field Mapping

The system expects these exact column headers (case-insensitive, but spaces matter):

### Primary Participant
- `NAME` - First participant's full name
- `REGISTRATION NO.` or `Registration No.` - Registration number
- `COLLEGE EMAIL ID` or `College Email Id` - Email address
- `CONTACT NO.` or `Contact No.` - Phone number
- `TICKET TYPE` - Type of ticket

### Secondary Participant (Duo tickets only)
- `NAME:` - Second participant's full name
- `REGISTRATION NO.:` - Second participant's registration number
- `COLLEGE EMAIL ID:` - Second participant's email
- `CONTACT NO.:` - Second participant's phone number

---

## Database Integration

When you add participants:

1. **Ticket Creation** - A unique ticket code is generated
2. **Database Store** - Participant data stored in MongoDB
3. **QR Code** - Ready for scanning at the event
4. **Check-in System** - Participant appears in scanner app

## Ticket Code Format

Ticket codes are auto-generated with the format:
```
{EVENT_PREFIX}-{RANDOM_HEX}
```

Example: `XEN1-A3F2C91B`

---

## Tips & Best Practices

✅ **DO:**
- Export your registration data from Google Forms as CSV
- Review data before uploading
- Use consistent email formats
- Include Registration No. for reference

❌ **DON'T:**
- Use special characters in names (unless necessary)
- Leave required fields empty
- Include spaces around email addresses (email@college.edu, not email @ college .edu)
- Forget to select the correct ticket type

---

## Troubleshooting

### Import shows 0 imported, all skipped
- Check that TICKET TYPE values are correct and spelled exactly as specified
- Verify required columns exist (NAME, COLLEGE EMAIL ID, TICKET TYPE)

### Some rows failed but no error message
- Check that duo participants have both NAME: and COLLEGE EMAIL ID: columns
- Ensure no duplicate email addresses (each person needs unique email)

### Can't see uploaded file results
- Check browser console for network errors
- Verify file format is CSV or Excel
- Ensure file size is reasonable (< 10MB)

---

## API Endpoints (For Developers)

### Add Single Participant
```
POST /api/tickets/add-participant
Content-Type: application/json

{
  "eventId": "event-id",
  "name": "Ahmed Ali",
  "email": "ahmed@college.edu",
  "ticketType": "regular",
  "duo": {
    "name": "Fatima Khan",
    "email": "fatima@college.edu"
  }
}
```

### Bulk Import from File
```
POST /api/tickets/import
Content-Type: multipart/form-data

file: <CSV or Excel file>
eventId: <event-id>
```

Response:
```json
{
  "success": true,
  "imported": 42,
  "skipped": 3,
  "errors": [
    "Row 10: invalid ticket type \"premium\"",
    "Row 25: missing name or email"
  ]
}
```
