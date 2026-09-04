import 'dart:async';
import 'dart:convert';
import 'dart:developer';
import 'dart:io' show Platform;
import 'dart:typed_data';
import 'dart:ui' show Size;

import 'package:battery_plus/battery_plus.dart';
import 'package:camera/camera.dart';
import 'package:flutter/services.dart' show HapticFeedback;
import 'package:flutter/widgets.dart' show AppLifecycleState, WidgetsBinding, WidgetsBindingObserver;
import 'package:geolocator/geolocator.dart';
import 'package:get/get.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:image/image.dart' as img;
import 'package:network_info_plus/network_info_plus.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:screen_brightness/screen_brightness.dart';

import '../../models/checkin.dart';
import '../../models/face_template_model.dart';
import '../../routes/app_pages.dart';
import '../../services/api_service.dart';
import '../../services/audio_service.dart';
import '../../services/checkin_service.dart';
import '../../services/face_geometry.dart';
import '../../services/liveness_service.dart';
import '../../services/location_service.dart';
import '../../services/settings_service.dart';
import 'liveness/face_liveness_action.dart';
import 'widgets/confirm_punch_sheet.dart';
import 'widgets/out_of_area_dialog.dart';

enum ScanPhase { initializing, scanning, processing, success, notFound, error }

/// ชนิดผลที่ไม่สำเร็จ — ให้การ์ดโชว์หัวข้อ/ไอคอน/สีตรงเหตุ (ไม่ใช่ "ไม่พบข้อมูล" หมด)
enum ScanResultKind { notFound, canceled, rejected, gpsError, incomplete, connError, cameraError }

/// Flow ต่อ 1 สแกน (production):
/// กล้องหน้า + ML Kit ตรวจ "มีหน้า + ใหญ่พอ" → (ถ้าเปิด) ทำ liveness กันปลอม
/// → ถ่าย → match → (ถ้าเปิด) confirm → (ถ้าเปิด) ดึง GPS → DoorEnroll ลงเวลา
/// → cooldown → สแกนคนต่อไป
class FaceScanController extends GetxController with WidgetsBindingObserver {
  final settings = Get.find<SettingsService>();
  ApiService get _api => Get.find<ApiService>();
  AudioService get _audio => Get.find<AudioService>();
  LocationService get _location => Get.find<LocationService>();
  LivenessService get _liveness => Get.find<LivenessService>();

  CameraController? camera;
  late final FaceDetector _detector;

  final phase = ScanPhase.initializing.obs;
  final message = 'กำลังเปิดกล้อง...'.obs;
  final matched = Rxn<MatchResult>();
  final matchedPosition = ''.obs; // ตำแหน่งงาน (ดึงจาก attendance-api ไว้โชว์)
  final gpsPlace =
      ''.obs; // ชื่อจุดลงเวลาที่พิกัดล่าสุดอยู่ในรัศมี (นอกพื้นที่ = จุดใกล้สุด) — โชว์ใน popup + ส่งให้ backend
  final inOutType = RxnString();
  // สถานะจากเซิร์ฟเวอร์หลังลงเวลา (ตรงเวลา/สาย/ออกก่อนเวลา) + นาทีที่ต่าง
  final punchStatus = ''.obs;
  final punchDiffMin = 0.obs;
  final faceDetected = false.obs; // เจอหน้า + ใหญ่พอในเฟรมล่าสุด (ไว้เปลี่ยนสีกรอบ)
  final brightOn = false.obs; // ปุ่ม fill light (ring light ขาวนอกวงรี + จอสว่างสุด)
  final paused = false.obs; // หยุดสแกนชั่วคราว (อยู่หน้าเดิม ไม่ออก)
  final resultKind = ScanResultKind.notFound.obs; // ชนิดผลที่ไม่สำเร็จ (ให้การ์ดโชว์ตรงเหตุ)
  final batteryLevel = RxnInt(); // % แบต
  int _missStreak = 0; // จำไม่ได้ติดกันกี่ครั้ง — ≥2 เตือนเรื่องหน้ากาก

  // ---- readiness (chip "พร้อม" มุมขวาบน — แตะกางดูรายละเอียด) ----
  final online = true.obs; // backend ติดต่อได้ไหม (ping /health)
  final gpsReady = true.obs; // GPS พร้อม (permission + service) เมื่อเปิด location
  final gpsCoords = RxnString(); // พิกัดล่าสุด "lat, long" (โชว์ใน sheet เหมือน UI เก่า)
  final gpsAccuracyM = RxnDouble(); // ความคลาดของ fix ล่าสุด (เมตร) — โชว์ใน sheet
  final wifiName = RxnString();
  Timer? _readyTimer;

  // ---- ด่านตำแหน่งก่อนสแกน (บังคับ GPS + geofence) — นอกพื้นที่ = ห้ามสแกน ----
  final locBlocked = false.obs; // true = อยู่นอกพื้นที่/หาตำแหน่งไม่ได้ → บล็อกสแกน
  final locBlockMsg = ''.obs; // เหตุผล (นอกพื้นที่ + ระยะห่าง / เปิด location)
  final locChecking = false.obs; // กำลังตรวจตำแหน่งรอบแรก (ยังไม่รู้ผล → ยังไม่ให้สแกน)
  Timer? _locTimer;
  StreamSubscription<Position>? _gpsSub; // fix สดจาก LocationService → sheet สถานะ
  bool _locBusy = false;

  /// in/out ที่ "ควรเป็นต่อไป" จากหน้า home (suggest) — เป็นค่าเริ่มต้นใน confirm popup
  /// in/out จริงตัดสินใน confirm popup (มติ C) ไม่ใช่จาก home
  String get _suggestAction {
    final a = Get.arguments;
    final s = a is Map ? a['suggest'] as String? : null;
    return s ?? _checkin.nextAction;
  }

  CheckinService get _checkin => Get.find<CheckinService>();

  /// พร้อมลงเวลาไหม = ออนไลน์ + (GPS พร้อม หรือ ไม่ได้เปิด GPS)
  bool get isReady => online.value && (gpsReady.value || !settings.isEnableLocationEnrolling.value);

  /// ป้ายบน chip — บอกเหตุที่ "ยังไม่พร้อม"
  String get readinessLabel {
    if (!online.value) return 'ออฟไลน์';
    if (settings.isEnableLocationEnrolling.value && !gpsReady.value) return 'รอ GPS';
    return 'พร้อม';
  }

  // ---- liveness state (โชว์ overlay) ----
  final livenessActive = false.obs;
  final livenessInstruction = ''.obs;
  final livenessCompleted = 0.obs;
  final livenessTotal = 0.obs;

  List<FaceLivenessAction> _queue = [];
  int _idx = 0;
  bool _waitingForBlink = false;
  bool _livenessPassed = false;
  DateTime _lastLivenessCheck = DateTime.fromMillisecondsSinceEpoch(0);

  bool _busy = false;
  int _frameErrors = 0; // นับ error แปลงภาพ/ตรวจหน้าติดกัน → แจ้งผู้ใช้ ไม่เงียบ
  // ---- smile-confirm / try-again (กล้องเปิดค้างตอน confirm) ----
  bool _confirmActive = false;
  bool _confirmBusy = false;
  int? _confirmDefaultShift;
  int _confirmEnrollType = 2; // in/out ที่จะใช้ตอน smile-confirm (2=เข้า, 3=ออก)
  DateTime _lastConfirmCheck = DateTime.fromMillisecondsSinceEpoch(0);

  DateTime _lastAttempt = DateTime.fromMillisecondsSinceEpoch(0);
  DateTime _lastFrameProcess = DateTime.fromMillisecondsSinceEpoch(0);
  Timer? _batteryTimer;
  final Battery _battery = Battery();

  static const Duration cooldown = Duration(seconds: 3);
  static const Duration livenessThrottle = Duration(milliseconds: 300);

  @override
  void onInit() {
    super.onInit();
    _detector = FaceDetector(
      options: FaceDetectorOptions(
        performanceMode: FaceDetectorMode.fast,
        enableClassification: true, // จำเป็นสำหรับ blink/smile (eyeOpen/smiling prob)
        enableLandmarks: true,
        enableContours: true,
        minFaceSize: 0.15,
      ),
    );
    // fill light อัตโนมัติ: เจอหน้า → จอสว่างสุด / ไม่เจอ → คืนปกติ
    ever<bool>(faceDetected, _autoFillLight);
    _initExtras();
    _initReadiness();
    _init();
    // เปิดฟัง GPS ค้างไว้ทั้งจอสแกน — ชิปแม่นขึ้นเองระหว่างทำท่า/รอ match ตอนกดยืนยันจะได้ค่าที่นิ่งแล้ว
    if (settings.isEnableLocationEnrolling.value) {
      _location.startListening();
      _gpsSub = _location.updates.listen(_onGpsUpdate);
    }
    WidgetsBinding.instance.addObserver(this); // ตามจังหวะพับ/เปิดแอป
  }

  /// พับแอป → หยุดสตรีมกล้อง / กลับมา → คืนสตรีม
  /// (กันสแกนต่อเบื้องหลังแล้ว popup ยืนยันเด้งทับหน้า PIN)
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      try {
        if (camera?.value.isStreamingImages ?? false) camera!.stopImageStream();
      } catch (_) {}
      _location.stopListening(); // พับแอป = ไม่เปลือง GPS
    } else if (state == AppLifecycleState.resumed) {
      _restartStreamIfNeeded();
      // กลับเข้าแอป (อาจเพิ่งเปิด Location / เดินเข้าเขต) — ฟังใหม่ + ตรวจตำแหน่งใหม่
      if (settings.isEnableLocationEnrolling.value) {
        _location.startListening();
        _refreshLocationGate(showChecking: true);
      }
    }
  }

  Future<void> _restartStreamIfNeeded() async {
    if (camera == null || !camera!.value.isInitialized || camera!.value.isStreamingImages) {
      return;
    }
    try {
      if (_confirmActive) {
        await camera!.startImageStream(_onConfirmFrame);
      } else if (phase.value == ScanPhase.scanning && !paused.value) {
        await camera!.startImageStream(_onFrame);
      }
    } catch (_) {}
  }

  // ---- readiness: เช็ค online/GPS/wifi/แบต เป็นระยะ (ป้อน chip "พร้อม") ----
  void _initReadiness() {
    _refreshReadiness();
    _readyTimer = Timer.periodic(const Duration(seconds: 20), (_) => _refreshReadiness());
  }

  /// ด่านตำแหน่ง: บังคับ GPS + อยู่นอกรัศมี = บล็อกสแกน (บอกก่อนสแกน ไม่ใช่หลังยืนยัน)
  /// showChecking = โชว์ "กำลังตรวจตำแหน่ง" ระหว่างรอบแรก/กดเช็คใหม่ (กันสแกนก่อนรู้ผล)
  Future<void> _refreshLocationGate({bool showChecking = false}) async {
    if (!settings.isEnableLocationEnrolling.value) {
      locBlocked.value = false;
      locBlockMsg.value = '';
      locChecking.value = false;
      return;
    }
    if (_locBusy) return;
    _locBusy = true;
    try {
      if (showChecking && !locBlocked.value) locChecking.value = true;
      // รอบแรก/กดเช็คเอง = รอค่าที่นิ่งได้ ; รอบ timer = ใช้ค่าดีสุดที่มี ไม่รอ
      final pos = await _location.getCurrentPosition(waitForGood: showChecking);
      if (pos == null) {
        locBlockMsg.value = 'ยังหาตำแหน่งไม่ได้ — เช็คว่าเปิด Location และ Wi-Fi แล้วกดตรวจอีกครั้ง';
        locBlocked.value = true;
        return;
      }
      gpsCoords.value = '${pos.latitude.toStringAsFixed(5)}, ${pos.longitude.toStringAsFixed(5)}';
      gpsAccuracyM.value = pos.accuracy > 0 ? pos.accuracy : null;
      final g = _checkGeofence(pos.latitude, pos.longitude, pos.accuracy);
      gpsPlace.value = g.place ?? '';
      final err = g.error;
      if (err != null) {
        locBlockMsg.value = err; // "อยู่นอกพื้นที่ที่กำหนด (ห่าง ... ม.)"
        locBlocked.value = true;
      } else {
        locBlocked.value = false;
        locBlockMsg.value = '';
      }
    } finally {
      locChecking.value = false;
      _locBusy = false;
    }
  }

  /// ปุ่ม "ตรวจตำแหน่งอีกครั้ง" บนการ์ดนอกพื้นที่
  void recheckLocation() => _refreshLocationGate(showChecking: true);

  /// fix ใหม่จาก stream → พิกัด/ความคลาดใน sheet สถานะอัปเดตสด
  void _onGpsUpdate(Position p) {
    gpsCoords.value = '${p.latitude.toStringAsFixed(5)}, ${p.longitude.toStringAsFixed(5)}';
    gpsAccuracyM.value = p.accuracy > 0 ? p.accuracy : null;
  }

  Future<void> _refreshReadiness() async {
    online.value = await _api.checkStatus(); // ping face-cloud /health
    try {
      batteryLevel.value = await _battery.batteryLevel;
    } catch (_) {}
    try {
      final n = await NetworkInfo().getWifiName(); // มักมี " ครอบ
      wifiName.value = n?.replaceAll('"', '');
    } catch (_) {
      wifiName.value = null;
    }
    if (settings.isEnableLocationEnrolling.value) {
      try {
        final svc = await Geolocator.isLocationServiceEnabled();
        final perm = await Geolocator.checkPermission();
        gpsReady.value = svc && (perm == LocationPermission.always || perm == LocationPermission.whileInUse);
        // พิกัดใน sheet ปกติ stream ป้อนสดอยู่แล้ว (_onGpsUpdate) — ยังไม่มีค่าเลยค่อยหยิบ last-known
        if (gpsReady.value && _location.latest == null) {
          try {
            final pos = await Geolocator.getLastKnownPosition();
            if (pos != null) _onGpsUpdate(pos);
          } catch (_) {
            // หาพิกัดไม่ได้รอบนี้ — คงค่าเดิมไว้
          }
        }
      } catch (_) {
        gpsReady.value = false;
      }
    } else {
      gpsReady.value = true;
      gpsCoords.value = null;
      gpsAccuracyM.value = null;
    }
  }

  void _initExtras() {
    _applyBrightness();
    if (settings.showBattery.value) {
      _updateBattery();
      _batteryTimer = Timer.periodic(const Duration(seconds: 30), (_) => _updateBattery());
    }
  }

  /// ความสว่างจอตอนยังไม่เจอหน้า: หรี่ (ถ้าเปิด dimScreen) ไม่งั้นปกติ
  void _applyBrightness() {
    if (settings.dimScreen.value) {
      _setBrightness(0.15);
    } else {
      _resetBrightness();
    }
  }

  /// fill light อัตโนมัติ: เจอหน้า → จอสว่างสุดส่องหน้า / ไม่เจอ → คืนปกติ
  /// ถ้าเปิดปุ่ม fill light (brightOn) ค้างไว้ = บังคับสว่างสุดเสมอ (override auto)
  void _autoFillLight(bool face) {
    if (brightOn.value || face) {
      _setBrightness(1.0);
    } else {
      _applyBrightness();
    }
  }

  /// ปุ่ม fill light (ring light) — เปิดเลเยอร์ขาวนอกวงรี + จอสว่างสุด / ปิด = กลับ auto
  Future<void> toggleFillLight() async {
    brightOn.value = !brightOn.value;
    if (brightOn.value) {
      _setBrightness(1.0);
    } else {
      _autoFillLight(faceDetected.value);
    }
  }

  Future<void> _setBrightness(double v) async {
    try {
      await ScreenBrightness().setApplicationScreenBrightness(v);
    } catch (_) {}
  }

  Future<void> _updateBattery() async {
    try {
      batteryLevel.value = await _battery.batteryLevel;
    } catch (_) {}
  }

  Future<void> _init() async {
    final perm = await Permission.camera.request();
    if (!perm.isGranted) {
      resultKind.value = ScanResultKind.cameraError;
      phase.value = ScanPhase.error;
      message.value = 'ไม่ได้รับสิทธิ์ใช้กล้อง — เปิดสิทธิ์ในตั้งค่าแอป';
      return;
    }

    final cams = await availableCameras();
    final front = cams.firstWhere((c) => c.lensDirection == CameraLensDirection.front, orElse: () => cams.first);
    // ล็อก "กลาง" — เปิดสแกนแค่ช่วงสั้นๆ บนมือถือส่วนตัว ไม่ต้องมีปุ่มปรับ (รูปโดนย่อก่อนส่งอยู่แล้ว)
    camera = CameraController(
      front,
      ResolutionPreset.medium,
      enableAudio: false,
      // Android: yuv420 → แปลงเป็น nv21 เอง / iOS: bgra8888 ส่งตรงให้ ML Kit
      imageFormatGroup: Platform.isIOS ? ImageFormatGroup.bgra8888 : ImageFormatGroup.yuv420,
    );
    await camera!.initialize();
    // ปิดแฟลช — iPhone ไม่มีแฟลชหน้า เลยทำจอขาวจ้าแทน (Retina Flash) ตอนถ่าย
    try {
      await camera!.setFlashMode(FlashMode.off);
    } catch (_) {}
    await camera!.startImageStream(_onFrame);
    phase.value = ScanPhase.scanning;
    message.value = 'กรุณามองกล้อง';

    // ด่านตำแหน่ง: บังคับ GPS แล้วอยู่นอกรัศมี = บล็อกสแกนตั้งแต่ต้น + เช็คซ้ำเรื่อยๆ
    if (settings.isEnableLocationEnrolling.value) {
      _refreshLocationGate(showChecking: true);
      _locTimer = Timer.periodic(const Duration(seconds: 8), (_) => _refreshLocationGate());
    }
  }

  /// หยุดสแกนชั่วคราว — อยู่หน้าเดิม (หยุดตรวจจับ ไม่ออกจากหน้า)
  void pauseScan() {
    if (paused.value) return;
    paused.value = true;
    try {
      if (camera?.value.isStreamingImages ?? false) camera!.stopImageStream();
    } catch (_) {}
    _resetLiveness();
    faceDetected.value = false;
    phase.value = ScanPhase.scanning; // คงหน้าสแกน (ปุ่มสลับเป็น "สแกนต่อ")
    message.value = 'หยุดสแกนชั่วคราว';
  }

  /// สแกนต่อ
  Future<void> resumeScan() async {
    if (!paused.value) return;
    paused.value = false;
    message.value = 'กรุณามองกล้อง';
    phase.value = ScanPhase.scanning;
    _lastAttempt = DateTime.now();
    try {
      if (camera != null && camera!.value.isInitialized && !(camera!.value.isStreamingImages)) {
        await camera!.startImageStream(_onFrame);
      }
    } catch (_) {}
  }

  Future<void> _onFrame(CameraImage frame) async {
    if (Get.currentRoute == Routes.enterPin) return; // หน้า PIN บังอยู่ — ห้ามสแกนต่อ
    if (locBlocked.value || locChecking.value) return; // นอกพื้นที่/ยังตรวจตำแหน่งไม่เสร็จ — ห้ามสแกน
    if (paused.value || _busy || phase.value != ScanPhase.scanning) return;
    if (DateTime.now().difference(_lastAttempt) < cooldown) return;
    if (DateTime.now().difference(_lastFrameProcess) < Duration(milliseconds: settings.throttlerMs.value)) {
      return;
    }
    _lastFrameProcess = DateTime.now();
    _busy = true;
    try {
      final input = _toInputImage(frame);
      if (input == null) return;
      final faces = await _detector.processImage(input);
      _frameErrors = 0; // แปลง+ตรวจสำเร็จ → reset
      if (faces.isEmpty) {
        faceDetected.value = false;
        if (livenessActive.value || _livenessPassed) {
          _resetLiveness(); // กำลังทำ liveness แล้วหน้าหลุดเฟรม → เริ่มใหม่
        } else if (phase.value == ScanPhase.scanning) {
          message.value = 'ไม่พบใบหน้า — จัดหน้าให้อยู่ในกรอบ และเพิ่มแสงให้สว่าง';
        }
        return;
      }

      final face = faces.first;
      final widthRatio = face.boundingBox.width / frame.width;
      if (widthRatio < settings.minFaceWidthRatio) {
        faceDetected.value = false;
        if (!livenessActive.value) message.value = 'ขยับเข้าใกล้อีกนิด ให้ใบหน้าเต็มกรอบ';
        return;
      }
      faceDetected.value = true; // เจอหน้า + ใหญ่พอ (กรอบจะเป็นสีเขียว)

      // ใกล้พอแล้ว: ถ้าเปิด liveness และยังไม่ผ่าน → ทำ liveness ก่อน (ยังไม่ถ่าย)
      if (settings.isEnableLivenessDetection.value && !_livenessPassed) {
        if (!livenessActive.value) {
          _startLiveness();
        } else {
          _validateLivenessFrame(face);
        }
        return;
      }

      // liveness ปิด หรือผ่านแล้ว → ถ่าย + match
      _lastAttempt = DateTime.now();
      await _captureAndIdentify();
    } catch (e) {
      log('frame error: $e');
      // แปลงภาพ/ตรวจหน้าพังติดกันหลายเฟรม → บอกผู้ใช้
      if (++_frameErrors >= 8 && phase.value == ScanPhase.scanning && !livenessActive.value) {
        message.value = 'กล้องส่งภาพไม่ได้ — ลองปิด-เปิดแอป หรือรีสตาร์ทเครื่อง';
      }
    } finally {
      _busy = false;
    }
  }

  InputImage? _toInputImage(CameraImage frame) {
    if (camera == null) return null;
    final rotation = InputImageRotationValue.fromRawValue(camera!.description.sensorOrientation);
    if (rotation == null) return null;
    // iOS: BGRA8888 plane เดียว ส่งตรง (NV21 มีแค่ Android)
    if (Platform.isIOS) {
      final p = frame.planes.first;
      return InputImage.fromBytes(
        bytes: p.bytes,
        metadata: InputImageMetadata(
          size: Size(frame.width.toDouble(), frame.height.toDouble()),
          rotation: rotation,
          format: InputImageFormat.bgra8888,
          bytesPerRow: p.bytesPerRow,
        ),
      );
    }
    final nv21 = _toNv21(frame);
    if (nv21 == null) return null;
    return InputImage.fromBytes(
      bytes: nv21,
      metadata: InputImageMetadata(
        size: Size(frame.width.toDouble(), frame.height.toDouble()),
        rotation: rotation,
        format: InputImageFormat.nv21,
        bytesPerRow: frame.width, // nv21 แพ็คแน่น stride = width
      ),
    );
  }

  /// แปลง CameraImage → NV21 แพ็คแน่น (Y + VU สลับ) สำหรับ ML Kit (Android)
  Uint8List? _toNv21(CameraImage img) {
    // บางเครื่องส่ง nv21 plane เดียวมาแล้ว (ขนาดตรง) → ใช้ตรงๆ
    if (img.planes.length < 3) {
      final p = img.planes.first;
      if (p.bytes.length == img.width * img.height * 3 ~/ 2) return p.bytes;
    }
    if (img.planes.length < 3) return null;
    final w = img.width, h = img.height;
    final out = Uint8List(w * h + (w ~/ 2) * (h ~/ 2) * 2);
    final yP = img.planes[0], uP = img.planes[1], vP = img.planes[2];
    int o = 0;
    // Y (pixelStride = 1 เสมอใน YUV_420_888)
    final yStride = yP.bytesPerRow;
    for (int row = 0; row < h; row++) {
      final base = row * yStride;
      for (int col = 0; col < w; col++) {
        out[o++] = yP.bytes[base + col];
      }
    }
    // VU สลับ (nv21 = V ก่อน U)
    final uvStride = uP.bytesPerRow;
    final uvPix = uP.bytesPerPixel ?? 2;
    for (int row = 0; row < h ~/ 2; row++) {
      final base = row * uvStride;
      for (int col = 0; col < w ~/ 2; col++) {
        final i = base + col * uvPix;
        out[o++] = vP.bytes[i];
        out[o++] = uP.bytes[i];
      }
    }
    return out;
  }

  // ---------- liveness ----------

  void _startLiveness() {
    final count = settings.livenessRandomCount.value.clamp(1, 5);
    final type = settings.selectedLivenessType.value;
    if (count == 1 && type != 'random') {
      final a = FaceLivenessAction.fromKey(type);
      _queue = [a ?? FaceLivenessAction.blink];
    } else {
      final pool = List<FaceLivenessAction>.from(FaceLivenessAction.values)..shuffle();
      _queue = pool.take(count).toList();
    }
    _idx = 0;
    _waitingForBlink = false;
    livenessActive.value = true;
    livenessTotal.value = _queue.length;
    livenessCompleted.value = 0;
    _announceCurrent();
  }

  void _announceCurrent() {
    final a = _queue[_idx];
    livenessInstruction.value = a.instruction;
    message.value = a.instruction;
    _lastLivenessCheck = DateTime.now();
    _audio.playAction(a);
  }

  void _validateLivenessFrame(Face face) {
    if (DateTime.now().difference(_lastLivenessCheck) < livenessThrottle) return;
    final a = _queue[_idx];
    bool pass;
    if (a == FaceLivenessAction.blink) {
      if (!_waitingForBlink) {
        if (_liveness.areEyesOpen(face)) {
          _waitingForBlink = true;
        }
        pass = false;
      } else {
        pass = _liveness.areEyesClosed(face);
      }
    } else {
      pass = _liveness.passesSimple(a, face);
    }
    if (pass) _completeAction();
  }

  void _completeAction() {
    _idx++;
    _waitingForBlink = false;
    livenessCompleted.value = _idx;
    if (_idx >= _queue.length) {
      // ครบทุกท่า → ผ่าน (เฟรมถัดไปจะถ่ายเอง)
      livenessActive.value = false;
      _livenessPassed = true;
      message.value = 'ตรวจสอบสำเร็จ มองกล้องตรงๆ';
    } else {
      _announceCurrent();
    }
  }

  void _resetLiveness() {
    _queue = [];
    _idx = 0;
    _waitingForBlink = false;
    _livenessPassed = false;
    livenessActive.value = false;
    livenessCompleted.value = 0;
    livenessTotal.value = 0;
    if (phase.value == ScanPhase.scanning) message.value = 'กรุณามองกล้อง';
  }

  // ---------- smile-confirm / try-again (กล้องเปิดค้างตอน confirm) ----------

  /// เปิดกล้องตรวจ smile/หันหน้า ระหว่างโชว์ confirm sheet (เฉพาะตอนเปิด toggle)
  Future<void> _startConfirmDetection(int? defaultShiftId) async {
    if (!settings.isEnableSmileConfirmation.value) return;
    _confirmDefaultShift = defaultShiftId;
    _confirmActive = true;
    _confirmBusy = false;
    try {
      if (camera != null && camera!.value.isInitialized && !camera!.value.isStreamingImages) {
        await camera!.startImageStream(_onConfirmFrame);
      }
    } catch (_) {}
  }

  Future<void> _stopConfirmDetection() async {
    _confirmActive = false;
    try {
      if (camera != null && camera!.value.isStreamingImages) {
        await camera!.stopImageStream();
      }
    } catch (_) {}
  }

  Future<void> _onConfirmFrame(CameraImage frame) async {
    if (Get.currentRoute == Routes.enterPin) return; // หน้า PIN บังอยู่
    if (!_confirmActive || _confirmBusy) return;
    if (DateTime.now().difference(_lastConfirmCheck) < livenessThrottle) return;
    _lastConfirmCheck = DateTime.now();
    _confirmBusy = true;
    try {
      final input = _toInputImage(frame);
      if (input == null) return;
      final faces = await _detector.processImage(input);
      if (faces.isEmpty) return;
      final face = faces.first;
      if ((face.smilingProbability ?? 0) >= 0.8) {
        _resolveConfirm(true); // ยิ้ม -> ยืนยัน (ใช้เวรแรก = ใกล้เวลาสุด)
      } else if (faceYaw(face) <= -20) {
        _resolveConfirm(false); // หันขวา -> ยกเลิก/ลองใหม่ (yaw normalize แล้ว)
      }
    } catch (_) {
      // ตรวจพลาดเฟรมเดียวไม่เป็นไร
    } finally {
      _confirmBusy = false;
    }
  }

  void _resolveConfirm(bool confirmed) {
    if (!_confirmActive) return;
    _confirmActive = false;
    if (Get.isBottomSheetOpen ?? false) {
      Get.back(
        result: confirmed
            ? {'confirmed': true, 'emp_shift_id': _confirmDefaultShift, 'enroll_type': _confirmEnrollType}
            : null,
      );
    }
  }

  // ---------- capture + match + punch ----------

  Future<void> _captureAndIdentify() async {
    phase.value = ScanPhase.processing;
    message.value = 'กำลังตรวจสอบ...';
    await camera!.stopImageStream();

    try {
      final sw = Stopwatch()..start();
      final shot = await camera!.takePicture();
      final tShot = sw.elapsedMilliseconds;
      final raw = await shot.readAsBytes();
      final tRead = sw.elapsedMilliseconds;
      final base64Image = await _compressToBase64(raw);
      final tComp = sw.elapsedMilliseconds;

      final res = await _api.match(base64Image);
      final tMatch = sw.elapsedMilliseconds;
      // timing ต่อขั้น (ไว้ debug ความช้า) — โชว์เฉพาะ debug build
      assert(() {
        // ignore: avoid_print
        print(
          '[SCAN] takePicture=${tShot}ms read=${tRead - tShot}ms '
          'compress=${tComp - tRead}ms match=${tMatch - tComp}ms '
          'total=${tMatch}ms img=${raw.length}B',
        );
        return true;
      }());
      if (res.matched && res.result != null) {
        _missStreak = 0; // จำได้แล้ว — ล้างตัวนับพลาด
        matched.value = res.result;
        // metadata ต้องมี emp_id (ฝากไว้ตอนลงทะเบียน) ไม่งั้นลงเวลากับ pharm ไม่ได้
        if (res.result!.empId.isEmpty) {
          resultKind.value = ScanResultKind.incomplete;
          phase.value = ScanPhase.notFound;
          message.value = 'ข้อมูลใบหน้ายังไม่ผูกกับพนักงาน — ลงทะเบียนใหม่อีกครั้ง';
          matched.value = null;
          await _afterCycle();
          return;
        }
        // ตำแหน่งงานไว้โชว์ + ใส่ใน noti — best-effort ไม่บล็อก popup (มาถึงเมื่อไหร่ค่อยขึ้น)
        matchedPosition.value = '';
        _api.getProfile(res.result!.empId).then((v) => matchedPosition.value = v);

        // confirm ก่อนลงเวลา (ถ้าเปิด)
        int? shiftId;
        // ---- confirm popup: เลือก in/out + เวร (มติ C) — แสดงเสมอ (in/out ตัดสินที่นี่) ----
        final suggest = _suggestAction; // 'in' | 'out' จาก home
        // เวรจาก cache ที่โหลดไว้ตอน login (แทบไม่เปลี่ยน — อยากได้ชุดใหม่ = logout/login)
        final shifts = _checkin.shifts
            .map((s) => EmpShift(id: s.id, name: s.name, timeStart: s.timeStart, timeEnd: s.timeEnd))
            .toList();
        _confirmDefaultShift = shifts.isNotEmpty ? shifts.first.id : null;
        _confirmEnrollType = suggest == 'out' ? 3 : 2;
        // เปิดกล้องค้างตรวจ "ยิ้ม=ยืนยัน / หันขวา=ลองใหม่" ระหว่างโชว์ confirm (ถ้าเปิด smile-confirm)
        await _startConfirmDetection(_confirmDefaultShift);
        final result = await Get.bottomSheet<Map<String, dynamic>?>(
          ConfirmPunchSheet(
            person: res.result!,
            shifts: shifts,
            suggest: suggest,
            matchedAt: res.matchedAt,
            place: gpsPlace.value.isEmpty ? null : gpsPlace.value,
            smileHint: settings.isEnableSmileConfirmation.value,
            // ยิ้มยืนยัน = แทนปุ่มยืนยัน ต้องได้ค่าที่ผู้ใช้เพิ่งกด ไม่ใช่ค่าตั้งต้น
            onPicked: (shiftId, type) {
              _confirmDefaultShift = shiftId;
              _confirmEnrollType = type;
            },
          ),
          isDismissible: false,
          enableDrag: false,
          isScrollControlled: true, // sheet สูงตามเนื้อหา (ไม่ล็อก 9/16 จอ) — เต็ม 90% ค่อยเลื่อน
        );
        await _stopConfirmDetection();
        if (result == null || result['confirmed'] != true) {
          // ยกเลิกเอง
          resultKind.value = ScanResultKind.canceled;
          phase.value = ScanPhase.notFound;
          message.value = 'ยังไม่ได้บันทึกเวลา ลองสแกนใหม่ได้เลย';
          matched.value = null;
          await _afterCycle(delay: const Duration(milliseconds: 800));
          return;
        }
        shiftId = result['emp_shift_id'] as int?;
        final enrollType = result['enroll_type'] as int? ?? _confirmEnrollType;

        // GPS ก่อนลงเวลา (logic ระบบเก่า) — เปิดแล้วต้องได้พิกัด ไม่งั้นบล็อก
        Position? position;
        String? scanPlace; // ชื่อจุดที่พิกัดตอนลงเวลาจริงอยู่ในรัศมี — ส่งให้ backend เก็บคู่แถว
        if (settings.isEnableLocationEnrolling.value) {
          message.value = 'กำลังระบุตำแหน่ง...';
          position = await _location.getCurrentPosition();
          if (position == null) {
            resultKind.value = ScanResultKind.gpsError;
            phase.value = ScanPhase.notFound;
            message.value = 'ยังหาตำแหน่งไม่ได้ — เช็คว่าเปิด Location และ Wi-Fi แล้วลองใหม่';
            matched.value = null;
            await _afterCycle();
            return;
          }
          // geofence จาก policy กลาง — เช็ค "จุดที่ใกล้สุด" (โรงปักได้หลายจุด)
          final g = _checkGeofence(position.latitude, position.longitude, position.accuracy);
          gpsPlace.value = g.place ?? '';
          scanPlace = g.place;
          final gpsErr = g.error;
          if (gpsErr != null) {
            resultKind.value = ScanResultKind.gpsError;
            phase.value = ScanPhase.notFound;
            message.value = gpsErr;
            matched.value = null;
            // ปิด confirm sheet ที่ค้าง (ถ้ามี) แล้วเตือนนอกพื้นที่แบบ popup — บล็อกลงเวลา
            if (Get.isBottomSheetOpen ?? false) Get.back();
            await showOutOfAreaDialog(gpsErr);
            await _afterCycle();
            return;
          }
        }

        final enroll = await _api.doorEnroll(
          person: res.result!,
          empShiftId: shiftId,
          position: position,
          gpsPlace: scanPlace,
          enrollType: enrollType,
        );

        if (!enroll.success) {
          // ถูกปฏิเสธจากด่านตรวจ (เช่น ลาออก / นอกเงื่อนไข) — ไม่ใช่สำเร็จ
          resultKind.value = ScanResultKind.rejected;
          phase.value = ScanPhase.notFound;
          message.value = enroll.message.isNotEmpty ? enroll.message : 'ไม่ผ่านการตรวจสอบสิทธิ์';
          matched.value = null;
        } else {
          inOutType.value = enroll.inOutType;
          punchStatus.value = enroll.statusName ?? '';
          punchDiffMin.value = enroll.diffMinute ?? 0;
          phase.value = ScanPhase.success;
          HapticFeedback.mediumImpact(); // สั่นสั้นๆ ยืนยันสำเร็จ
          message.value = _successMessage(res.result!, enroll.inOutType, enroll);

          // บันทึก session local (การ์ดวันนี้) ด้วยเวลา server (matched_at)
          // ควบเวร: เซิร์ฟเวอร์ปิดเวรก่อนหน้าให้แล้ว -> ปิด session เดิมในการ์ดวันนี้ตาม
          if (enroll.autoOutTime != null) {
            await _closeAutoOut(enroll, shifts, res.matchedAt);
          }
          // นาทีจากเซิร์ฟเวอร์ (สาย/ออกก่อน) — null = เซิร์ฟเวอร์ตัดสินไม่ได้ (ไม่มีเวร)
          await _recordToday(
            enroll.inOutType,
            enrollType,
            shiftId,
            shifts,
            res.matchedAt,
            diffMin: enroll.statusId == null ? null : (enroll.diffMinute ?? 0),
          );

          // แจ้งเตือน — ยิงทุกช่องทางที่เปิด (fire-and-forget ไม่ block การลงเวลา)
          if (settings.bmsNotiEnabled.value && settings.notiToken.value.isNotEmpty) {
            _api.sendBmsNotification(
              name: res.result!.name ?? 'พนักงาน',
              position: matchedPosition.value,
              token: settings.notiToken.value,
            );
          }
          if (settings.telegramNotiEnabled.value &&
              settings.telegramBotToken.value.isNotEmpty &&
              settings.telegramChatId.value.isNotEmpty) {
            _api.sendTelegramNotification(
              name: res.result!.name ?? 'พนักงาน',
              position: matchedPosition.value,
              botToken: settings.telegramBotToken.value,
              chatId: settings.telegramChatId.value,
            );
          }

          // มือถือส่วนตัว: ลงเวลาสำเร็จ = โชว์ผลครู่หนึ่งแล้วกลับหน้าหลัก (ไม่วนสแกนคนต่อไป)
          await Future.delayed(const Duration(milliseconds: 1800));
          if (Get.currentRoute == Routes.faceScan) Get.back();
          return;
        }
      } else {
        resultKind.value = ScanResultKind.notFound;
        phase.value = ScanPhase.notFound;
        // จำไม่ได้ติดกันหลายครั้ง → เตือนเรื่องหน้ากาก
        _missStreak++;
        message.value = _missStreak >= 2
            ? 'จำใบหน้าไม่ได้ — หากใส่หน้ากาก กรุณาถอดก่อนสแกน'
            : 'ยังไม่ลงทะเบียนใบหน้า? ลงทะเบียนก่อนแล้วลองใหม่';
      }
    } catch (e) {
      log('scan error: $e');
      resultKind.value = ScanResultKind.connError;
      phase.value = ScanPhase.error;
      message.value = 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง';
    }

    await _afterCycle();
  }

  /// โชว์ผลครู่หนึ่ง → reset → กลับไปสแกนคนต่อไป (delay สั้นลงได้เมื่อผู้ใช้กดยกเลิกเอง)
  /// เช็ค geofence กับทุกจุดของโรง — null = ผ่าน, ไม่ผ่านคืนข้อความ
  /// เผื่อค่าความคลาดของ fix (accuracyM) ตามที่มือถือรายงาน — GPS ในตึกแกว่งได้หลายสิบเมตร
  /// ผลเช็ค geofence กับจุดลงเวลาของโรง: error = null คือผ่าน · place = ชื่อจุดที่อยู่ในรัศมี (อยู่นอกทุกจุด = ชื่อจุดใกล้สุด)
  /// ไม่ได้ตั้งจุดเลย = ผ่านและไม่มีชื่อ
  ({String? error, String? place, double? distM}) _checkGeofence(double lat, double lng, double accuracyM) {
    final slack = LocationService.slackFor(accuracyM); // หักได้ไม่เกิน maxSlackM
    try {
      final locs = jsonDecode(settings.gpsLocationsJson.value) as List;
      final valid = locs.whereType<Map>().where((l) {
        final la = (l['lat'] as num?)?.toDouble() ?? 0, ln = (l['lng'] as num?)?.toDouble() ?? 0;
        final r = (l['radius_m'] as num?)?.toDouble() ?? 0;
        return r > 0 && (la != 0 || ln != 0);
      }).toList();
      if (valid.isNotEmpty) {
        // ผ่านถ้าอยู่ในรัศมี "จุดใดจุดหนึ่ง" — แต่ละจุดตั้งรัศมีคนละค่าได้ (อยู่ในหลายจุดซ้อนกัน = เอาจุดใกล้สุด)
        // (เทียบเฉพาะจุดใกล้สุดไม่ได้ จุดที่ไกลกว่าแต่รัศมีกว้างกว่าอาจครอบอยู่)
        Map? inside, nearest;
        double insideD = double.infinity, nearestD = double.infinity;
        for (final l in valid) {
          final d = Geolocator.distanceBetween((l['lat'] as num).toDouble(), (l['lng'] as num).toDouble(), lat, lng);
          if (d - slack <= (l['radius_m'] as num).toDouble() && d < insideD) {
            inside = l;
            insideD = d;
          }
          if (d < nearestD) {
            nearest = l;
            nearestD = d;
          }
        }
        if (inside != null) return (error: null, place: _fenceName(inside), distM: insideD);
        return (
          error: 'อยู่นอกพื้นที่ที่กำหนด (ห่าง${_fenceName(nearest)} ${nearestD.round()} ม.)',
          place: _fenceName(nearest),
          distM: nearestD,
        );
      }
    } catch (_) {}
    return (error: null, place: null, distM: null); // ไม่มีจุด/ข้อมูลเพี้ยน = ไม่จำกัดพื้นที่
  }

  static String _fenceName(Map? l) {
    final n = (l?['name'] as String?)?.trim() ?? '';
    return n.isEmpty ? 'จุดลงเวลา' : n;
  }

  Future<void> _afterCycle({Duration? delay}) async {
    // ประทับเวลาก่อนรอ — ให้ช่วงโชว์ผลกับด่าน cooldown ใน _onFrame นับทับกัน
    // (เดิมประทับหลังรอ กลายเป็นรอซ้อน 2 ชั้น ~6 วิ กล้องเปิดแต่ไม่ยอมสแกน)
    _lastAttempt = DateTime.now();
    await Future.delayed(delay ?? cooldown);
    matched.value = null;
    matchedPosition.value = '';
    inOutType.value = null;
    _resetLiveness(); // คนต่อไปต้องทำ liveness ใหม่
    if (camera != null && camera!.value.isInitialized) {
      await camera!.startImageStream(_onFrame);
      phase.value = ScanPhase.scanning;
      message.value = 'กรุณามองกล้อง';
    }
  }

  String _successMessage(MatchResult emp, String? type, DoorEnrollResponse enroll) {
    final action = switch (type) {
      'I' => 'เข้างาน',
      'O' => 'ออกงาน',
      _ => 'บันทึกเวลา',
    };
    // ไม่โชว์ emp_id (อ่อนไหว)
    final greet = (emp.name != null && emp.name!.isNotEmpty) ? 'สวัสดี ${emp.name}\n' : '';
    // สถานะจากเซิร์ฟเวอร์ (เทียบเวลาเวรแล้ว) — สาย/ออกก่อน โชว์จำนวนนาทีด้วย
    final d = enroll.diffMinute ?? 0;
    final note = (enroll.isLate || enroll.isEarlyOut) && d > 0 ? '\n${enroll.statusName} $d นาที' : '';
    // ควบเวร: บอกด้วยว่าระบบปิดเวรก่อนหน้าให้แล้ว
    final auto = enroll.autoOutTime != null
        ? '\nลงเวลาออกเวร${enroll.autoOutShiftName ?? ''} ${enroll.autoOutTime} ให้อัตโนมัติ'
        : '';
    return '$greet$action สำเร็จ$note$auto';
  }

  /// บันทึกลง CheckinService (การ์ดวันนี้) — ใช้ inOutType จาก backend เป็นหลัก, fallback enrollType
  /// ปิด session เวรเก่าในการ์ดวันนี้ ตามที่เซิร์ฟเวอร์สแตมป์ให้ (ออกครบเวลา — ไม่ใช่ออกก่อน)
  Future<void> _closeAutoOut(DoorEnrollResponse enroll, List<EmpShift> shifts, String? matchedAt) async {
    Shift? old;
    for (final s in shifts) {
      if (s.id == enroll.autoOutShiftId) {
        old = Shift(id: s.id, name: s.name, timeStart: s.timeStart, timeEnd: s.timeEnd);
        break;
      }
    }
    // เวลาออก = เวลาเลิกเวรเก่า (วันเดียวกับที่สแกน) — ระบบลงให้ (autoOut)
    final day = (matchedAt ?? DateTime.now().toIso8601String()).substring(0, 10);
    await _checkin.recordOut(old, '${day}T${enroll.autoOutTime}:00', earlyMin: 0, autoOut: true);
  }

  Future<void> _recordToday(
    String? inOutType,
    int enrollType,
    int? shiftId,
    List<EmpShift> shifts,
    String? matchedAt, {
    int? diffMin,
  }) async {
    final isOut = inOutType == 'O' || (inOutType == null && enrollType == 3);
    Shift? chosen;
    for (final s in shifts) {
      if (s.id == shiftId) {
        chosen = Shift(id: s.id, name: s.name, timeStart: s.timeStart, timeEnd: s.timeEnd);
        break;
      }
    }
    final t = matchedAt ?? DateTime.now().toIso8601String();
    if (isOut) {
      await _checkin.recordOut(chosen, t, earlyMin: diffMin);
    } else {
      await _checkin.recordIn(chosen, t, lateMin: diffMin);
    }
  }

  /// ย่อรูปก่อนส่ง (กว้างสุด 480px, JPEG q70) — ลด payload เหมือนแนวทางแอปเดิม
  Future<String> _compressToBase64(List<int> bytes) async {
    final decoded = img.decodeImage(Uint8List.fromList(bytes));
    if (decoded == null) return base64Encode(bytes);
    final resized = decoded.width > 480 ? img.copyResize(decoded, width: 480) : decoded;
    return base64Encode(img.encodeJpg(resized, quality: 70));
  }

  @override
  void onClose() {
    WidgetsBinding.instance.removeObserver(this);
    _readyTimer?.cancel();
    _locTimer?.cancel();
    _gpsSub?.cancel();
    _location.stopListening();
    _batteryTimer?.cancel();
    _resetBrightness(); // คืนความสว่างเสมอ (auto fill-light อาจเร่งไว้)
    camera?.dispose();
    _detector.close();
    super.onClose();
  }

  Future<void> _resetBrightness() async {
    try {
      await ScreenBrightness().resetApplicationScreenBrightness();
    } catch (_) {}
  }
}
