import "dart:convert";

class QrPayload {
  QrPayload({
    required this.version,
    required this.ticketId,
    required this.eventId,
    required this.signature,
    this.exp,
  });

  final int version;
  final String ticketId;
  final String eventId;
  final int? exp;
  final String signature;

  static QrPayload fromToken(String token) {
    try {
      final rawJson = utf8.decode(base64Url.decode(token));
      final data = jsonDecode(rawJson) as Map<String, dynamic>;
      return QrPayload(
        version: data["v"] as int,
        ticketId: data["tid"] as String,
        eventId: data["eid"] as String,
        exp: data["exp"] is int ? data["exp"] as int : null,
        signature: data["sig"] as String,
      );
    } catch (error) {
      throw FormatException("Invalid QR token", error);
    }
  }

  Map<String, dynamic> unsignedPayload() {
    final payload = <String, dynamic>{
      "v": version,
      "tid": ticketId,
      "eid": eventId,
    };

    if (exp != null) {
      payload["exp"] = exp;
    }

    return payload;
  }
}
