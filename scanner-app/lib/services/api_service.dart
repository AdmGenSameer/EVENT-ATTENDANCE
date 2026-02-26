import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import '../models/event.dart';

class ApiService {
  static const String defaultBaseUrl = 'http://10.0.2.2:4000/api'; // Android emulator localhost
  // For real device, use: 'http://YOUR_IP:4000/api'

  final String baseUrl;
  final http.Client client;

  ApiService({String? baseUrl, http.Client? client})
      : baseUrl = baseUrl ?? defaultBaseUrl,
        client = client ?? http.Client();

  /// Fetch event details and public key by slug
  Future<Map<String, dynamic>> fetchEventBySlug(String slug) async {
    try {
      final url = Uri.parse('$baseUrl/sync/events/$slug/public-key');
      debugPrint('[ApiService] Fetching event by slug: $slug');
      
      final response = await client.get(url).timeout(
        const Duration(seconds: 10),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        debugPrint('[ApiService] Event fetched successfully: ${data['eventId']}');
        return data;
      } else if (response.statusCode == 404) {
        throw Exception('Event not found');
      } else {
        throw Exception('Failed to fetch event: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('[ApiService] Error fetching event: $e');
      rethrow;
    }
  }

  /// Fetch event details and map to Event model (setup helper)
  Future<Event> getEventBySlug(String slug) async {
    final data = await fetchEventBySlug(slug);
    return Event(
      id: data['eventId'] as String,
      name: data['name'] as String,
      slug: data['slug'] as String,
      publicKey: data['publicKey'] as String,
      lastSynced: DateTime.now().toIso8601String(),
    );
  }

  /// Download all tickets for an event
  Future<List<Map<String, dynamic>>> downloadTickets(String eventId) async {
    try {
      final url = Uri.parse('$baseUrl/sync/events/$eventId/tickets');
      debugPrint('[ApiService] Downloading tickets for event: $eventId');
      
      final response = await client.get(url).timeout(
        const Duration(seconds: 30),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final tickets = List<Map<String, dynamic>>.from(data['tickets']);
        debugPrint('[ApiService] Downloaded ${tickets.length} tickets');
        return tickets;
      } else {
        throw Exception('Failed to download tickets: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('[ApiService] Error downloading tickets: $e');
      rethrow;
    }
  }

  /// Push check-in queue to backend
  Future<Map<String, dynamic>> pushCheckIns({
    required String eventId,
    required String scannerId,
    required List<Map<String, dynamic>> items,
  }) async {
    try {
      final url = Uri.parse('$baseUrl/sync/checkins');
      debugPrint('[ApiService] Pushing ${items.length} check-ins');
      
      final response = await client.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'eventId': eventId,
          'scannerId': scannerId,
          'items': items,
        }),
      ).timeout(
        const Duration(seconds: 15),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        debugPrint('[ApiService] Check-ins pushed successfully: ${data['accepted']} accepted');
        return data;
      } else {
        throw Exception('Failed to push check-ins: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('[ApiService] Error pushing check-ins: $e');
      rethrow;
    }
  }

  void debugPrint(String message) {
    // ignore: avoid_print
    print(message);
  }

  void dispose() {
    client.close();
  }

  Future<List<Map<String, dynamic>>> fetchSeats(String eventId) async {
    try {
      final url = Uri.parse('$baseUrl/events/$eventId/seats');
      debugPrint('[ApiService] Fetching seats for event: $eventId');

      final response = await client.get(url).timeout(
        const Duration(seconds: 20),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final seats = List<Map<String, dynamic>>.from(data['seats']);
        debugPrint('[ApiService] Fetched ${seats.length} seats');
        return seats;
      } else {
        throw Exception('Failed to fetch seats: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('[ApiService] Error fetching seats: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> fetchLiveStatus(String eventId) async {
    try {
      final url = Uri.parse('$baseUrl/events/$eventId/live-status');
      debugPrint('[ApiService] Fetching live status for event: $eventId');

      final response = await client.get(url).timeout(
        const Duration(seconds: 10),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data as Map<String, dynamic>;
      } else {
        throw Exception('Failed to fetch live status: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('[ApiService] Error fetching live status: $e');
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> fetchBlockedSeats(String eventId) async {
    try {
      final url = Uri.parse('$baseUrl/events/$eventId/seats/blocked');
      debugPrint('[ApiService] Fetching blocked seats for event: $eventId');

      final response = await client.get(url).timeout(
        const Duration(seconds: 10),
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final blockedSeats = List<Map<String, dynamic>>.from(data['blockedSeats']);
        debugPrint('[ApiService] Fetched ${blockedSeats.length} blocked seats');
        return blockedSeats;
      } else {
        throw Exception('Failed to fetch blocked seats: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('[ApiService] Error fetching blocked seats: $e');
      rethrow;
    }
  }

  // Fetch ticket by registration number
  Future<Map<String, dynamic>> fetchTicketByRegNo(String regNo) async {
    try {
      debugPrint('[ApiService] Fetching ticket by registration number: $regNo');
      final url = Uri.parse('$baseUrl/events/tickets/$regNo');
      
      final response = await http.get(url).timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw TimeoutException('Request timed out');
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        debugPrint('[ApiService] Found ticket for registration: $regNo');
        return data;
      } else if (response.statusCode == 404) {
        throw Exception('No ticket found for registration number: $regNo');
      } else {
        throw Exception('Failed to fetch ticket: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('[ApiService] Error fetching ticket by regNo: $e');
      rethrow;
    }
  }
}
