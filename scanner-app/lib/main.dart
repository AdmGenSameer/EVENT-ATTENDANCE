import "package:flutter/material.dart";
import "screens/setup_screen.dart";

void main() {
  runApp(const EventQrScannerApp());
}

class EventQrScannerApp extends StatelessWidget {
  const EventQrScannerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "EventQR Scanner",
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.indigo),
      home: const SetupScreen(),
    );
  }
}
