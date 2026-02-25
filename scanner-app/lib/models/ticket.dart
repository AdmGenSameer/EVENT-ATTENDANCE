class Ticket {
  Ticket({
    required this.id,
    required this.eventId,
    required this.ticketCode,
    required this.name,
    this.personalEmail,
    required this.qrSignature,
    this.category,
    this.seatCode,
    this.checkedIn = false,
    this.checkedInAt,
    this.synced = false,
  });

  final String id;
  final String eventId;
  final String ticketCode;
  final String name;
  final String? personalEmail;
  final String? category;
  final String? seatCode;
  final String qrSignature;
  final bool checkedIn;
  final String? checkedInAt;
  final bool synced;

  Map<String, dynamic> toMap() {
    return {
      "id": id,
      "event_id": eventId,
      "ticket_code": ticketCode,
      "name": name,
      "personal_email": personalEmail,
      "category": category,
      "qr_signature": qrSignature,
      "seat_code": seatCode,
      "checked_in": checkedIn ? 1 : 0,
      "checked_in_at": checkedInAt,
      "synced": synced ? 1 : 0,
    };
  }

  factory Ticket.fromMap(Map<String, dynamic> map) {
    return Ticket(
      id: map["id"] as String,
      eventId: map["event_id"] as String,
      ticketCode: map["ticket_code"] as String,
      name: map["name"] as String,
      personalEmail: map["personal_email"] as String?,
      category: map["category"] as String?,
      seatCode: map["seat_code"] as String?,
      qrSignature: map["qr_signature"] as String,
      checkedIn: (map["checked_in"] as int) == 1,
      checkedInAt: map["checked_in_at"] as String?,
      synced: (map["synced"] as int) == 1,
    );
  }

  Ticket copyWith({
    bool? checkedIn,
    String? checkedInAt,
    bool? synced,
    String? seatCode,
  }) {
    return Ticket(
      id: id,
      eventId: eventId,
      ticketCode: ticketCode,
      name: name,
      personalEmail: personalEmail,
      category: category,
      qrSignature: qrSignature,
      seatCode: seatCode ?? this.seatCode,
      checkedIn: checkedIn ?? this.checkedIn,
      checkedInAt: checkedInAt ?? this.checkedInAt,
      synced: synced ?? this.synced,
    );
  }
}
