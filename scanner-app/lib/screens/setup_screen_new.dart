import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/app_state.dart';
import '../services/api_service.dart';
import '../services/sync_service.dart';
import '../services/database.dart';

class SetupScreen extends StatefulWidget {
  const SetupScreen({super.key});

  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  final _formKey = GlobalKey<FormState>();
  final _eventSlugController = TextEditingController();
  final _scannerIdController = TextEditingController();
  final _apiBaseUrlController = TextEditingController(
    text: 'http://192.168.1.100:4000/api', // Default for local network
  );

  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _eventSlugController.dispose();
    _scannerIdController.dispose();
    _apiBaseUrlController.dispose();
    super.dispose();
  }

  Future<void> _setupScanner() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final appState = context.read<AppState>();
      final apiService = ApiService(baseUrl: _apiBaseUrlController.text.trim());
      final dbService = DatabaseService();

      // Fetch event details
      final event = await apiService.getEventBySlug(_eventSlugController.text.trim());

      // Setup app state
      await appState.setupScanner(
        scannerId: _scannerIdController.text.trim(),
        event: event,
        apiBaseUrl: _apiBaseUrlController.text.trim(),
      );

      // Initial sync
      if (mounted) {
        setState(() {
          _isLoading = false;
        });

        // Show sync dialog
        _showSyncDialog();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = 'Setup failed: ${e.toString()}';
        });
      }
    }
  }

  Future<void> _showSyncDialog() async {
    final appState = context.read<AppState>();
    final apiService = ApiService(baseUrl: appState.apiBaseUrl!);
    final dbService = DatabaseService();
    final syncService = SyncService(
      apiService: apiService,
      dbService: dbService,
    );

    if (!mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Initial Sync'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(
              'Syncing tickets for ${appState.currentEvent!.name}...',
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );

    try {
      final result = await syncService.syncTickets(appState.currentEvent!.id);
      
      if (mounted) {
        Navigator.of(context).pop(); // Close dialog

        if (result.success) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Synced ${result.ticketCount} tickets successfully'),
              backgroundColor: Colors.green,
            ),
          );
        } else {
          throw Exception(result.message);
        }
      }
    } catch (e) {
      if (mounted) {
        Navigator.of(context).pop(); // Close dialog
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Sync failed: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scanner Setup'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Icon(
                Icons.qr_code_scanner,
                size: 80,
                color: Colors.deepPurple,
              ),
              const SizedBox(height: 32),
              const Text(
                'EventQR Scanner',
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'Configure your scanner to start verifying tickets',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 48),

              // API Base URL
              TextFormField(
                controller: _apiBaseUrlController,
                decoration: const InputDecoration(
                  labelText: 'API Base URL',
                  hintText: 'http://192.168.1.100:4000/api',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.cloud),
                ),
                keyboardType: TextInputType.url,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter API base URL';
                  }
                  if (!value.startsWith('http://') && !value.startsWith('https://')) {
                    return 'URL must start with http:// or https://';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Event Slug
              TextFormField(
                controller: _eventSlugController,
                decoration: const InputDecoration(
                  labelText: 'Event Slug',
                  hintText: 'xenith-2026',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.event),
                ),
                textCapitalization: TextCapitalization.none,
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter event slug';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Scanner ID
              TextFormField(
                controller: _scannerIdController,
                decoration: const InputDecoration(
                  labelText: 'Scanner ID',
                  hintText: 'entrance-1',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.phone_android),
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Please enter scanner ID';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 32),

              // Error message
              if (_errorMessage != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.red[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),

              // Setup button
              ElevatedButton(
                onPressed: _isLoading ? null : _setupScanner,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: _isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text(
                        'Setup Scanner',
                        style: TextStyle(fontSize: 16),
                      ),
              ),
              const SizedBox(height: 16),

              // Help text
              const Text(
                'Contact admin for event slug and scanner ID',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
