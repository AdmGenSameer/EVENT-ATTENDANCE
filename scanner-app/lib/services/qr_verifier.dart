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
  // Check if it's a hex string (64 hex chars = 32 bytes for Ed25519)
  if (pem.length == 64 && !pem.contains('BEGIN')) {
    debugPrint("[_decodePem] detected hex format, length: ${pem.length}");
    final hexBytes = <int>[];
    for (int i = 0; i < pem.length; i += 2) {
      hexBytes.add(int.parse(pem.substring(i, i + 2), radix: 16));
    }
    return Uint8List.fromList(hexBytes);
  }
  
  // Otherwise decode as PEM
  debugPrint("[_decodePem] decoding as PEM format");
  final sanitized = pem
      .replaceAll("-----BEGIN PUBLIC KEY-----", "")
      .replaceAll("-----END PUBLIC KEY-----", "")
      .replaceAll("\n", "")
      .trim();
  return base64.decode(sanitized);
}

Uint8List _extractEd25519PublicKey(Uint8List keyBytes) {
  try {
    debugPrint("[_extractEd25519PublicKey] input length: ${keyBytes.length}");
    
    // If it's already 32 bytes (raw Ed25519 key), use it directly
    if (keyBytes.length == 32) {
      debugPrint("[_extractEd25519PublicKey] already 32 bytes, using directly");
      return keyBytes;
    }
    
    // Otherwise try to parse as SPKI
    final parser = ASN1Parser(keyBytes);
    final topLevelSeq = parser.nextObject() as ASN1Sequence;
    debugPrint("[_extractEd25519PublicKey] parsed sequence with ${topLevelSeq.elements?.length} elements");
    
    final publicKeyBitString = topLevelSeq.elements?.last as ASN1BitString;
    debugPrint("[_extractEd25519PublicKey] BIT STRING extracted");
    
    final allBytes = publicKeyBitString.valueBytes();
    debugPrint("[_extractEd25519PublicKey] BIT STRING value bytes length: ${allBytes.length}");
    
    // Skip the first byte (unused bits indicator) and take the next 32 bytes
    if (allBytes.length >= 33) {
      debugPrint("[_extractEd25519PublicKey] extracting 32 bytes from offset 1");
      return Uint8List.fromList(allBytes.sublist(1, 33));
    }
    
    if (allBytes.length == 32) {
      debugPrint("[_extractEd25519PublicKey] using all 32 bytes as-is");
      return Uint8List.fromList(allBytes);
    }
    
    throw Exception("Invalid Ed25519 public key size: ${allBytes.length}");
  } catch (e) {
    debugPrint("[_extractEd25519PublicKey] error: $e");
    rethrow;
  }
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
    
    // Add padding to base64url signature if needed
    String paddedSignature = payload.signature;
    final remainder = payload.signature.length % 4;
    if (remainder != 0) {
      paddedSignature += '=' * (4 - remainder);
      debugPrint("[verifyQrToken] added ${4 - remainder} padding characters");
    }
    
    final signatureBytes = base64Url.decode(paddedSignature);
    debugPrint("[verifyQrToken] signature decoded, length: ${signatureBytes.length}");

    final spkiBytes = _decodePem(publicKeyPem);
    debugPrint("[verifyQrToken] public key decoded, length: ${spkiBytes.length}");
    
    final publicKeyBytes = _extractEd25519PublicKey(spkiBytes);
    debugPrint("[verifyQrToken] Ed25519 public key extracted, length: ${publicKeyBytes.length}");
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
