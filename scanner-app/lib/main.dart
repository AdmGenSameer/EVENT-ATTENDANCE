import "package:flutter/material.dart";
import "package:provider/provider.dart";
import "services/app_state.dart";
import "screens/app_shell.dart";

void main() {
  runApp(const EventQrScannerApp());
}

class EventQrScannerApp extends StatelessWidget {
  const EventQrScannerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppState()..enableDemoMode(),
      child: MaterialApp(
        title: "EventQR Scanner",
        theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.indigo),
        home: const AppShell(),
      ),
    );
  }
}
