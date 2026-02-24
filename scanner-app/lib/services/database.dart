import "package:flutter/foundation.dart";
import "package:sqflite/sqflite.dart";
import "package:path/path.dart";
import "../models/event.dart";
import "../models/ticket.dart";
import "../models/sync_queue.dart";

class DatabaseService {
  static Database? _database;

  Future<Database> get database async {
    try {
      if (_database != null) {
        return _database!;
      }
      _database = await _initDatabase();
      return _database!;
    } catch (error) {
      debugPrint("[DatabaseService] get database failed: $error");
      rethrow;
    }
  }

  Future<Database> _initDatabase() async {
    try {
      debugPrint("[DatabaseService] initializing database");
      final dbPath = await getDatabasesPath();
      final path = join(dbPath, "eventqr_scanner.db");
      return await openDatabase(
        path,
        version: 1,
        onCreate: _createTables,
      );
    } catch (error) {
      debugPrint("[DatabaseService] init failed: $error");
      rethrow;
    }
  }

  Future<void> _createTables(Database db, int version) async {
    try {
      debugPrint("[DatabaseService] creating tables");
      await db.execute("""
        CREATE TABLE events (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT NOT NULL,
          date TEXT,
          public_key TEXT NOT NULL,
          last_synced TEXT
        )
      """);

      await db.execute("""
        CREATE TABLE tickets (
          id TEXT PRIMARY KEY,
          event_id TEXT NOT NULL,
          ticket_code TEXT NOT NULL,
          name TEXT NOT NULL,
          category TEXT,
          qr_signature TEXT NOT NULL,
          checked_in INTEGER DEFAULT 0,
          checked_in_at TEXT,
          synced INTEGER DEFAULT 0
        )
      """);

      await db.execute("""
        CREATE TABLE sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ticket_id TEXT NOT NULL,
          action TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          attempts INTEGER DEFAULT 0,
          last_attempt TEXT,
          synced INTEGER DEFAULT 0
        )
      """);

      debugPrint("[DatabaseService] tables created");
    } catch (error) {
      debugPrint("[DatabaseService] create tables failed: $error");
      rethrow;
    }
  }

  // Event operations
  Future<void> saveEvent(Event event) async {
    try {
      debugPrint("[DatabaseService] saving event ${event.id}");
      final db = await database;
      await db.insert("events", event.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
    } catch (error) {
      debugPrint("[DatabaseService] save event failed: $error");
      rethrow;
    }
  }

  Future<Event?> getEvent(String eventId) async {
    try {
      debugPrint("[DatabaseService] fetching event $eventId");
      final db = await database;
      final maps = await db.query("events", where: "id = ?", whereArgs: [eventId]);
      if (maps.isEmpty) {
        return null;
      }
      return Event.fromMap(maps.first);
    } catch (error) {
      debugPrint("[DatabaseService] get event failed: $error");
      rethrow;
    }
  }

  // Ticket operations
  Future<void> saveTicket(Ticket ticket) async {
    try {
      debugPrint("[DatabaseService] saving ticket ${ticket.id}");
      final db = await database;
      await db.insert("tickets", ticket.toMap(), conflictAlgorithm: ConflictAlgorithm.replace);
    } catch (error) {
      debugPrint("[DatabaseService] save ticket failed: $error");
      rethrow;
    }
  }

  Future<Ticket?> getTicket(String ticketId) async {
    try {
      debugPrint("[DatabaseService] fetching ticket $ticketId");
      final db = await database;
      final maps = await db.query("tickets", where: "id = ?", whereArgs: [ticketId]);
      if (maps.isEmpty) {
        return null;
      }
      return Ticket.fromMap(maps.first);
    } catch (error) {
      debugPrint("[DatabaseService] get ticket failed: $error");
      rethrow;
    }
  }

  Future<void> checkInTicket(String ticketId) async {
    try {
      debugPrint("[DatabaseService] checking in ticket $ticketId");
      final db = await database;
      final timestamp = DateTime.now().toIso8601String();
      await db.update(
        "tickets",
        {"checked_in": 1, "checked_in_at": timestamp, "synced": 0},
        where: "id = ?",
        whereArgs: [ticketId],
      );
    } catch (error) {
      debugPrint("[DatabaseService] check in ticket failed: $error");
      rethrow;
    }
  }

  // Sync queue operations
  Future<void> addToSyncQueue(String ticketId, String action) async {
    try {
      debugPrint("[DatabaseService] adding to sync queue: $ticketId");
      final db = await database;
      final item = SyncQueueItem(
        ticketId: ticketId,
        action: action,
        timestamp: DateTime.now().toIso8601String(),
      );
      await db.insert("sync_queue", item.toMap());
    } catch (error) {
      debugPrint("[DatabaseService] add to sync queue failed: $error");
      rethrow;
    }
  }

  Future<List<SyncQueueItem>> getPendingSyncItems() async {
    try {
      debugPrint("[DatabaseService] fetching pending sync items");
      final db = await database;
      final maps = await db.query("sync_queue", where: "synced = ?", whereArgs: [0]);
      return maps.map((map) => SyncQueueItem.fromMap(map)).toList();
    } catch (error) {
      debugPrint("[DatabaseService] get pending sync items failed: $error");
      rethrow;
    }
  }

  Future<void> markSyncItemCompleted(int id) async {
    try {
      debugPrint("[DatabaseService] marking sync item $id as completed");
      final db = await database;
      await db.update("sync_queue", {"synced": 1}, where: "id = ?", whereArgs: [id]);
    } catch (error) {
      debugPrint("[DatabaseService] mark sync item completed failed: $error");
      rethrow;
    }
  }

  Future<void> incrementSyncAttempts(int id) async {
    try {
      debugPrint("[DatabaseService] incrementing sync attempts for item $id");
      final db = await database;
      final timestamp = DateTime.now().toIso8601String();
      await db.rawUpdate(
        "UPDATE sync_queue SET attempts = attempts + 1, last_attempt = ? WHERE id = ?",
        [timestamp, id],
      );
    } catch (error) {
      debugPrint("[DatabaseService] increment sync attempts failed: $error");
      rethrow;
    }
  }
}
