# Emergency Entry Feature

## Overview
Emergency entry feature allows staff to manually check in attendees when QR codes are damaged, torn, or inaccessible using their registration number.

## User Story
When someone's QR code is damaged or at the edge/corner of the ticket making it unscannable, staff can use the emergency entry button to manually check them in using their registration number.

## Implementation

### 1. UI Component
**Location**: [scanner-app/lib/screens/scanner_screen_complete.dart](../scanner-app/lib/screens/scanner_screen_complete.dart)

**Emergency Button**:
- Red FloatingActionButton at bottom-right corner
- Icon: `Icons.emergency`
- Label: "Emergency Entry"
- Color: Red (`Colors.red[700]`)
- Position: `FloatingActionButtonLocation.endFloat`

### 2. Entry Dialog
**Features**:
- Title: "Emergency Entry" with emergency icon
- TextField for registration number input
- Text capitalization enabled
- Loading indicator during API call
- Cancel and Check In buttons
- Error handling with user-friendly messages

### 3. Backend Integration
**API Endpoint**: `GET /events/tickets/:regNo`

**API Method** (`api_service.dart`):
```dart
Future<Map<String, dynamic>> fetchTicketByRegNo(String regNo)
```

**Response Structure**:
```json
{
  "success": true,
  "participant": {
    "_id": "...",
    "ticketCode": "...",
    "name": "...",
    "email": "...",
    "ticketType": "...",
    "seatNumber": "...",
    "checkedIn": false,
    "registrationNo": "...",
    "contactNo": "..."
  },
  "qrCode": "..."
}
```

### 4. Check-In Flow
1. User clicks Emergency Entry button
2. Dialog appears with registration number input field
3. User enters registration number (e.g., REG001)
4. System validates input (not empty)
5. Loading indicator shows during API call
6. Backend fetches ticket by registration number
7. System converts API response to Ticket object
8. Calls existing `_processManualCheckIn(ticket)` method
9. Follows same check-in flow as QR scanning:
   - Checks if already checked in
   - Marks as checked in in local database
   - Adds to sync queue
   - Allocates seat if needed
   - Updates statistics
   - Shows success card with ticket details

## Error Handling

### Validation Errors
- Empty input: "Please enter a registration number"
- Display: Orange snackbar

### API Errors
- **Not Found**: "No ticket found for registration: REG001"
- **Network Error**: "Error: [error message]"
- **Timeout**: 10-second timeout with "Request timed out"
- Display: Red snackbar with 4-second duration

### Already Checked In
- Uses existing `_showWarning()` method
- Displays participant details with warning message

## Usage Instructions

### For Staff
1. When QR code is unreadable or damaged:
   - Look for the red "Emergency Entry" button at bottom-right
   - Tap the button
   - Ask attendee for their registration number
   - Enter the registration number in the dialog
   - Tap "Check In" button
   - System will process check-in automatically

2. Success Indicator:
   - Green card appears with "Valid Ticket" message
   - Shows participant name, ticket type, seat number, etc.
   - Same display as successful QR scan

3. Error Handling:
   - If registration number not found, error message appears
   - Staff should verify the registration number with attendee
   - Check if attendee is registered for correct event

## Testing Checklist

### Happy Path
- [ ] Click emergency entry button
- [ ] Enter valid registration number
- [ ] Verify loading indicator appears
- [ ] Confirm check-in successful
- [ ] Verify success card shows all details
- [ ] Check seat allocation works
- [ ] Verify sync to backend occurs

### Error Cases
- [ ] Test with empty input
- [ ] Test with invalid registration number
- [ ] Test with already checked-in ticket
- [ ] Test network timeout scenario
- [ ] Test offline mode behavior

### Integration
- [ ] Verify seat assignment syncs to admin panel
- [ ] Confirm check-in appears in Participants tab
- [ ] Check statistics update correctly
- [ ] Verify sync queue processes correctly

## Technical Details

### Files Modified
1. `scanner-app/lib/services/api_service.dart`
   - Added `fetchTicketByRegNo()` method
   - 10-second timeout
   - Proper error handling

2. `scanner-app/lib/screens/scanner_screen_complete.dart`
   - Added FloatingActionButton
   - Implemented `_showEmergencyEntry()` method
   - Reuses existing `_processManualCheckIn()` logic

### Dependencies
- Uses existing ApiService for HTTP calls
- Leverages existing check-in flow
- Reuses seat allocation logic
- Integrates with sync service

### State Management
- Uses StatefulBuilder for dialog state
- Loading state prevents multiple submissions
- Proper mounted checks before navigation

## Benefits
1. **Fallback Mechanism**: Provides backup when QR scanning fails
2. **User Experience**: Quick manual entry for damaged tickets
3. **Consistency**: Uses same check-in flow as QR scanning
4. **Error Handling**: Clear feedback for all scenarios
5. **Accessibility**: Prominent red button easy to find

## Future Enhancements
- Add barcode scanning as alternative input
- Cache recent registration numbers for quick access
- Add registration number format validation
- Support bulk emergency entries
- Log emergency entries separately for audit trail
