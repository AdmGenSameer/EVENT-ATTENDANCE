# Google Sheets Sync Feature - Quick Guide

## Overview

The Import tab now includes a **Google Sheets Sync** feature that allows you to automatically synchronize participant data from a Google Sheet into your event's participant database.

## Features

✅ **Direct Google Sheets Integration**
- Paste your Google Sheets URL
- Automatic data sync
- Real-time error reporting
- Progress tracking

✅ **Flexible Column Mapping**
- Automatically detects standard column names
- Supports variations in column naming
- Works with duo participant data

✅ **Error Handling**
- Detailed error messages per row
- Skip invalid entries without stopping sync
- Import results summary

## How to Use

### Step 1: Prepare Your Google Sheet

Create a Google Sheet with the following columns:

**Required for all tickets:**
- `NAME` - Participant name
- `College Email Id` - Email address
- `Contact No.` - Phone number
- `TICKET TYPE` - One of: regular, regular duo, front row solo, front row duo
- `Registration No.` - Optional registration number

**For duo tickets, add:**
- `NAME:` - Second participant name
- `COLLEGE EMAIL ID:` - Second participant email
- `CONTACT NO.:` - Second participant phone
- `REGISTRATION NO.:` - Second participant registration (optional)

### Step 2: Share the Sheet

1. Open the Google Sheet
2. Click "Share" button
3. Add the service account email (provided by admin)
4. Give "Viewer" permission
5. Copy the sheet URL

### Step 3: Sync in Admin Panel

1. Go to **Participant Management** tab
2. Click **Google Sheets** sub-tab
3. Paste your Google Sheets URL
4. Click **Sync Participants**
5. Wait for completion
6. Review results

## Example Google Sheet Format

| NAME | Registration No. | College Email Id | Contact No. | TICKET TYPE | NAME: | REGISTRATION NO.: | COLLEGE EMAIL ID: | CONTACT NO.: |
|------|------------------|------------------|-------------|------------|-------|-------------------|-------------------|--------------|
| John Doe | REG001 | john@college.edu | +91 98765 43210 | regular | | | | |
| Jane Smith | REG002 | jane@college.edu | +91 98765 43211 | regular duo | Jane Partner | REG003 | partner@college.edu | +91 98765 43212 |
| Alice Brown | REG004 | alice@college.edu | +91 98765 43213 | front row solo | | | | |

## API Endpoint

**POST** `/api/tickets/sync-google-sheets`

```json
Request:
{
  "eventId": "event-id",
  "sheetId": "google-sheet-id"
}

Response:
{
  "success": true,
  "imported": 50,
  "skipped": 2,
  "errors": ["Row 5: Missing NAME", "Row 10: Invalid email"],
  "totalRows": 52
}
```

## Column Name Variations

The system automatically recognizes these variations:

| Standard | Variations |
|----------|-----------|
| NAME | name, Name |
| College Email Id | email, Email, COLLEGE EMAIL ID, college email id |
| Contact No. | contact no, Contact No, CONTACT NO, phone |
| Registration No. | registration no, reg no, Reg No |
| TICKET TYPE | ticket type, Ticket Type, type |

## Troubleshooting

### "Invalid Google Sheets URL"
- Make sure you're using the full sharing URL
- Format: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit...`
- Not the shortened URL

### "No data found in Google Sheet"
- Check that the sheet contains data
- Ensure you're sharing the correct sheet
- Verify the range includes headers

### "Missing required fields"
- Check column names match the required format
- Ensure NAME, Email, and TICKET TYPE are present
- Review row formatting

### "Sync failed - Permission denied"
- Verify the sheet is shared with the service account
- Check you gave "Viewer" or higher permission
- Re-share the sheet and try again

### "Service account credentials not configured"
- Contact admin to set up Google Sheets integration
- Requires credentials from Google Cloud Console

## Tips & Best Practices

✅ **Before syncing:**
- Validate data in the spreadsheet
- Check for duplicate entries
- Ensure email addresses are correct

✅ **Column headers:**
- Use exactly the specified column names
- No spaces before/after names
- Consistent formatting

✅ **Data quality:**
- Valid email addresses required
- Ticket type must be one of the 4 options
- No blank NAME fields

✅ **After syncing:**
- Review results for any errors
- Check the Participants tab to confirm
- Run QR generation if needed

## Supported Ticket Types

| Type | Description |
|------|-------------|
| regular | Single participant |
| regular duo | Two participants (couple) |
| front row solo | Single participant - front row |
| front row duo | Two participants - front row |

## Limits

- Maximum 1000 rows per sync
- Column limit: 20 columns
- Import timeout: 30 seconds
- Error limit: 50 errors displayed

## Integration Notes

- The sync creates separate tickets for duo participants
- Each ticket gets a unique ticket code
- QR codes can be generated separately in QR Generator tab
- All participants added via sync can be seen in Participants tab

## Advanced

### Real-time Column Detection

The system intelligently detects columns by:
1. Exact name match (case-insensitive)
2. Partial match (e.g., "email" matches "College Email Id")
3. Sequence order fallback

### Duo Participant Format

For duo tickets, the system looks for:
- Primary: NAME, EMAIL, CONTACT, REG
- Secondary: NAME:, EMAIL:, CONTACT:, REG:

The colon (`:`) suffix indicates secondary participant fields.

## Support

For issues or questions:
1. Check Troubleshooting section above
2. Review column naming requirements
3. Validate Google Sheet sharing
4. Contact system admin

---

**Feature Status**: ✅ Production Ready
**Last Updated**: Today
**Version**: 1.0
