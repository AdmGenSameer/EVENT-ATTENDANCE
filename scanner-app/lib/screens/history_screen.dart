import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/app_state.dart';
import '../services/database.dart';
import '../models/ticket.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  final DatabaseService _dbService = DatabaseService();
  List<Ticket> _tickets = [];
  bool _loading = true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final appState = context.read<AppState>();
    final eventId = appState.currentEvent!.id;

    final tickets = await _dbService.getCheckedInTickets(eventId);
    if (mounted) {
      setState(() {
        _tickets = tickets;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scanned Tickets'),
        actions: [
          IconButton(
            onPressed: _loadHistory,
            icon: const Icon(Icons.refresh),
          )
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _tickets.isEmpty
              ? const Center(child: Text('No scanned tickets yet'))
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: _tickets.length,
                  separatorBuilder: (_, __) => const Divider(height: 16),
                  itemBuilder: (context, index) {
                    final ticket = _tickets[index];
                    return ListTile(
                      leading: const Icon(Icons.verified, color: Colors.green),
                      title: Text(ticket.name),
                      subtitle: Text('Code: ${ticket.ticketCode}'),
                      trailing: Text(ticket.checkedInAt ?? '-'),
                    );
                  },
                ),
    );
  }
}
