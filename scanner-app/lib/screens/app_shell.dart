import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/app_state.dart';
import 'home_screen.dart';
import 'history_screen.dart';
import 'seats_screen.dart';
import 'scanner_screen_complete.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _currentIndex = 0;

  void _navigateTo(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final appState = context.watch<AppState>();

    if (appState.isLoading) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (!appState.isSetup) {
      return Scaffold(
        appBar: AppBar(title: const Text('Xenith 26 Scanner')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.cloud_off, size: 48, color: Colors.redAccent),
                const SizedBox(height: 16),
                const Text(
                  'Unable to sync event data. Check connection and retry.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => appState.bootstrapFixedEvent(),
                  child: const Text('Retry Sync'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final screens = [
      const HomeScreen(),
      const HistoryScreen(),
      const SeatsScreen(),
      const ScannerScreenNew(),
    ];

    return Scaffold(
      body: Stack(
        children: [
          IndexedStack(
            index: _currentIndex,
            children: screens,
          ),
          if (appState.isLive)
            Positioned(
              top: 12,
              right: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.red.shade600,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.red.withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'LIVE',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _navigateTo(3),
        backgroundColor: Theme.of(context).colorScheme.primary,
        child: const Icon(Icons.qr_code_scanner),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      bottomNavigationBar: BottomAppBar(
        shape: const CircularNotchedRectangle(),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            IconButton(
              onPressed: () => _navigateTo(0),
              icon: Icon(
                Icons.home_outlined,
                color: _currentIndex == 0 ? Theme.of(context).colorScheme.primary : Colors.grey,
              ),
              tooltip: 'Home',
            ),
            IconButton(
              onPressed: () => _navigateTo(1),
              icon: Icon(
                Icons.history,
                color: _currentIndex == 1 ? Theme.of(context).colorScheme.primary : Colors.grey,
              ),
              tooltip: 'History',
            ),
            const SizedBox(width: 48),
            IconButton(
              onPressed: () => _navigateTo(2),
              icon: Icon(
                Icons.event_seat,
                color: _currentIndex == 2 ? Theme.of(context).colorScheme.primary : Colors.grey,
              ),
              tooltip: 'Seats',
            ),
            IconButton(
              onPressed: () => _navigateTo(3),
              icon: Icon(
                Icons.qr_code,
                color: _currentIndex == 3 ? Theme.of(context).colorScheme.primary : Colors.grey,
              ),
              tooltip: 'Scan',
            ),
          ],
        ),
      ),
    );
  }
}
