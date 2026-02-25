import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/app_state.dart';
import '../services/database.dart';
import '../services/api_service.dart';
import '../services/sync_service.dart';
import '../services/qr_verifier.dart';
import '../services/seat_allocation_service.dart';
import '../models/ticket.dart';
import 'dart:async';

class ScannerScreenNew extends StatefulWidget {
  const ScannerScreenNew({super.key});

  @override
  State<ScannerScreenNew> createState() => _ScannerScreenNewState();
}

class _ScannerScreenNewState extends State<ScannerScreenNew> {
  final MobileScannerController _scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  final DatabaseService _dbService = DatabaseService();
  late final SeatAllocationService _seatService;
  late SyncService _syncService;

  String _status = 'Ready to scan';
  Color _statusColor = Colors.blue;
  bool _isProcessing = false;
  bool _isOnline = true;
  int _pendingSyncCount = 0;
  int _checkedInCount = 0;
  int _totalTickets = 0;
  Ticket? _lastScannedTicket;
  Timer? _statusTimer;
  Timer? _syncTimer;
  Timer? _blockedSeatsTimer;

  @override
  void initState() {
    super.initState();
    final appState = context.read<AppState>();
    _syncService = SyncService(
      apiService: ApiService(baseUrl: appState.apiBaseUrl!),
      dbService: _dbService,
    );
    _seatService = SeatAllocationService(dbService: _dbService);
    _startBackgroundTasks();
    _loadStats();
  }

  @override
  void dispose() {
    _statusTimer?.cancel();
    _syncTimer?.cancel();
    _blockedSeatsTimer?.cancel();
    _scannerController.dispose();
    super.dispose();
  }

  void _startBackgroundTasks() {
    _updateStatus();
    _statusTimer = Timer.periodic(const Duration(seconds: 10), (_) => _updateStatus());
    
    // Auto-sync every 30 seconds if online
    _syncTimer = Timer.periodic(const Duration(seconds: 30), (_) async {
      if (_isOnline && _pendingSyncCount > 0) {
        final appState = context.read<AppState>();
        await _syncService.syncCheckIns(
          eventId: appState.currentEvent!.id,
          scannerId: appState.scannerId!,
        );
        _updateStatus();
      }
    });

    // Sync blocked seats every 2 minutes if online
    _blockedSeatsTimer = Timer.periodic(const Duration(minutes: 2), (_) async {
      if (_isOnline) {
        final appState = context.read<AppState>();
        if (appState.currentEvent != null) {
          await _syncService.syncBlockedSeats(appState.currentEvent!.id);
          debugPrint('[Scanner] Blocked seats synced');
        }
      }
    });
  }

  Future<void> _updateStatus() async {
    try {
      final appState = context.read<AppState>();
      final online = await _syncService.isOnline();
      final pending = await _syncService.getPendingCount();
      
      if (mounted) {
        setState(() {
          _isOnline = online;
          _pendingSyncCount = pending;
        });
      }
    } catch (e) {
      debugPrint('[Scanner] Status update failed: $e');
    }
  }

  Future<void> _loadStats() async {
    try {
      final appState = context.read<AppState>();
      if (appState.currentEvent == null) return;

      final checkedIn = await _dbService.getCheckedInCount(appState.currentEvent!.id);
      final total = await _dbService.getTotalTicketCount(appState.currentEvent!.id);
      
      if (mounted) {
        setState(() {
          _checkedInCount = checkedIn;
          _totalTickets = total;
        });
      }
    } catch (e) {
      debugPrint('[Scanner] Load stats failed: $e');
    }
  }

  Future<void> _refreshStats() async {
    try {
      final appState = context.read<AppState>();
      if (appState.currentEvent == null) return;

      // Fetch both stats and status in parallel
      final results = await Future.wait([
        _dbService.getCheckedInCount(appState.currentEvent!.id),
        _dbService.getTotalTicketCount(appState.currentEvent!.id),
        _syncService.isOnline(),
        _syncService.getPendingCount(),
      ]);
      
      if (mounted) {
        setState(() {
          _checkedInCount = results[0] as int;
          _totalTickets = results[1] as int;
          _isOnline = results[2] as bool;
          _pendingSyncCount = results[3] as int;
        });
      }
    } catch (e) {
      debugPrint('[Scanner] Refresh stats failed: $e');
    }
  }

  Future<void> _handleBarcodeScan(BarcodeCapture capture) async {
    if (_isProcessing) return;

    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;

    final code = barcodes.first.rawValue;
    if (code == null || code.isEmpty) return;

    await _processQRCode(code);
  }

  Future<void> _processQRCode(String qrData) async {
    if (_isProcessing) return;

    setState(() {
      _isProcessing = true;
      _status = 'Verifying...';
      _statusColor = Colors.orange;
    });

    HapticFeedback.mediumImpact();

    try {
      final appState = context.read<AppState>();
      final event = appState.currentEvent!;

      // Verify QR signature
      final result = await verifyQrToken(
        token: qrData,
        publicKeyPem: event.publicKey,
        nowEpoch: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      );

      if (!result.isValid) {
        _showError('Invalid QR: ${result.reason}');
        HapticFeedback.heavyImpact();
        return;
      }

      final payload = result.payload!;

      // Check if it's for this event
      if (payload.eventId != event.id) {
        _showError('QR code is for a different event');
        HapticFeedback.heavyImpact();
        return;
      }

      // Get ticket from local database
      final ticket = await _dbService.getTicket(payload.ticketId);
      if (ticket == null) {
        _showError('Ticket not found. Sync required.');
        HapticFeedback.heavyImpact();
        return;
      }

      // Check if already checked in
      if (ticket.checkedIn) {
        _showWarning('Already checked in', ticket);
        HapticFeedback.mediumImpact();
        return;
      }

      // Check in the ticket
      final timestamp = DateTime.now();
      await _dbService.markTicketCheckedIn(
        ticket.id,
        appState.scannerId!,
        timestamp,
      );

      // Seat allocation (device-based, pair-aware)
      final deviceId = appState.deviceId ?? 1;
      final section = _resolveSection(ticket.category);
      final isDuo = _isDuoTicket(ticket.category);

      final seatResult = await _seatService.assignSeatForTicket(
        eventId: event.id,
        ticketId: ticket.id,
        isDuo: isDuo,
        deviceId: deviceId,
        section: section,
      );

      if (seatResult != null) {
        final seatCodes = seatResult.seatCodes
            .map(SeatAllocationService.formatSeatCode)
            .join(', ');
        await _dbService.updateTicketSeat(ticket.id, seatCodes);
      }

      // Add to sync queue (non-blocking)
      _syncService.addToSyncQueue(
        ticketId: ticket.id,
        action: 'checkin',
        timestamp: timestamp,
      );

      // Update stats (batched, non-blocking)
      _refreshStats();

      // Show success
      final updatedTicket = ticket.copyWith(
        checkedIn: true,
        checkedInAt: timestamp.toIso8601String(),
        seatCode: seatResult == null
            ? ticket.seatCode
            : seatResult.seatCodes
                .map(SeatAllocationService.formatSeatCode)
                .join(', '),
      );
      final seatLabel = updatedTicket.seatCode == null
          ? ''
          : '\nSeat: ${updatedTicket.seatCode}';
      _showSuccess('Checked in successfully$seatLabel', updatedTicket);
      HapticFeedback.lightImpact();
    } catch (e) {
      debugPrint('[Scanner] Process QR failed: $e');
      _showError('Verification failed: ${e.toString()}');
      HapticFeedback.heavyImpact();
    }
  }

  String _resolveSection(String? category) {
    final upper = (category ?? '').toUpperCase();
    if (upper.contains('FRONT') || upper.contains('STUDENT') || upper.contains('CHILD')) {
      return 'front';
    }
    return 'rear';
  }

  bool _isDuoTicket(String? category) {
    final upper = (category ?? '').toUpperCase();
    return upper.contains('DUO') || upper.contains('COUPLE');
  }

  void _showSuccess(String message, Ticket ticket) {
    setState(() {
      _status = message;
      _statusColor = Colors.green;
      _lastScannedTicket = ticket;
      _isProcessing = false;
    });

    // Auto-reset after 3 seconds
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted && !_isProcessing) {
        setState(() {
          _status = 'Ready to scan';
          _statusColor = Colors.blue;
          _lastScannedTicket = null;
        });
      }
    });
  }

  void _showWarning(String message, Ticket ticket) {
    setState(() {
      _status = message;
      _statusColor = Colors.orange;
      _lastScannedTicket = ticket;
      _isProcessing = false;
    });

    Future.delayed(const Duration(seconds: 3), () {
      if (mounted && !_isProcessing) {
        setState(() {
          _status = 'Ready to scan';
          _statusColor = Colors.blue;
          _lastScannedTicket = null;
        });
      }
    });
  }

  void _showError(String message) {
    setState(() {
      _status = '✗ $message';
      _statusColor = Colors.red;
      _lastScannedTicket = null;
      _isProcessing = false;
    });

    Future.delayed(const Duration(seconds: 3), () {
      if (mounted && !_isProcessing) {
        setState(() {
          _status = 'Ready to scan';
          _statusColor = Colors.blue;
        });
      }
    });
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: Colors.grey[700]),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Future<void> _manualSync() async {
    final appState = context.read<AppState>();
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const AlertDialog(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(),
            SizedBox(height: 16),
            Text('Syncing...'),
          ],
        ),
      ),
    );

    try {
      // Sync check-ins
      final appState = context.read<AppState>();
      final checkInResult = await _syncService.syncCheckIns(
        eventId: appState.currentEvent!.id,
        scannerId: appState.scannerId!,
      );
      
      // Sync tickets
      final ticketResult = await _syncService.syncTickets(appState.currentEvent!.id);
      
      // Sync blocked seats
      final blockedSeatsResult = await _syncService.syncBlockedSeats(appState.currentEvent!.id);

      if (mounted) {
        Navigator.pop(context);
        
        final message = checkInResult.success && ticketResult.success && blockedSeatsResult.success
            ? 'Synced: ${checkInResult.synced} check-ins, ${ticketResult.ticketCount} tickets, ${blockedSeatsResult.synced} blocked seats'
            : 'Sync completed with errors';

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(message),
            backgroundColor: checkInResult.success && ticketResult.success && blockedSeatsResult.success
                ? Colors.green
                : Colors.orange,
          ),
        );

        await _refreshStats();
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sync failed: ${e.toString()}'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showManualSearch() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => ManualSearchSheet(
        dbService: _dbService,
        onTicketSelected: _processManualCheckIn,
      ),
    );
  }

  Future<void> _processManualCheckIn(Ticket ticket) async {
    Navigator.pop(context); // Close search sheet

    if (ticket.checkedIn) {
      _showWarning('Already checked in', ticket);
      return;
    }

    setState(() {
      _isProcessing = true;
      _status = 'Checking in...';
      _statusColor = Colors.orange;
    });

    try {
      final appState = context.read<AppState>();
      final timestamp = DateTime.now();
      
      await _dbService.markTicketCheckedIn(
        ticket.id,
        appState.scannerId!,
        timestamp,
      );

      await _syncService.addToSyncQueue(
        ticketId: ticket.id,
        action: 'checkin',
        timestamp: timestamp,
      );

      await _loadStats();
      await _updateStatus();

      final updatedTicket = ticket.copyWith(
        checkedIn: true,
        checkedInAt: timestamp.toIso8601String(),
      );

      _showSuccess('Manual check-in successful', updatedTicket);
    } catch (e) {
      _showError('Manual check-in failed: ${e.toString()}');
    }
  }

  void _showSettings() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Scanner Settings'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Scanner ID: ${context.read<AppState>().scannerId}'),
            const SizedBox(height: 8),
            Text('Event: ${context.read<AppState>().currentEvent?.name}'),
            const SizedBox(height: 8),
            Text('API: ${context.read<AppState>().apiBaseUrl}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await context.read<AppState>().clearSetup();
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Reset Scanner'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    
    return Scaffold(
      appBar: AppBar(
        title: Text(appState.currentEvent?.name ?? 'Scanner'),
        actions: [
          // Online/Offline indicator
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0),
            child: Center(
              child: Row(
                children: [
                  Icon(
                    _isOnline ? Icons.cloud_done : Icons.cloud_off,
                    color: _isOnline ? Colors.green : Colors.orange,
                    size: 20,
                  ),
                  const SizedBox(width: 4),
                  if (_pendingSyncCount > 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.orange,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        '$_pendingSyncCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: _showManualSearch,
            tooltip: 'Manual Search',
          ),
          IconButton(
            icon: const Icon(Icons.sync),
            onPressed: _manualSync,
            tooltip: 'Sync Now',
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: _showSettings,
            tooltip: 'Settings',
          ),
        ],
      ),
      body: Column(
        children: [
          // Stats Bar
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.grey[100],
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildStatItem(
                  icon: Icons.check_circle,
                  label: 'Checked In',
                  value: '$_checkedInCount',
                  color: Colors.green,
                ),
                _buildStatItem(
                  icon: Icons.confirmation_number,
                  label: 'Total',
                  value: '$_totalTickets',
                  color: Colors.blue,
                ),
                _buildStatItem(
                  icon: Icons.pending,
                  label: 'Remaining',
                  value: '${_totalTickets - _checkedInCount}',
                  color: Colors.orange,
                ),
              ],
            ),
          ),

          // Scanner View
          Expanded(
            flex: 2,
            child: Stack(
              children: [
                MobileScanner(
                  controller: _scannerController,
                  onDetect: _handleBarcodeScan,
                ),
                // Scanner overlay
                Center(
                  child: Container(
                    width: 250,
                    height: 250,
                    decoration: BoxDecoration(
                      border: Border.all(
                        color: Colors.white,
                        width: 3,
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Status Panel
          Expanded(
            flex: 1,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: _statusColor.withOpacity(0.1),
                border: Border(
                  top: BorderSide(
                    color: _statusColor,
                    width: 3,
                  ),
                ),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    _isProcessing ? Icons.hourglass_empty : Icons.qr_code_scanner,
                    size: 48,
                    color: _statusColor,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _status,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: _statusColor,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  if (_lastScannedTicket != null) ...[
                    const SizedBox(height: 16),
                    Card(
                      elevation: 4,
                      color: _statusColor == Colors.green ? Colors.green[50] : Colors.orange[50],
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  _statusColor == Colors.green ? Icons.check_circle : Icons.warning,
                                  color: _statusColor,
                                  size: 32,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    _statusColor == Colors.green ? '✓ Valid Ticket' : '⚠ Already Checked In',
                                    style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                      color: _statusColor,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const Divider(height: 24),
                            _buildDetailRow(Icons.person, 'Name', _lastScannedTicket!.name),
                            const SizedBox(height: 12),
                            _buildDetailRow(Icons.confirmation_number, 'Ticket Code', _lastScannedTicket!.ticketCode),
                            const SizedBox(height: 12),
                            _buildDetailRow(Icons.category, 'Ticket Type', _lastScannedTicket!.category ?? 'N/A'),
                            if (_lastScannedTicket!.personalEmail != null) ...[
                              const SizedBox(height: 12),
                              _buildDetailRow(Icons.email, 'Email', _lastScannedTicket!.personalEmail!),
                            ],
                            if (_lastScannedTicket!.seatCode != null) ...[
                              const SizedBox(height: 12),
                              _buildDetailRow(Icons.event_seat, 'Seat Assigned', _lastScannedTicket!.seatCode!),
                            ],
                            if (_lastScannedTicket!.checkedInAt != null) ...[
                              const SizedBox(height: 12),
                              _buildDetailRow(
                                Icons.access_time,
                                'Check-in Time',
                                DateFormat('MMM dd, yyyy HH:mm:ss').format(DateTime.parse(_lastScannedTicket!.checkedInAt!)),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Column(
      children: [
        Icon(icon, color: color, size: 32),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }
}

// Manual Search Sheet Widget
class ManualSearchSheet extends StatefulWidget {
  final DatabaseService dbService;
  final Function(Ticket) onTicketSelected;

  const ManualSearchSheet({
    super.key,
    required this.dbService,
    required this.onTicketSelected,
  });

  @override
  State<ManualSearchSheet> createState() => _ManualSearchSheetState();
}

class _ManualSearchSheetState extends State<ManualSearchSheet> {
  final _searchController = TextEditingController();
  List<Ticket> _searchResults = [];
  bool _isSearching = false;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _search(String query) async {
    if (query.length < 2) {
      setState(() => _searchResults = []);
      return;
    }

    setState(() => _isSearching = true);

    try {
      final appState = context.read<AppState>();
      final results = await widget.dbService.searchTickets(
        appState.currentEvent!.id,
        query,
      );
      
      if (mounted) {
        setState(() {
          _searchResults = results;
          _isSearching = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSearching = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.9,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              // Handle bar
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Title
              const Text(
                'Manual Search',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              // Search field
              TextField(
                controller: _searchController,
                decoration: InputDecoration(
                  hintText: 'Name, ticket code, email, or reg no',
                  prefixIcon: const Icon(Icons.search),
                  suffixIcon: _isSearching
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: Padding(
                            padding: EdgeInsets.all(12.0),
                            child: CircularProgressIndicator(strokeWidth: 2),
                          ),
                        )
                      : null,
                  border: const OutlineInputBorder(),
                ),
                onChanged: _search,
              ),
              const SizedBox(height: 16),
              // Results
              Expanded(
                child: _searchResults.isEmpty
                    ? Center(
                        child: Text(
                          _searchController.text.length < 2
                              ? 'Enter at least 2 characters to search'
                              : 'No results found',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                      )
                    : ListView.builder(
                        controller: scrollController,
                        itemCount: _searchResults.length,
                        itemBuilder: (context, index) {
                          final ticket = _searchResults[index];
                          return Card(
                            child: ListTile(
                              leading: Icon(
                                ticket.checkedIn
                                    ? Icons.check_circle
                                    : Icons.confirmation_number,
                                color: ticket.checkedIn
                                    ? Colors.green
                                    : Colors.blue,
                              ),
                              title: Text(ticket.name),
                              subtitle: Text(
                                'Code: ${ticket.ticketCode}\n'
                                '${ticket.personalEmail}',
                              ),
                              trailing: ticket.checkedIn
                                  ? const Chip(
                                      label: Text('Checked In'),
                                      backgroundColor: Colors.green,
                                    )
                                  : null,
                              onTap: () => widget.onTicketSelected(ticket),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}
