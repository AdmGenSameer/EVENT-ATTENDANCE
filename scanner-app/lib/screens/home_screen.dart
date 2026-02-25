import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/app_state.dart';
import '../services/database.dart';
import '../services/api_service.dart';
import '../services/sync_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final DatabaseService _dbService = DatabaseService();
  SyncService? _syncService;

  int _checkedIn = 0;
  int _total = 0;
  int _pending = 0;
  bool _isSyncing = false;
  String _statusMessage = 'Ready';

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final appState = context.read<AppState>();
    _syncService ??= SyncService(
      apiService: ApiService(baseUrl: appState.apiBaseUrl!),
      dbService: _dbService,
    );
    _loadStats();
  }

  Future<void> _loadStats() async {
    final appState = context.read<AppState>();
    final eventId = appState.currentEvent!.id;

    final checkedIn = await _dbService.getCheckedInCount(eventId);
    final total = await _dbService.getTotalTicketCount(eventId);
    final pending = await _syncService!.getPendingCount();

    if (mounted) {
      setState(() {
        _checkedIn = checkedIn;
        _total = total;
        _pending = pending;
      });
    }
  }

  Future<void> _syncNow() async {
    final appState = context.read<AppState>();
    setState(() {
      _isSyncing = true;
      _statusMessage = 'Syncing...';
    });

    final result = await _syncService!.syncCheckIns(
      eventId: appState.currentEvent!.id,
      scannerId: appState.scannerId!,
    );

    if (mounted) {
      setState(() {
        _isSyncing = false;
        _statusMessage = result.success ? 'Sync complete' : result.message;
      });
      _loadStats();
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();
    final event = appState.currentEvent!;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Xenith 26 Scanner'),
        actions: [
          IconButton(
            onPressed: _loadStats,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              event.name,
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 6),
            Text(
              'Scanner: ${appState.scannerId}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                _StatCard(label: 'Checked In', value: _checkedIn.toString(), color: Colors.green),
                const SizedBox(width: 12),
                _StatCard(label: 'Total', value: _total.toString(), color: Colors.blue),
                const SizedBox(width: 12),
                _StatCard(label: 'Pending Sync', value: _pending.toString(), color: Colors.orange),
              ],
            ),
            const SizedBox(height: 24),
            Text(
              _statusMessage,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: _isSyncing ? null : _syncNow,
              icon: const Icon(Icons.cloud_upload),
              label: Text(_isSyncing ? 'Syncing' : 'Sync Now'),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value, required this.color});

  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          color: color.withOpacity(0.1),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 6),
            Text(value, style: Theme.of(context).textTheme.titleLarge),
          ],
        ),
      ),
    );
  }
}
