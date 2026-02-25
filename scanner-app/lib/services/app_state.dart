import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/event.dart';
import 'database.dart';
import 'api_service.dart';
import 'sync_service.dart';

class AppState extends ChangeNotifier {
  final DatabaseService _dbService = DatabaseService();

  static const String defaultEventSlug = 'xenith-26';
  static const String defaultScannerId = 'xenith-26-scanner';
  static const String defaultApiBaseUrl = 'http://192.168.1.100:4000/api';
  
  Event? _currentEvent;
  String? _scannerId;
  String? _apiBaseUrl;
  int? _deviceId;
  String? _deviceName;
  bool _isSetup = false;
  bool _isLoading = false;
  bool _isLive = false;
  DateTime? _liveUpdatedAt;
  Timer? _liveTimer;
  bool _demoMode = false;

  Event? get currentEvent => _currentEvent;
  String? get scannerId => _scannerId;
  String? get apiBaseUrl => _apiBaseUrl;
  int? get deviceId => _deviceId;
  String? get deviceName => _deviceName;
  bool get isSetup => _isSetup;
  bool get isLoading => _isLoading;
  bool get isLive => _isLive;
  DateTime? get liveUpdatedAt => _liveUpdatedAt;
  bool get demoMode => _demoMode;

  Future<void> initialize() async {
    _isLoading = true;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      _scannerId = prefs.getString('scannerId');
      _apiBaseUrl = prefs.getString('apiBaseUrl') ?? 'http://localhost:4000/api';
      _deviceId = prefs.getInt('deviceId');
      _deviceName = prefs.getString('deviceName');
      
      final eventId = prefs.getString('currentEventId');
      if (eventId != null) {
        _currentEvent = await _dbService.getEvent(eventId);
      }

      _isSetup = _currentEvent != null && _scannerId != null && _deviceId != null;
    } catch (e) {
      debugPrint('[AppState] Initialize failed: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> bootstrapFixedEvent() async {
    _isLoading = true;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();

      _scannerId = prefs.getString('scannerId') ?? defaultScannerId;
      _apiBaseUrl = prefs.getString('apiBaseUrl') ?? defaultApiBaseUrl;
      _deviceId = prefs.getInt('deviceId');
      _deviceName = prefs.getString('deviceName');

      await prefs.setString('scannerId', _scannerId!);
      await prefs.setString('apiBaseUrl', _apiBaseUrl!);

      final storedEventId = prefs.getString('currentEventId');
      if (storedEventId != null) {
        _currentEvent = await _dbService.getEvent(storedEventId);
      }

      if (_currentEvent == null) {
        final apiService = ApiService(baseUrl: _apiBaseUrl!);
        final syncService = SyncService(apiService: apiService, dbService: _dbService);
        final result = await syncService.downloadEventData(defaultEventSlug);

        if (result.success) {
          final event = await _dbService.getEventBySlug(defaultEventSlug);
          if (event != null) {
            _currentEvent = event;
            await prefs.setString('currentEventId', event.id);
          }
        }
      }

      if (_deviceId == null) {
        _deviceId = 1;
        _deviceName = 'Device 1';
        await prefs.setInt('deviceId', _deviceId!);
        await prefs.setString('deviceName', _deviceName!);
      }

      _isSetup = _currentEvent != null && _scannerId != null && _deviceId != null;
      if (_isSetup) {
        startLivePolling();
        await refreshLiveStatus();
      }
    } catch (e) {
      debugPrint('[AppState] Bootstrap failed: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void enableDemoMode() {
    _demoMode = true;
    _isLoading = false;
    _scannerId = defaultScannerId;
    _apiBaseUrl = "";
    _deviceId = 1;
    _deviceName = "Device 1";
    _currentEvent = Event(
      id: "demo-xenith-26",
      name: "Xenith 26",
      slug: defaultEventSlug,
      publicKey: "",
      lastSynced: null,
    );
    _isSetup = true;
    notifyListeners();
  }

  void startLivePolling() {
    _liveTimer?.cancel();
    _liveTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      refreshLiveStatus();
    });
  }

  void stopLivePolling() {
    _liveTimer?.cancel();
    _liveTimer = null;
  }

  Future<void> refreshLiveStatus() async {
    if (_demoMode || _currentEvent == null || _apiBaseUrl == null || _apiBaseUrl!.isEmpty) return;

    try {
      final apiService = ApiService(baseUrl: _apiBaseUrl!);
      final response = await apiService.fetchLiveStatus(_currentEvent!.id);
      final live = response['isLive'] as bool? ?? false;
      final updatedAtRaw = response['updatedAt'] as String?;
      final updatedAt = updatedAtRaw != null ? DateTime.tryParse(updatedAtRaw) : null;

      _isLive = live;
      _liveUpdatedAt = updatedAt;
      notifyListeners();
    } catch (e) {
      debugPrint('[AppState] Live status refresh failed: $e');
    }
  }

  @override
  void dispose() {
    stopLivePolling();
    super.dispose();
  }

  Future<void> setupScanner({
    required String scannerId,
    required Event event,
    required String apiBaseUrl,
    required int deviceId,
    required String deviceName,
  }) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('scannerId', scannerId);
      await prefs.setString('currentEventId', event.id);
      await prefs.setString('apiBaseUrl', apiBaseUrl);
      await prefs.setInt('deviceId', deviceId);
      await prefs.setString('deviceName', deviceName);

      await _dbService.insertEvent(event);

      _scannerId = scannerId;
      _currentEvent = event;
      _apiBaseUrl = apiBaseUrl;
      _deviceId = deviceId;
      _deviceName = deviceName;
      _isSetup = true;

      notifyListeners();
    } catch (e) {
      debugPrint('[AppState] Setup failed: $e');
      rethrow;
    }
  }

  Future<void> clearSetup() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('scannerId');
      await prefs.remove('currentEventId');
      await prefs.remove('apiBaseUrl');
      await prefs.remove('deviceId');
      await prefs.remove('deviceName');

      await _dbService.clearAllData();

      _scannerId = null;
      _currentEvent = null;
      _apiBaseUrl = null;
      _deviceId = null;
      _deviceName = null;
      _isSetup = false;

      notifyListeners();
    } catch (e) {
      debugPrint('[AppState] Clear setup failed: $e');
      rethrow;
    }
  }

  Future<void> updateEventSyncTime(DateTime syncTime) async {
    if (_currentEvent == null) return;

    try {
      await _dbService.updateEventSyncTime(_currentEvent!.id, syncTime);
      _currentEvent = await _dbService.getEvent(_currentEvent!.id);
      notifyListeners();
    } catch (e) {
      debugPrint('[AppState] Update sync time failed: $e');
    }
  }
}
