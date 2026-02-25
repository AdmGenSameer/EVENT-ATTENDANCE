import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/app_state.dart';
import '../services/api_service.dart';
import '../services/database.dart';
import '../models/seat.dart';

class SeatsScreen extends StatefulWidget {
  const SeatsScreen({super.key});

  @override
  State<SeatsScreen> createState() => _SeatsScreenState();
}

class _SeatsScreenState extends State<SeatsScreen> {
  final DatabaseService _dbService = DatabaseService();
  List<Seat> _seats = [];
  Set<String> _localTicketIds = {};
  bool _loading = true;
  Timer? _refreshTimer;

  static const _seatConfig = {
    'front': {
      'prefix': 'F',
      'rows': ['A', 'B', 'C', 'D', 'E'],
      'seatsPerRow': 15,
    },
    'rear': {
      'prefix': 'R',
      'rows': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'],
      'seatsPerRow': 15,
    },
    'balcony': {
      'prefix': 'B',
      'rows': ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
      'seatsPerRow': 15,
    },
  };

  @override
  void initState() {
    super.initState();
    _loadSeats();
    _refreshTimer = Timer.periodic(const Duration(seconds: 10), (_) => _loadSeats());
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadSeats() async {
    final appState = context.read<AppState>();
    if (appState.demoMode) {
      _loadMockSeats();
      return;
    }

    final apiService = ApiService(baseUrl: appState.apiBaseUrl!);

    try {
      final seatsData = await apiService.fetchSeats(appState.currentEvent!.id);
      final seats = seatsData.map((map) => Seat.fromMap(map)).toList();
      final localTickets = await _dbService.getCheckedInTicketIds(appState.currentEvent!.id);

      if (mounted) {
        setState(() {
          _seats = seats;
          _localTicketIds = localTickets.toSet();
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  void _loadMockSeats() {
    final seats = <Seat>[];
    final localTicketIds = <String>{};
    int counter = 0;

    _seatConfig.forEach((section, config) {
      final rows = config['rows'] as List<String>;
      final seatsPerRow = config['seatsPerRow'] as int;
      final prefix = config['prefix'] as String;

      for (final row in rows) {
        for (var i = 1; i <= seatsPerRow; i++) {
          counter++;
          String status = 'available';
          String? ticketId;

          if (counter <= 20) {
            status = 'assigned';
            ticketId = 'local-$counter';
            localTicketIds.add(ticketId);
          } else if (counter <= 60) {
            status = 'assigned';
            ticketId = 'other-$counter';
          }

          seats.add(
            Seat(
              id: 'demo-$counter',
              eventId: 'demo-xenith-26',
              section: section,
              row: row,
              number: i,
              seatCode: '$prefix$row$i',
              status: status,
              ticketId: ticketId,
            ),
          );
        }
      }
    });

    setState(() {
      _seats = seats;
      _localTicketIds = localTicketIds;
      _loading = false;
    });
  }

  Seat _findSeat(String section, String row, int number) {
    final code = '${_seatConfig[section]!['prefix']}$row$number';
    return _seats.firstWhere(
      (seat) => seat.seatCode == code,
      orElse: () => Seat(
        id: 'loading',
        eventId: '',
        section: section,
        row: row,
        number: number,
        seatCode: code,
        status: 'available',
      ),
    );
  }

  Widget _buildSeat(Seat seat) {
    final isAssigned = seat.status == 'assigned';
    final isBlocked = seat.status == 'blocked';
    final isLocal = seat.ticketId != null && _localTicketIds.contains(seat.ticketId!);

    Color color = Colors.white;
    Color border = Colors.grey.shade300;

    if (isBlocked) {
      color = Colors.red.shade300;
      border = Colors.red.shade300;
    } else if (isAssigned && isLocal) {
      color = Colors.green;
      border = Colors.green;
    } else if (isAssigned) {
      color = Colors.grey.shade400;
      border = Colors.grey.shade400;
    }

    return Container(
      width: 26,
      height: 26,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: border),
      ),
      child: Text(
        seat.number.toString(),
        style: TextStyle(fontSize: 10, color: isAssigned || isBlocked ? Colors.white : Colors.black54),
      ),
    );
  }

  Widget _buildSection(String section, String title) {
    final config = _seatConfig[section]!;
    final rows = config['rows'] as List<String>;
    final seatsPerRow = config['seatsPerRow'] as int;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            for (final row in rows)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    SizedBox(width: 28, child: Text('${config['prefix']}$row')),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Wrap(
                        spacing: 4,
                        runSpacing: 4,
                        children: [
                          for (var i = 1; i <= seatsPerRow; i++)
                            _buildSeat(_findSeat(section, row, i)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final localAssignedCount = _seats.where((seat) => seat.ticketId != null && _localTicketIds.contains(seat.ticketId!)).length;
    final totalAssigned = _seats.where((seat) => seat.status == 'assigned').length;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Seat Arrangement'),
        actions: [
          IconButton(
            onPressed: _loadSeats,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _LegendChip(color: Colors.green, label: 'This device'),
                      const SizedBox(width: 12),
                      _LegendChip(color: Colors.grey, label: 'Other devices'),
                      const SizedBox(width: 12),
                      _LegendChip(color: Colors.red.shade300, label: 'Blocked'),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text('This device: $localAssignedCount  |  Total filled: $totalAssigned'),
                  const SizedBox(height: 16),
                  _buildSection('front', 'Front Section (FA-FE)'),
                  _buildSection('rear', 'Rear Section (RA-RY)'),
                  _buildSection('balcony', 'Balcony Section (BA-BJ)'),
                ],
              ),
            ),
    );
  }
}

class _LegendChip extends StatelessWidget {
  const _LegendChip({required this.color, required this.label});

  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(width: 16, height: 16, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(3))),
        const SizedBox(width: 6),
        Text(label),
      ],
    );
  }
}
