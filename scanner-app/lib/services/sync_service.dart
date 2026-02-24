import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'api_service.dart';
import 'database.dart';
import '../models/ticket.dart';
import '../models/event.dart';

class SyncService {
  final ApiService apiService;
  final DatabaseService dbService;
  final Connectivity connectivity;
  
  Timer? _syncTimer;
  bool _isSyncing = false;
  
  // Sync every 5 minutes when online
  static const Duration syncInterval = Duration(minutes: 5);
  
  SyncService({
    required this.apiService,
    required this.dbService,
    Connectivity? connectivity,
  }) : connectivity = connectivity ?? Connectivity();

  /// Check if device has internet connectivity
  Future<bool> isOnline() async {
    try {
      final result = await connectivity.checkConnectivity();
      final hasConnection = result.first != ConnectivityResult.none;
      debugPrint('[SyncService] Connectivity check: ${hasConnection ? 'ONLINE' : 'OFFLINE'}');
      return hasConnection;
    } catch (e) {
      debugPrint('[SyncService] Error checking connectivity: $e');
      return false;
    }
  }

  /// Start background sync timer
  void startBackgroundSync() {
    debugPrint('[SyncService] Starting background sync (interval: ${syncInterval.inMinutes} min)');
    stopBackgroundSync(); // Stop existing timer if any
    
    _syncTimer = Timer.periodic(syncInterval, (_) async {
      await syncCheckIns();
    });
  }

  /// Stop background sync timer
  void stopBackgroundSync() {
    _syncTimer?.cancel();
    _syncTimer = null;
    debugPrint('[SyncService] Background sync stopped');
  }

  /// Sync check-ins from local queue to backend
  Future<SyncResult> syncCheckIns() async {
    if (_isSyncing) {
      debugPrint('[SyncService] Sync already in progress, skipping');
      return SyncResult(success: false, message: 'Sync in progress');
    }

    _isSyncing = true;
    
    try {
      // Check connectivity first
      final online = await isOnline();
      if (!online) {
        debugPrint('[SyncService] Device offline, skipping sync');
        return SyncResult(success: false, message: 'Device offline');
      }

      // Get pending items from queue
      final pendingItems = await dbService.getPendingSyncItems();
      
      if (pendingItems.isEmpty) {
        debugPrint('[SyncService] No pending items to sync');
        return SyncResult(success: true, message: 'No items to sync', synced: 0);
      }

      debugPrint('[SyncService] Syncing ${pendingItems.length} items');

      // Convert to API format
      final items = pendingItems.map((item) => {
        'ticketId': item.ticketId,
        'timestamp': item.timestamp,
      }).toList();

      // Push to backend
      try {
        final response = await apiService.pushCheckIns(items);
        final accepted = response['accepted'] as int? ?? 0;
        
        // Mark synced items as completed
        for (final item in pendingItems) {
          await dbService.markSyncItemCompleted(item.id!);
        }

        debugPrint('[SyncService] Successfully synced $accepted items');
        return SyncResult(
          success: true,
          message: 'Synced successfully',
          synced: accepted,
        );
      } catch (e) {
        // Increment attempt count for failed items
        for (final item in pendingItems) {
          await dbService.incrementSyncAttempts(item.id!);
        }
        throw e;
      }
    } catch (e) {
      debugPrint('[SyncService] Sync failed: $e');
      return SyncResult(
        success: false,
        message: 'Sync failed: ${e.toString()}',
      );
    } finally {
      _isSyncing = false;
    }
  }

  /// Download event and tickets for offline use (pre-event setup)
  Future<SyncResult> downloadEventData(String eventSlug) async {
    try {
      // Check connectivity
      final online = await isOnline();
      if (!online) {
        return SyncResult(success: false, message: 'Device offline');
      }

      debugPrint('[SyncService] Downloading event data for: $eventSlug');

      // 1. Fetch event details and public key
      final eventData = await apiService.fetchEventBySlug(eventSlug);
      
      final event = Event(
        id: eventData['eventId'],
        name: eventData['name'],
        slug: eventData['slug'],
        publicKey: eventData['publicKey'],
        lastSynced: DateTime.now().toIso8601String(),
      );

      // Save event to local DB
      await dbService.saveEvent(event);
      debugPrint('[SyncService] Event saved: ${event.id}');

      // 2. Download all tickets for this event
      final ticketsData = await apiService.downloadTickets(event.id);
      
      int savedCount = 0;
      for (final ticketData in ticketsData) {
        final ticket = Ticket(
          id: ticketData['id'],
          eventId: ticketData['eventId'],
          ticketCode: ticketData['ticketCode'],
          name: ticketData['name'],
          category: ticketData['ticketType'],
          qrSignature: '', // Not needed for local storage
          checkedIn: ticketData['checkedIn'] ?? false,
          checkedInAt: ticketData['checkedInAt'],
          synced: true, // Already synced from server
        );

        await dbService.saveTicket(ticket);
        savedCount++;
      }

      debugPrint('[SyncService] Downloaded $savedCount tickets');

      return SyncResult(
        success: true,
        message: 'Downloaded $savedCount tickets',
        synced: savedCount,
      );
    } catch (e) {
      debugPrint('[SyncService] Download failed: $e');
      return SyncResult(
        success: false,
        message: 'Download failed: ${e.toString()}',
      );
    }
  }

  /// Get count of pending sync items
  Future<int> getPendingCount() async {
    try {
      final items = await dbService.getPendingSyncItems();
      return items.length;
    } catch (e) {
      debugPrint('[SyncService] Error getting pending count: $e');
      return 0;
    }
  }

  void debugPrint(String message) {
    // ignore: avoid_print
    print(message);
  }

  void dispose() {
    stopBackgroundSync();
  }
}

class SyncResult {
  final bool success;
  final String message;
  final int synced;

  SyncResult({
    required this.success,
    required this.message,
    this.synced = 0,
  });
}
