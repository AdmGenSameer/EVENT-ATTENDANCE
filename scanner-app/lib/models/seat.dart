class Seat {
  Seat({
    required this.id,
    required this.eventId,
    required this.section,
    required this.row,
    required this.number,
    required this.seatCode,
    required this.status,
    this.ticketId,
    this.participantName,
  });

  final String id;
  final String eventId;
  final String section; // front | rear | balcony
  final String row;
  final int number;
  final String seatCode;
  final String status; // available | assigned | blocked
  final String? ticketId;
  final String? participantName;

  factory Seat.fromMap(Map<String, dynamic> map) {
    return Seat(
      id: map['id'] as String,
      eventId: map['eventId'] as String,
      section: map['section'] as String,
      row: map['row'] as String,
      number: map['number'] as int,
      seatCode: map['seatCode'] as String,
      status: map['status'] as String,
      ticketId: map['ticketId'] as String?,
      participantName: map['participantName'] as String?,
    );
  }
}
