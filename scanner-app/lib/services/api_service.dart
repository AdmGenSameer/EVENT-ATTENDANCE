import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // TODO: Update this with your actual backend URL
  static const String baseUrl = 'http://10.0.2.2:4000/api'; // Android emulator localhost
  // For real device, use: 'http://YOUR_IP:4000/api'
  
  final http.Client client;

  ApiService({http.Client? client}) : client = client ?? http.Client();

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
  Future<Map<String, dynamic>> pushCheckIns(List<Map<String, dynamic>> items) async {
    try {
      final url = Uri.parse('$baseUrl/sync/checkins');
      debugPrint('[ApiService] Pushing ${items.length} check-ins');
      
      final response = await client.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'items': items}),
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
}
