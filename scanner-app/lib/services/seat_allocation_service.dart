import "package:flutter/foundation.dart";
import "database.dart";

class SeatAssignmentResult {
  final List<String> seatCodes;
  final String pairId;

  const SeatAssignmentResult({
    required this.seatCodes,
    required this.pairId,
  });
}

class SeatAllocationService {
  final DatabaseService dbService;
  final Map<String, bool> _seatPlanInitialized = {};

  SeatAllocationService({required this.dbService});

  static const int deviceCount = 3;
  static const int seatsPerRow = 15;

  // Dynamic configuration - can be loaded from database/API in future
  Map<String, List<String>> getSectionRows() {
    return {
      "front": ["A", "B", "C", "D", "E"],
      "rear": [
        "A",
        "B",
        "C",
        "D",
        "E",
        "F",
        "G",
        "H",
        "I",
        "J",
        "K",
        "L",
        "M",
        "N",
        "O",
        "P",
        "Q",
        "R",
        "S",
        "T",
        "U",
        "V",
        "W",
        "X",
        "Y"
      ],
    };
  }

  Future<void> ensureSeatPlan(String eventId) async {
    // Check cache first - avoid DB query on every scan
    if (_seatPlanInitialized[eventId] == true) return;

    final db = await dbService.database;
    final countResult = await db.rawQuery(
      "SELECT COUNT(*) as count FROM seat_allocations WHERE event_id = ?",
      [eventId],
    );
    final count = (countResult.first["count"] as int?) ?? 0;
    if (count > 0) {
      _seatPlanInitialized[eventId] = true;
      return;
    }

    debugPrint("[SeatAllocation] generating seat plan for $eventId");
    final batch = db.batch();

    final sectionRows = getSectionRows();
    for (final section in sectionRows.keys) {
      final rows = sectionRows[section]!;
      for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        final row = rows[rowIndex];
        for (var number = 1; number <= seatsPerRow; number++) {
          final pairIndex = ((number - 1) ~/ 2) + 1;
          final isPairSeat = number < seatsPerRow;
          final pairSize = isPairSeat ? 2 : 1;

          final deviceId = isPairSeat
              ? ((pairIndex - 1) % deviceCount) + 1
              : ((rowIndex) % deviceCount) + 1;

          final seatCode = _buildSeatCode(section, row, number);
          final pairId = "$section-$row-$pairIndex";

          batch.insert("seat_allocations", {
            "event_id": eventId,
            "section": section,
            "row": row,
            "row_index": rowIndex,
            "number": number,
            "seat_code": seatCode,
            "pair_id": pairId,
            "pair_index": pairIndex,
            "pair_size": pairSize,
            "device_id": deviceId,
            "status": "AVAILABLE",
            "ticket_id": null,
            "assigned_at": null,
          });
        }
      }
    }

    await batch.commit(noResult: true);
    _seatPlanInitialized[eventId] = true;
    debugPrint("[SeatAllocation] seat plan generated");
  }

  Future<SeatAssignmentResult?> assignSeatForTicket({
    required String eventId,
    required String ticketId,
    required bool isDuo,
    required int deviceId,
    required String section,
  }) async {
    await ensureSeatPlan(eventId);
    final db = await dbService.database;

    return await db.transaction<SeatAssignmentResult?>((txn) async {
      if (isDuo) {
        final pairRows = await txn.rawQuery(
          """
          SELECT pair_id
          FROM seat_allocations
          WHERE event_id = ?
            AND section = ?
            AND device_id = ?
            AND pair_size = 2
            AND status NOT IN ('ASSIGNED', 'BLOCKED')
          GROUP BY pair_id, row_index, pair_index
          HAVING COUNT(*) = 2
          ORDER BY row_index ASC, pair_index ASC
          LIMIT 1
          """,
          [eventId, section, deviceId],
        );

        if (pairRows.isEmpty) return null;
        final pairId = pairRows.first["pair_id"] as String;

        final seats = await txn.query(
          "seat_allocations",
          columns: ["seat_code"],
          where: "event_id = ? AND pair_id = ? AND status NOT IN ('ASSIGNED', 'BLOCKED')",
          whereArgs: [eventId, pairId],
          orderBy: "number ASC",
        );

        if (seats.length < 2) return null;

        final now = DateTime.now().toIso8601String();
        await txn.update(
          "seat_allocations",
          {
            "status": "ASSIGNED",
            "ticket_id": ticketId,
            "assigned_at": now,
          },
          where: "event_id = ? AND pair_id = ?",
          whereArgs: [eventId, pairId],
        );

        final seatCodes = seats.map((s) => s["seat_code"] as String).toList();
        return SeatAssignmentResult(seatCodes: seatCodes, pairId: pairId);
      }

      final seatRows = await txn.query(
        "seat_allocations",
        columns: ["id", "seat_code", "pair_id"],
        where: "event_id = ? AND section = ? AND device_id = ? AND status NOT IN ('ASSIGNED', 'BLOCKED')",
        whereArgs: [eventId, section, deviceId],
        orderBy: "row_index ASC, pair_index ASC, number ASC",
        limit: 1,
      );

      if (seatRows.isEmpty) return null;

      final seatId = seatRows.first["id"] as int;
      final seatCode = seatRows.first["seat_code"] as String;
      final pairId = seatRows.first["pair_id"] as String;

      await txn.update(
        "seat_allocations",
        {
          "status": "ASSIGNED",
          "ticket_id": ticketId,
          "assigned_at": DateTime.now().toIso8601String(),
        },
        where: "id = ?",
        whereArgs: [seatId],
      );

      return SeatAssignmentResult(seatCodes: [seatCode], pairId: pairId);
    });
  }

  static String _buildSeatCode(String section, String row, int number) {
    final prefix = section == "front" ? "F" : "R";
    final padded = number.toString().padLeft(2, "0");
    return "$prefix$row$padded";
  }

  static String formatSeatCode(String seatCode) {
    if (seatCode.length < 4) return seatCode;
    final prefix = seatCode.substring(0, 1);
    final row = seatCode.substring(1, 2);
    final number = seatCode.substring(2);
    return "$prefix-$row-$number";
  }
}
