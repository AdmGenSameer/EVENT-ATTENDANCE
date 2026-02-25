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
        version: 2,
        onCreate: _createTables,
        onUpgrade: _upgradeDatabase,
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
          personal_email TEXT,
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

  Future<void> _upgradeDatabase(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      await db.execute("ALTER TABLE tickets ADD COLUMN personal_email TEXT");
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

  Future<void> insertEvent(Event event) async {
    await saveEvent(event);
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

  Future<void> updateEventSyncTime(String eventId, DateTime syncTime) async {
    try {
      final db = await database;
      await db.update(
        "events",
        {"last_synced": syncTime.toIso8601String()},
        where: "id = ?",
        whereArgs: [eventId],
      );
    } catch (error) {
      debugPrint("[DatabaseService] update sync time failed: $error");
    }
  }

  Future<void> clearAllData() async {
    try {
      final db = await database;
      await db.delete("sync_queue");
      await db.delete("tickets");
      await db.delete("events");
    } catch (error) {
      debugPrint("[DatabaseService] clear all data failed: $error");
      rethrow;
    }
  }

  Future<Event?> getEventBySlug(String slug) async {
    try {
      debugPrint("[DatabaseService] fetching event by slug $slug");
      final db = await database;
      final maps = await db.query("events", where: "slug = ?", whereArgs: [slug]);
      if (maps.isEmpty) {
        return null;
      }
      return Event.fromMap(maps.first);
    } catch (error) {
      debugPrint("[DatabaseService] get event by slug failed: $error");
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

  Future<List<Ticket>> searchTickets(String eventId, String query) async {
    try {
      final db = await database;
      final like = "%${query.toLowerCase()}%";
      final maps = await db.query(
        "tickets",
        where: "event_id = ? AND (LOWER(name) LIKE ? OR LOWER(ticket_code) LIKE ? OR LOWER(personal_email) LIKE ?)",
        whereArgs: [eventId, like, like, like],
        orderBy: "checked_in DESC, name ASC",
        limit: 50,
      );
      return maps.map((map) => Ticket.fromMap(map)).toList();
    } catch (error) {
      debugPrint("[DatabaseService] search tickets failed: $error");
      return [];
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

  Future<void> markTicketCheckedIn(String ticketId, String scannerId, DateTime timestamp) async {
    try {
      debugPrint("[DatabaseService] marking ticket checked in $ticketId");
      final db = await database;
      await db.update(
        "tickets",
        {
          "checked_in": 1,
          "checked_in_at": timestamp.toIso8601String(),
          "synced": 0,
        },
        where: "id = ?",
        whereArgs: [ticketId],
      );
    } catch (error) {
      debugPrint("[DatabaseService] mark ticket checked in failed: $error");
      rethrow;
    }
  }

  Future<int> getCheckedInCount(String eventId) async {
    try {
      final db = await database;
      final result = await db.rawQuery(
        "SELECT COUNT(*) as count FROM tickets WHERE event_id = ? AND checked_in = 1",
        [eventId],
      );
      return (result.first["count"] as int?) ?? 0;
    } catch (error) {
      debugPrint("[DatabaseService] get checked-in count failed: $error");
      return 0;
    }
  }

  Future<int> getTotalTicketCount(String eventId) async {
    try {
      final db = await database;
      final result = await db.rawQuery(
        "SELECT COUNT(*) as count FROM tickets WHERE event_id = ?",
        [eventId],
      );
      return (result.first["count"] as int?) ?? 0;
    } catch (error) {
      debugPrint("[DatabaseService] get total ticket count failed: $error");
      return 0;
    }
  }

  Future<List<Ticket>> getCheckedInTickets(String eventId) async {
    try {
      final db = await database;
      final maps = await db.query(
        "tickets",
        where: "event_id = ? AND checked_in = 1",
        whereArgs: [eventId],
        orderBy: "checked_in_at DESC",
      );
      return maps.map((map) => Ticket.fromMap(map)).toList();
    } catch (error) {
      debugPrint("[DatabaseService] get checked-in tickets failed: $error");
      return [];
    }
  }

  Future<List<String>> getCheckedInTicketIds(String eventId) async {
    try {
      final db = await database;
      final maps = await db.query(
        "tickets",
        columns: ["id"],
        where: "event_id = ? AND checked_in = 1",
        whereArgs: [eventId],
      );
      return maps.map((map) => map["id"] as String).toList();
    } catch (error) {
      debugPrint("[DatabaseService] get checked-in ticket ids failed: $error");
      return [];
    }
  }

  // Sync queue operations
  Future<void> addToSyncQueue(String ticketId, String action, {DateTime? timestamp}) async {
    try {
      debugPrint("[DatabaseService] adding to sync queue: $ticketId");
      final db = await database;
      final item = SyncQueueItem(
        ticketId: ticketId,
        action: action,
        timestamp: (timestamp ?? DateTime.now()).toIso8601String(),
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
