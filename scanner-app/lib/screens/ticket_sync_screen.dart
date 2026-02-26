import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/app_state.dart';
import '../services/database.dart';
import '../services/sync_service.dart';
import '../services/api_service.dart';
import '../models/ticket.dart';

class TicketSyncScreen extends StatefulWidget {
  const TicketSyncScreen({super.key});

  @override
  State<TicketSyncScreen> createState() => _TicketSyncScreenState();
}

class _TicketSyncScreenState extends State<TicketSyncScreen> {
  final _dbService = DatabaseService();
  List<Ticket> _tickets = [];
  List<Ticket> _filteredTickets = [];
  bool _isLoading = true;
  bool _isDownloading = false;
  double _downloadProgress = 0.0;
  String _searchQuery = '';
  String _filterStatus = 'all'; // all, checked_in, pending

  @override
  void initState() {
    super.initState();
    _loadTickets();
  }

  Future<void> _loadTickets() async {
    try {
      final appState = context.read<AppState>();
      if (appState.currentEvent == null) return;

      final db = await _dbService.database;
      final maps = await db.query(
        'tickets',
        where: 'event_id = ?',
        whereArgs: [appState.currentEvent!.id],
        orderBy: 'checked_in DESC, name ASC',
      );

      final tickets = maps.map((map) => Ticket.fromMap(map)).toList();

      if (mounted) {
        setState(() {
          _tickets = tickets;
          _filteredTickets = tickets;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('[TicketSync] Load tickets failed: $e');
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _filterTickets() {
    setState(() {
      _filteredTickets = _tickets.where((ticket) {
        // Apply status filter
        bool matchesStatus = true;
        if (_filterStatus == 'checked_in') {
          matchesStatus = ticket.checkedIn;
        } else if (_filterStatus == 'pending') {
          matchesStatus = !ticket.checkedIn;
        }

        // Apply search filter
        bool matchesSearch = true;
        if (_searchQuery.isNotEmpty) {
          final query = _searchQuery.toLowerCase();
          matchesSearch = ticket.name.toLowerCase().contains(query) ||
              ticket.ticketCode.toLowerCase().contains(query) ||
              (ticket.personalEmail?.toLowerCase().contains(query) ?? false);
        }

        return matchesStatus && matchesSearch;
      }).toList();
    });
  }

  Future<void> _downloadTickets() async {
    try {
      setState(() {
        _isDownloading = true;
        _downloadProgress = 0.0;
      });

      final appState = context.read<AppState>();
      if (appState.currentEvent == null || appState.apiBaseUrl == null) {
        throw Exception('Event or API not configured');
      }

      final apiService = ApiService(baseUrl: appState.apiBaseUrl!);
      final syncService = SyncService(
        apiService: apiService,
        dbService: _dbService,
      );

      // Simulate progress updates
      Timer.periodic(const Duration(milliseconds: 100), (timer) {
        if (!_isDownloading) {
          timer.cancel();
          return;
        }
        if (_downloadProgress < 0.9) {
          setState(() => _downloadProgress += 0.05);
        }
      });

      final result = await syncService.syncTickets(appState.currentEvent!.id);

      setState(() {
        _downloadProgress = 1.0;
      });

      await Future.delayed(const Duration(milliseconds: 500));

      if (result.success) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Downloaded ${result.ticketCount} tickets successfully'),
              backgroundColor: Colors.green,
            ),
          );
          _loadTickets();
        }
      } else {
        throw Exception(result.message);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Download failed: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 5),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isDownloading = false;
          _downloadProgress = 0.0;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Synced Tickets'),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
        actions: [
          if (_isDownloading)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  strokeWidth: 2,
                ),
              ),
            )
          else
            IconButton(
              icon: const Icon(Icons.download),
              onPressed: _downloadTickets,
              tooltip: 'Download Tickets',
            ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              setState(() => _isLoading = true);
              _loadTickets();
            },
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                // Stats Summary
                Container(
                  padding: const EdgeInsets.all(16),
                  color: Colors.indigo[50],
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStatChip(
                        label: 'Total',
                        value: _tickets.length.toString(),
                        color: Colors.blue,
                      ),
                      _buildStatChip(
                        label: 'Checked In',
                        value: _tickets.where((t) => t.checkedIn).length.toString(),
                        color: Colors.green,
                      ),
                      _buildStatChip(
                        label: 'Pending',
                        value: _tickets.where((t) => !t.checkedIn).length.toString(),
                        color: Colors.orange,
                      ),
                    ],
                  ),
                ),

                // Search Bar
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Search by name, ticket code, or email',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      filled: true,
                      fillColor: Colors.grey[100],
                    ),
                    onChanged: (value) {
                      setState(() => _searchQuery = value);
                      _filterTickets();
                    },
                  ),
                ),

                // Filter Chips
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Row(
                    children: [
                      ChoiceChip(
                        label: const Text('All'),
                        selected: _filterStatus == 'all',
                        onSelected: (selected) {
                          if (selected) {
                            setState(() => _filterStatus = 'all');
                            _filterTickets();
                          }
                        },
                      ),
                      const SizedBox(width: 8),
                      ChoiceChip(
                        label: const Text('Checked In'),
                        selected: _filterStatus == 'checked_in',
                        selectedColor: Colors.green[100],
                        onSelected: (selected) {
                          if (selected) {
                            setState(() => _filterStatus = 'checked_in');
                            _filterTickets();
                          }
                        },
                      ),
                      const SizedBox(width: 8),
                      ChoiceChip(
                        label: const Text('Pending'),
                        selected: _filterStatus == 'pending',
                        selectedColor: Colors.orange[100],
                        onSelected: (selected) {
                          if (selected) {
                            setState(() => _filterStatus = 'pending');
                            _filterTickets();
                          }
                        },
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 8),

                // Tickets List
                Expanded(
                  child: _tickets.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.inbox_outlined,
                                size: 64,
                                color: Colors.grey[400],
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No tickets synced yet',
                                style: TextStyle(
                                  fontSize: 18,
                                  color: Colors.grey[600],
                                ),
                              ),
                              const SizedBox(height: 32),
                              if (_isDownloading) ...[
                                Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 48),
                                  child: Column(
                                    children: [
                                      LinearProgressIndicator(
                                        value: _downloadProgress,
                                        backgroundColor: Colors.grey[300],
                                        minHeight: 8,
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        'Downloading tickets... ${(_downloadProgress * 100).toInt()}%',
                                        style: TextStyle(
                                          color: Colors.grey[600],
                                          fontSize: 14,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ] else ...[
                                ElevatedButton.icon(
                                  onPressed: _downloadTickets,
                                  icon: const Icon(Icons.download),
                                  label: const Text('Download Tickets'),
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 32,
                                      vertical: 16,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        )
                      : _filteredTickets.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.inbox_outlined,
                                    size: 64,
                                    color: Colors.grey[400],
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    'No tickets match your filter',
                                    style: TextStyle(
                                      fontSize: 16,
                                      color: Colors.grey[600],
                                    ),
                                  ),
                                ],
                              ),
                            )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _filteredTickets.length,
                          itemBuilder: (context, index) {
                            final ticket = _filteredTickets[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              elevation: 2,
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: ticket.checkedIn
                                      ? Colors.green
                                      : Colors.blue,
                                  child: Icon(
                                    ticket.checkedIn
                                        ? Icons.check_circle
                                        : Icons.confirmation_number,
                                    color: Colors.white,
                                  ),
                                ),
                                title: Text(
                                  ticket.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const SizedBox(height: 4),
                                    Text('Code: ${ticket.ticketCode}'),
                                    if (ticket.personalEmail != null)
                                      Text('Email: ${ticket.personalEmail}'),
                                    if (ticket.category != null)
                                      Text('Type: ${ticket.category}'),
                                    if (ticket.seatCode != null)
                                      Text('Seat: ${ticket.seatCode}'),
                                  ],
                                ),
                                trailing: ticket.checkedIn
                                    ? Chip(
                                        label: const Text(
                                          'Checked In',
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: Colors.white,
                                          ),
                                        ),
                                        backgroundColor: Colors.green,
                                        padding: EdgeInsets.zero,
                                      )
                                    : null,
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }

  Widget _buildStatChip({
    required String label,
    required String value,
    required Color color,
  }) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey[600],
          ),
        ),
      ],
    );
  }
}
