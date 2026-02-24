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
    debugPrint("[verifyQrToken] start");
    final payload = QrPayload.fromToken(token);
    if (payload.exp != null && nowEpoch != null && payload.exp! < nowEpoch) {
      return (isValid: false, reason: "expired", payload: payload);
    }

    final unsignedJson = jsonEncode(payload.unsignedPayload());
    final message = Uint8List.fromList(utf8.encode(unsignedJson));
    final signatureBytes = base64Url.decode(payload.signature);

    final spkiBytes = _decodePem(publicKeyPem);
    final publicKeyBytes = _extractEd25519PublicKey(spkiBytes);

    final algorithm = Ed25519();
    final publicKey = SimplePublicKey(publicKeyBytes, type: KeyPairType.ed25519);
    final signature = Signature(signatureBytes, publicKey: publicKey);

    final ok = await algorithm.verify(message, signature: signature);
    debugPrint("[verifyQrToken] verify result: $ok");
    return (isValid: ok, reason: ok ? null : "invalid_signature", payload: payload);
  } catch (error) {
    debugPrint("[verifyQrToken] failed: $error");
    return (isValid: false, reason: "invalid_token", payload: null);
  }
}
