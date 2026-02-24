import "package:flutter/material.dart";
import "package:mobile_scanner/mobile_scanner.dart";
import "../services/database.dart";
import "../services/qr_verifier.dart";
import "../services/sync_service.dart";
import "../services/api_service.dart";
import "../models/event.dart";
import "../models/ticket.dart";
import "dart:async";

class ScannerScreen extends StatefulWidget {
  const ScannerScreen({super.key});

  @override
  State<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends State<ScannerScreen> {
  final dbService = DatabaseService();
  final controller = MobileScannerController();
  late final SyncService syncService;
  
  Event? currentEvent;
  String? status;
  Color? statusColor;
  bool isProcessing = false;
  bool isOnline = true;
  int pendingSyncCount = 0;
  Timer? _statusTimer;

  @override
  void initState() {
    super.initState();
    syncService = SyncService(
      apiService: ApiService(),
      dbService: dbService,
    );
    _loadEvent();
    _startStatusCheck();
  }

  Future<void> _loadEvent() async {
    try {
      debugPrint("[ScannerScreen] loading event");
      setState(() {
        status = "Ready to scan";
        statusColor = Colors.blue;
      });
      
      // Start background sync
      syncService.startBackgroundSync();
    } catch (error) {
      debugPrint("[ScannerScreen] load event failed: $error");
      setState(() {
        status = "Error loading event";
        statusColor = Colors.red;
      });
    }
  }

  void _startStatusCheck() {
    _updateStatus();
    _statusTimer = Timer.periodic(const Duration(seconds: 10), (_) {
      _updateStatus();
    });
  }

  Future<void> _updateStatus() async {
    try {
      final online = await syncService.isOnline();
      final pending = await syncService.getPendingCount();
      
      if (mounted) {
        setState(() {
          isOnline = online;
          pendingSyncCount = pending;
        });
      }
    } catch (e) {
      debugPrint("[ScannerScreen] status update failed: $e");
    }
  }

  Future<void> _manualSync() async {
    setState(() {
      status = "Syncing...";
      statusColor = Colors.orange;
    });

    final result = await syncService.syncCheckIns();
    
    if (mounted) {
      setState(() {
        status = result.success 
            ? "Sync complete: ${result.synced} items"
            : "Sync failed: ${result.message}";
        statusColor = result.success ? Colors.green : Colors.red;
      });
      
      _updateStatus();
      
      // Auto-reset after 2 seconds
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted && !isProcessing) {
          setState(() {
            status = "Ready to scan";
            statusColor = Colors.blue;
          });
        }
      });
    }
  }

  Future<void> _handleScan(String token) async {
    if (isProcessing) {
      return;
    }

    try {
      setState(() {
        isProcessing = true;
        status = "Verifying...";
        statusColor = Colors.orange;
      });

      // For demo, use a hardcoded event ID
      // In production, get from currentEvent
      final demoEventId = "demo-event-id";
      final event = await dbService.getEvent(demoEventId);

      if (event == null) {
        setState(() {
          status = "Event not synced. Please sync first.";
          statusColor = Colors.red;
          isProcessing = false;
        });
        return;
      }

      final result = await verifyQrToken(
        token: token,
        publicKeyPem: event.publicKey,
        nowEpoch: DateTime.now().millisecondsSinceEpoch ~/ 1000,
      );

      if (!result.isValid) {
        setState(() {
          status = "Invalid QR: ${result.reason}";
          statusColor = Colors.red;
          isProcessing = false;
        });
        return;
      }

      final payload = result.payload!;
      final ticket = await dbService.getTicket(payload.ticketId);

      if (ticket == null) {
        setState(() {
          status = "Ticket not found in local database";
          statusColor = Colors.red;
          isProcessing = false;
        });
        return;
      }

      if (ticket.checkedIn) {
        setState(() {
          status = "Already checked in: ${ticket.name}";
          statusColor = Colors.orange;
          isProcessing = false;
        });
        return;
      }

      // Check in the ticket
      await dbService.checkInTicket(ticket.id);
      await dbService.addToSyncQueue(ticket.id, "checkin");

      setState(() {
        status = "✓ Checked in: ${ticket.name}";
        statusColor = Colors.green;
        isProcessing = false;
      });

      // Auto-reset status after 2 seconds
      Future.delayed(const Duration(seconds: 2), () {
        if (mounted) {
          setState(() {
            status = "Ready to scan";
            statusColor = Colors.blue;
          });
        }
      });
    } catch (error) {
      debugPrint("[ScannerScreen] scan failed: $error");
      setState(() {
        status = "Scan failed";
        statusColor = Colors.red;
        isProcessing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("EventQR Scanner"),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          // Offline indicator
          if (!isOnline)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 8.0),
              child: Icon(Icons.cloud_off, color: Colors.white70),
            ),
          // Pending sync count
          if (pendingSyncCount > 0)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0),
              child: Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.orange,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '$pendingSyncCount',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.sync),
            onPressed: isOnline ? _manualSync : null,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            flex: 3,
            child: MobileScanner(
              controller: controller,
              onDetect: (capture) {
                try {
                  final barcodes = capture.barcodes;
                  if (barcodes.isEmpty) {
                    return;
                  }
                  final rawValue = barcodes.first.rawValue;
                  if (rawValue != null && rawValue.isNotEmpty) {
                    _handleScan(rawValue);
                  }
                } catch (error) {
                  debugPrint("[ScannerScreen] onDetect failed: $error");
                }
              },
            ),
          ),
          Expanded(
            flex: 1,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              color: statusColor ?? Colors.grey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    status ?? "Initializing...",
                    style: const TextStyle(
                     fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  if (isProcessing) ...[
                    const SizedBox(height: 12),
                    const CircularProgressIndicator(color: Colors.white),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    controller.dispose();
    syncService.dispose();
    _statusTimer?.cancel();
    super.dispose();
  }
}
