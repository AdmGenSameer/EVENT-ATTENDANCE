class SyncQueueItem {
  SyncQueueItem({
    this.id,
    required this.ticketId,
    required this.action,
    required this.timestamp,
    this.attempts = 0,
    this.lastAttempt,
    this.synced = false,
  });

  final int? id;
  final String ticketId;
  final String action;
  final String timestamp;
  final int attempts;
  final String? lastAttempt;
  final bool synced;

  Map<String, dynamic> toMap() {
    return {
      if (id != null) "id": id,
      "ticket_id": ticketId,
      "action": action,
      "timestamp": timestamp,
      "attempts": attempts,
      "last_attempt": lastAttempt,
      "synced": synced ? 1 : 0,
    };
  }

  factory SyncQueueItem.fromMap(Map<String, dynamic> map) {
    return SyncQueueItem(
      id: map["id"] as int?,
      ticketId: map["ticket_id"] as String,
      action: map["action"] as String,
      timestamp: map["timestamp"] as String,
      attempts: map["attempts"] as int,
      lastAttempt: map["last_attempt"] as String?,
      synced: (map["synced"] as int) == 1,
    );
  }
}
