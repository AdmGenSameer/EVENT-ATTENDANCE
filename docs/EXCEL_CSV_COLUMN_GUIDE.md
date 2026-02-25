# Excel/CSV Column Reference Guide

## Quick Column Mapping

This document shows exactly which columns to use in your Excel/CSV file.

---

## Column Structure

### For ALL Participants (Solo & Duo)

| Column # | Header | Type | Required | Example | Notes |
|----------|--------|------|----------|---------|-------|
| A | NAME | Text | ✅ | Ahmed Ali | Full name of primary participant |
| B | Registration No. | Text | ❌ | REG2024001 | Student/participant ID |
| C | College Email Id | Email | ✅ | ahmed@college.edu | Must be valid email |
| D | Contact No. | Text | ❌ | +91 98765 43210 | Phone number (optional) |
| E | Batch | Text | ❌ | 2024 | Optional batch/year info |
| F | Referral Code | Text | ❌ | XEN-2024 | Referral tracking (optional) |
| G | **TICKET TYPE** | Dropdown | ✅ | Regular | See ticket types below |

### For DUO Tickets ONLY (Regular Duo, Front Row Duo)

If TICKET TYPE is "Regular Duo" or "Front Row Duo", include these columns:

| Column # | Header | Type | Required | Example | Notes |
|----------|--------|------|----------|---------|-------|
| H | NAME: | Text | ✅* | Priya Sharma | Full name of second participant |
| I | REGISTRATION NO.: | Text | ❌ | REG2024003 | Second person's ID |
| J | COLLEGE EMAIL ID: | Email | ✅* | priya@college.edu | Second person's email |
| K | CONTACT NO.: | Text | ❌ | +91 98765 43212 | Second person's phone |

*Required only if TICKET TYPE is Duo

---

## Valid TICKET TYPE Values

Use **exactly** one of these values in column G:

```
Regular              → Single participant, unreserved seating
Regular Duo          → Two participants, unreserved seating
Front Row Solo       → Single participant, reserved front row
Front Row Duo        → Two participants, reserved front row
```

**⚠️ CASE SENSITIVE** - Use exact capitalization shown above!

---

## Visual Example: Excel Layout

### Row 1 (Headers) - SOLO Ticket

```
| NAME        | Reg No.   | College Email Id     | Contact No.      | TICKET TYPE    |
|-------------|-----------|----------------------|------------------|-----------------|
| Ahmed Ali   | REG001    | ahmed@college.edu    | +91 98765 43210  | Regular         |
```

### Row 1 (Headers) - DUO Ticket

```
| NAME           | Reg No.   | Email              | Contact    | TICKET TYPE    | NAME:         | REGISTRATION NO.: | COLLEGE EMAIL ID:    | CONTACT NO.:
|----------------|-----------|----------------------|------------|----------------|----------------|------------------|------------------------|-----------------
| Rajesh Kumar   | REG002    | rajesh@college.edu | +91 99...  | Regular Duo    | Priya Sharma   | REG002B            | priya@college.edu    | +91 98765...
```

---

## Step-by-Step Instructions

### Creating the Excel File

1. **Open Excel or Google Sheets**

2. **Create Column Headers** (Row 1)
   ```
   A1: NAME
   B1: Registration No.
   C1: College Email Id
   D1: Contact No.
   E1: Batch
   F1: Referral Code
   G1: TICKET TYPE
   H1: NAME:
   I1: REGISTRATION NO.:
   J1: COLLEGE EMAIL ID:
   K1: CONTACT NO.:
   ```

3. **Add Data Rows**

   **For Solo Ticket (Row 2):**
   ```
   A2: Ahmed Ali
   B2: REG2024001
   C2: ahmed@college.edu
   D2: +91 98765 43210
   E2: 2024
   F2: XEN-2024
   G2: Regular
   (Leave H-K empty)
   ```

   **For Duo Ticket (Row 3):**
   ```
   A3: Rajesh Kumar
   B3: REG2024002
   C3: rajesh@college.edu
   D3: +91 98765 43211
   E3: 2024
   F3: XEN-2024
   G3: Regular Duo
   H3: Priya Sharma
   I3: REG2024003
   J3: priya@college.edu
   K3: +91 98765 43212
   ```

4. **Save As CSV or Excel**
   - Excel (.xlsx): File → Save As → Format: Excel Workbook
   - CSV (.csv): File → Save As → Format: CSV (Comma delimited)

---

## Real World Example

### Google Sheets Template

```
┌─────────────────┬──────────┬────────────────────┬────────────────┬───────┬──────────────┬──────────────────┬───────────────┬─────────────────┬────────────────────┬─────────────────┐
│ NAME            │ Reg No.  │ College Email Id   │ Contact No.    │ Batch │ Referral     │ TICKET TYPE      │ NAME:         │ REGISTRATION    │ COLLEGE EMAIL ID:  │ CONTACT NO.:    │
├─────────────────┼──────────┼────────────────────┼────────────────┼───────┼──────────────┼──────────────────┼───────────────┼─────────────────┼────────────────────┼─────────────────┤
│ Ahmed Ali       │ REG001   │ ahmed@college.edu  │ 9876543210     │ 2024  │ XEN-FORM     │ Regular          │               │                 │                    │                 │
│ Rajesh Kumar    │ REG002   │ rajesh@college.edu │ 9876543211     │ 2024  │ XEN-FORM     │ Regular Duo      │ Priya Sharma  │ REG002B         │ priya@college.edu  │ 9876543212      │
│ Maya Patel      │ REG003   │ maya@college.edu   │ 9876543213     │ 2024  │ REF-001      │ Front Row Solo   │               │                 │                    │                 │
│ Vikram Singh    │ REG004   │ vikram@college.edu │ 9876543214     │ 2024  │ REF-002      │ Front Row Duo    │ Ananya Desai  │ REG004B         │ ananya@college.edu │ 9876543215      │
└─────────────────┴──────────┴────────────────────┴────────────────┴───────┴──────────────┴──────────────────┴───────────────┴─────────────────┴────────────────────┴─────────────────┘
```

---

## What Gets Ignored (OK to Include)

These columns are parsed but currently ignored:
- Batch
- Referral Code
- Transaction ID (from original form)
- Beneficiary Name/UPI ID (from original form)
- Payment Screenshot (from original form)

You can include them in your file - they won't cause errors.

---

## What NOT to Include

⛔ These will cause errors or unexpected behavior:

- Empty NAME column → Row will be skipped
- Empty COLLEGE EMAIL ID → Row will be skipped
- Invalid email format → Row will be skipped
- Wrong TICKET TYPE value → Row will be skipped
- Empty COLLEGE EMAIL ID: for duo tickets → Warning logged, but second ticket won't be created
- Duplicate emails → Second entry will be created separately (no duplicate check yet)

---

## Common Mistakes & Fixes

| Mistake | Result | Fix |
|---------|--------|-----|
| Header: "name" instead of "NAME" | Column not recognized | Use exact capitalization: NAME |
| Ticket type: "Couple" | Row skipped: invalid ticket type | Use: Regular Duo |
| Email with spaces: "email @ college.edu" | Validation fails | Remove spaces: email@college.edu |
| Empty NAME: field | Row skipped | Fill in name for all rows |
| Duo ticket, but empty NAME: field | Solo ticket created only | Fill in second person's name |
| Missing COLLEGE EMAIL ID: column for duo | Excel upload works but second ticket not created | Add column J with COLLEGE EMAIL ID: |

---

## Column Position Flexibility

Columns can be in **any order** as long as the **headers match exactly**.

✅ This works (columns rearranged):
```
| TICKET TYPE | NAME | College Email Id | Registration No. |
```

❌ This doesn't work (headers misspelled):
```
| Ticket Type | Full Name | Email | Reg No. |
```

---

## File Size Limits

- Maximum file size: **10 MB**
- Maximum rows: **10,000**
- Recommended: **< 1,000 rows** for fast import

---

## Import Process

1. Click **Import** tab in admin panel
2. Click **Upload File** sub-tab
3. Select CSV or Excel file
4. System parses and validates
5. See results:
   - Imported: ✅ Successfully created
   - Skipped: ⚠️ Not created (check errors)
   - Errors: ❌ Detailed error messages per row

---

## Sample File Download

Use the pre-made sample file: `sample_import.csv` in the project root

```
cd ~/Projects/EVENT-ATTENDANCE
# Open sample_import.csv in Excel and modify for your event
```

---

## Questions?

See the full guide: [PARTICIPANT_IMPORT_GUIDE.md](./PARTICIPANT_IMPORT_GUIDE.md)
