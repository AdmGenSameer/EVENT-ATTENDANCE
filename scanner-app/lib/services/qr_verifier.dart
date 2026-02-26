import "dart:convert";
import "dart:typed_data";
import "package:asn1lib/asn1lib.dart";
import "package:cryptography/cryptography.dart";
import "package:flutter/foundation.dart";
import "../models/qr_payload.dart";

typedef VerificationResult = ({
  bool isValid,
  String? reason,
  QrPayload? payload,
});

Uint8List _decodePem(String pem) {
  final sanitized = pem
      .replaceAll("-----BEGIN PUBLIC KEY-----", "")
      .replaceAll("-----END PUBLIC KEY-----", "")
      .replaceAll("\n", "")
      .trim();
  return base64.decode(sanitized);
}

Uint8List _extractEd25519PublicKey(Uint8List spkiBytes) {
  final parser = ASN1Parser(spkiBytes);
  final topLevelSeq = parser.nextObject() as ASN1Sequence;
  final publicKeyBitString = topLevelSeq.elements?.last as ASN1BitString;
  final keyBytes = publicKeyBitString.valueBytes();
  return Uint8List.fromList(keyBytes);
}

Future<VerificationResult> verifyQrToken({
  required String token,
  required String publicKeyPem,
  int? nowEpoch,
}) async {
  try {
    debugPrint("[verifyQrToken] start, token length: ${token.length}");
    final payload = QrPayload.fromToken(token);
    debugPrint("[verifyQrToken] payload parsed successfully");
    debugPrint("[verifyQrToken]   tid: ${payload.ticketId}");
    debugPrint("[verifyQrToken]   eid: ${payload.eventId}");
    debugPrint("[verifyQrToken]   exp: ${payload.exp}");
    debugPrint("[verifyQrToken]   sig length: ${payload.signature.length}, first 30 chars: ${payload.signature.substring(0, 30).replaceAll(RegExp(r'[^a-zA-Z0-9/_\-=+]'), '?')}");
    
    if (payload.exp != null && nowEpoch != null && payload.exp! < nowEpoch) {
      return (isValid: false, reason: "expired", payload: payload);
    }

    final unsignedJson = jsonEncode(payload.unsignedPayload());
    debugPrint("[verifyQrToken] unsigned payload: $unsignedJson");
    
    final message = Uint8List.fromList(utf8.encode(unsignedJson));
    debugPrint("[verifyQrToken] message bytes created, length: ${message.length}");
    
    final signatureBytes = base64Url.decode(payload.signature);
    debugPrint("[verifyQrToken] signature decoded, length: ${signatureBytes.length}");

    final spkiBytes = _decodePem(publicKeyPem);
    debugPrint("[verifyQrToken] public key decoded, length: ${spkiBytes.length}");
    
    final publicKeyBytes = _extractEd25519PublicKey(spkiBytes);
    debugPrint("[verifyQrToken] Ed25519 public key extracted, length: ${publicKeyBytes.length}");

    final algorithm = Ed25519();
    final publicKey = SimplePublicKey(publicKeyBytes, type: KeyPairType.ed25519);
    final signature = Signature(signatureBytes, publicKey: publicKey);

    final ok = await algorithm.verify(message, signature: signature);
    debugPrint("[verifyQrToken] signature verification result: $ok");
    return (isValid: ok, reason: ok ? null : "invalid_signature", payload: payload);
  } catch (error) {
    debugPrint("[verifyQrToken] error during verification: $error");
    if (error is FormatException) {
      debugPrint("[verifyQrToken] FormatException - likely token encoding issue");
    }
    return (isValid: false, reason: "invalid_token", payload: null);
  }
}
