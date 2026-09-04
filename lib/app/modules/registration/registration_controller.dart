import 'dart:async';
import 'dart:convert';
import 'dart:io' show Platform;
import 'dart:typed_data';
import 'dart:ui' show Size;

import 'package:camera/camera.dart';
import 'package:flutter/services.dart' show SystemSound, SystemSoundType;
import 'package:get/get.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:image/image.dart' as img;
import 'package:permission_handler/permission_handler.dart';

import '../../routes/app_pages.dart';
import '../../services/api_service.dart';
import '../../services/audio_service.dart';
import '../../services/face_geometry.dart';
import '../../services/pin_service.dart';
import '../../services/settings_service.dart';

enum RegStep { checking, intro, capture, done }

/// 1 มุมที่ต้องถ่าย (auto-capture เมื่อ "อยู่ในมุม + นิ่ง + ตาเปิด")
class _Pose {
  const _Pose(this.label, this.instruction, this.ok, {this.audio});
  final String label; // ตรง/ซ้าย/ขวา (โชว์จุด)
  final String instruction;
  final bool Function(double yaw, double pitch) ok;
  final String? audio; // เสียงสั่งตอนเริ่มมุมนี้ (null = ไม่มีไฟล์เสียง)
}

/// ลงทะเบียนใบหน้า "ของตัวเอง" — auto-capture 3 มุม (ตรง/ซ้าย/ขวา)
/// เข้าหน้า → เช็คก่อนว่าเคยลงไหม → ไม่เคย=ถ่ายเลย / เคยแล้ว=เลือก (เพิ่มมุม/ลงใหม่)
class RegistrationController extends GetxController {
  final settings = Get.find<SettingsService>();
  ApiService get _api => Get.find<ApiService>();
  AudioService get _audio => Get.find<AudioService>();

  // ---- พารามิเตอร์ auto-capture (calibrate บนเครื่องจริงได้) ----
  static const double _frontYaw = 12, _frontPitch = 14, _turnYaw = 20;
  static const double _still = 4.0; // ขยับได้ไม่เกิน °/เฟรม ถึงนับว่านิ่ง (รอภาพชัด)
  static const int _hold = 6; // เฟรมที่ต้องนิ่ง+ตรงมุม ก่อนจับ
  static const double _eyeOpen = 0.4;

  // ลำดับมุม: ตรง → ซ้าย → ขวา (yaw normalize ที่ faceYaw() แล้ว — ซ้าย=บวก ขวา=ลบ ทุกเครื่อง)
  late final List<_Pose> _poses = [
    _Pose('ตรง', '🙂 มองตรงเข้ากล้อง', (y, p) => y.abs() < _frontYaw && p.abs() < _frontPitch),
    _Pose('ซ้าย', '⬅️ หันหน้าไปทางซ้าย', (y, p) => y >= _turnYaw, audio: 'audios/face_direction_left.mp3'),
    _Pose('ขวา', '➡️ หันหน้าไปทางขวา', (y, p) => y <= -_turnYaw, audio: 'audios/face_direction_right.mp3'),
  ];

  final step = RegStep.checking.obs;
  final busy = false.obs;
  final message = ''.obs;
  final captured = <String>[].obs; // รูปที่ถ่าย (base64)
  final checkFailed = false.obs; // GET /subject ล้มเหลว → โชว์ retry
  final poseIndex = 0.obs; // มุมปัจจุบัน (0..total)
  final instruction = ''.obs; // คำสั่ง guide
  final faceInZone = false.obs; // อยู่ในมุม+นิ่ง (กรอบเขียว)

  String? lastSubjectId;
  CameraController? camera;
  late final FaceDetector _detector;

  // โหมดลงทะเบียน
  bool _append = false; // true = ต่อ template ให้คนเดิม
  String? _targetSubjectId;
  final List<String> _existingIds = [];

  // auto-capture runtime
  bool _enrollActive = false;
  bool _frameBusy = false;
  int _holdCount = 0;
  int _announcedPose = -1; // มุมที่เล่นเสียงสั่งไปแล้ว (กันเล่นซ้ำตอน retry มุมเดิม)
  double _lastYaw = 999, _lastPitch = 999;
  DateTime _lastFrame = DateTime.fromMillisecondsSinceEpoch(0);
  static const _throttle = Duration(milliseconds: 120);

  // เสียงสั่งย้ำเป็นระยะ ถ้ายังทำมุมนั้นไม่สำเร็จ (เช่น สั่งหันซ้ายแต่ยังไม่หัน)
  Timer? _remindTimer;
  static const _remindEvery = Duration(seconds: 4);

  String get empId => settings.empId.value;
  String get staffName => settings.staffName.value;
  bool get isAppend => _append;
  int get totalPoses => _poses.length;
  String get angleLabel => poseIndex.value < _poses.length ? _poses[poseIndex.value].label : 'ครบแล้ว';

  @override
  void onInit() {
    super.onInit();
    _detector = FaceDetector(
      options: FaceDetectorOptions(
        performanceMode: FaceDetectorMode.fast,
        enableClassification: true, // ตาเปิด/ปิด (กันถ่ายตอนหลับตา)
        minFaceSize: 0.15,
      ),
    );
    checkExisting();
  }

  /// เช็คตอนเข้าหน้า: เคยลงทะเบียนไว้ไหม
  Future<void> checkExisting() async {
    step.value = RegStep.checking;
    checkFailed.value = false;
    if (empId.isEmpty) {
      _startCapture(append: false);
      return;
    }
    try {
      final ids = await _api.findSubjectIdsByEmpId(empId);
      _existingIds
        ..clear()
        ..addAll(ids);
      if (_existingIds.isEmpty) {
        _startCapture(append: false); // คนใหม่ → ถ่ายเลย
      } else {
        step.value = RegStep.intro; // เคยลงแล้ว → ให้เลือก
      }
    } catch (_) {
      checkFailed.value = true; // เน็ตพัง → ให้กดลองใหม่ (กันสร้างซ้ำ)
    }
  }

  /// ปุ่ม "เพิ่มมุม" → ต่อ template ให้ subject เดิม
  void addAngle() => _startCapture(append: true, subjectId: _existingIds.first);

  /// ปุ่ม "ลงใหม่" → ยืนยัน PIN (#4) → ลบของเดิมทั้งหมด แล้วถ่ายใหม่
  Future<void> reRegister() async {
    final pin = Get.find<PinService>();
    if (pin.hasPin) {
      final ok = await Get.toNamed(
        Routes.enterPin,
        arguments: {'purpose': 'overlay', 'dismissible': true, 'title': 'ยืนยันด้วย PIN เพื่อลงทะเบียนใหม่'},
      );
      if (ok != true) return;
    }
    busy.value = true;
    message.value = 'กำลังลบของเดิม...';
    try {
      for (final id in _existingIds) {
        await _api.deleteSubject(id);
      }
      _existingIds.clear();
      message.value = '';
      _startCapture(append: false);
    } catch (e) {
      message.value = 'ลบของเดิมไม่สำเร็จ: $e';
    } finally {
      busy.value = false;
    }
  }

  void _startCapture({required bool append, String? subjectId}) {
    _append = append;
    _targetSubjectId = subjectId;
    captured.clear();
    poseIndex.value = 0;
    _holdCount = 0;
    _announcedPose = -1;
    _lastYaw = 999;
    _lastPitch = 999;
    message.value = '';
    step.value = RegStep.capture;
    _initCamera();
  }

  Future<void> _initCamera() async {
    if (!(await Permission.camera.request()).isGranted) {
      message.value = 'ไม่ได้รับสิทธิ์ใช้กล้อง';
      return;
    }
    if (camera == null || !camera!.value.isInitialized) {
      final cams = await availableCameras();
      final front = cams.firstWhere((c) => c.lensDirection == CameraLensDirection.front, orElse: () => cams.first);
      camera = CameraController(
        front,
        ResolutionPreset.medium,
        enableAudio: false,
        // Android: yuv420 → แปลง nv21 เอง / iOS: bgra8888 ส่งตรงให้ ML Kit
        imageFormatGroup: Platform.isIOS ? ImageFormatGroup.bgra8888 : ImageFormatGroup.yuv420,
      );
      await camera!.initialize();
      // ปิดแฟลช — iPhone ไม่มีแฟลชหน้า เลยทำจอขาวจ้าแทน (Retina Flash) ตอนถ่าย
      try {
        await camera!.setFlashMode(FlashMode.off);
      } catch (_) {}
    }
    update();
    await _startEnrollStream();
  }

  Future<void> _startEnrollStream() async {
    _enrollActive = true;
    _frameBusy = false;
    if (poseIndex.value < _poses.length) {
      final pose = _poses[poseIndex.value];
      instruction.value = pose.instruction;
      // เสียงสั่งตอนเริ่มมุมใหม่ (มุมเดิม retry ไม่เล่นซ้ำ)
      if (_announcedPose != poseIndex.value) {
        _announcedPose = poseIndex.value;
        if (pose.audio != null) _audio.play(pose.audio!);
      }
      _startReminder(); // เริ่มนับใหม่ — ยังไม่ผ่านมุมนี้ก็ย้ำเสียงทุก _remindEvery
    }
    try {
      if (camera != null && camera!.value.isInitialized && !camera!.value.isStreamingImages) {
        await camera!.startImageStream(_onFrame);
      }
    } catch (_) {}
  }

  /// ย้ำเสียงสั่งมุมปัจจุบันทุก _remindEvery ถ้ายังไม่จัดหน้าเข้ามุม (faceInZone=false)
  void _startReminder() {
    _remindTimer?.cancel();
    _remindTimer = Timer.periodic(_remindEvery, (_) {
      if (step.value != RegStep.capture || !_enrollActive) return;
      if (poseIndex.value >= _poses.length || faceInZone.value) return;
      final pose = _poses[poseIndex.value];
      if (pose.audio != null) _audio.play(pose.audio!);
    });
  }

  /// ตรวจแต่ละเฟรม → ถ่ายเองเมื่อ "อยู่ในมุม + นิ่ง + ตาเปิด" ครบ _hold เฟรม
  Future<void> _onFrame(CameraImage frame) async {
    if (!_enrollActive || _frameBusy) return;
    if (DateTime.now().difference(_lastFrame) < _throttle) return;
    _lastFrame = DateTime.now();
    _frameBusy = true;
    try {
      final input = _toInputImage(frame);
      if (input == null) return;
      final faces = await _detector.processImage(input);
      if (faces.isEmpty) {
        _holdCount = 0;
        faceInZone.value = false;
        instruction.value = 'จัดหน้าให้อยู่ในกรอบวงรี';
        return;
      }
      final f = faces.first;
      final yaw = faceYaw(f); // normalize ซ้าย/ขวา ให้เท่ากันทุกเครื่อง (iOS กลับด้าน)
      final pitch = f.headEulerAngleX ?? 0;
      final eyesOpen = (f.leftEyeOpenProbability ?? 1) > _eyeOpen && (f.rightEyeOpenProbability ?? 1) > _eyeOpen;
      final vel = (yaw - _lastYaw).abs() + (pitch - _lastPitch).abs();
      _lastYaw = yaw;
      _lastPitch = pitch;
      final still = vel < _still;
      final pose = _poses[poseIndex.value];
      final inZone = pose.ok(yaw, pitch) && eyesOpen;
      faceInZone.value = inZone && still;
      if (inZone && still) {
        _holdCount++;
        instruction.value = '${pose.instruction} · นิ่งไว้…';
      } else {
        _holdCount = 0;
        instruction.value = pose.instruction + (inZone && !still ? ' · หยุดนิ่ง' : (!eyesOpen ? ' · ลืมตา' : ''));
      }
      if (_holdCount >= _hold) {
        await _captureCurrentAngle();
      }
    } catch (_) {
      // เฟรมพลาดเฟรมเดียวไม่เป็นไร
    } finally {
      _frameBusy = false;
    }
  }

  /// จับมุมปัจจุบัน: หยุด stream → takePicture → เก็บ → ถ่ายมุมต่อไป / จบ
  Future<void> _captureCurrentAngle() async {
    _enrollActive = false; // กันจับซ้ำระหว่าง takePicture
    _holdCount = 0;
    faceInZone.value = false;
    try {
      if (camera!.value.isStreamingImages) await camera!.stopImageStream();
      final shot = await camera!.takePicture();
      SystemSound.play(SystemSoundType.click); // เสียงชัตเตอร์ = เก็บมุมนี้แล้ว
      captured.add(await _compress(await shot.readAsBytes()));
      poseIndex.value++;
      if (poseIndex.value >= _poses.length) {
        await finishRegister();
      } else {
        _lastYaw = 999;
        _lastPitch = 999;
        await _startEnrollStream(); // มุมต่อไป
      }
    } catch (e) {
      message.value = 'จับภาพไม่สำเร็จ: $e';
      await _startEnrollStream();
    }
  }

  /// บันทึก — append=ต่อ subject เดิม / new=สร้าง subject ใหม่
  Future<void> finishRegister() async {
    if (empId.isEmpty) {
      message.value = 'ไม่พบข้อมูลพนักงาน (กรุณา login ใหม่)';
      return;
    }
    if (captured.isEmpty) {
      message.value = 'ยังไม่มีรูป';
      return;
    }
    _enrollActive = false;
    _remindTimer?.cancel();
    busy.value = true;
    message.value = 'กำลังบันทึก...';
    try {
      if (camera != null && camera!.value.isStreamingImages) await camera!.stopImageStream();
      final resp = await _api.register(
        metadata: {'emp_id': empId, 'name': staffName},
        images: List<String>.from(captured),
        subjectId: _append ? _targetSubjectId : null,
      );
      lastSubjectId = resp.subjectId;
      await camera?.dispose();
      camera = null;
      message.value = _append
          ? 'เพิ่มใบหน้าแล้ว (+${resp.faceIds.length} รูป)'
          : 'ลงทะเบียนใบหน้าแล้ว ${resp.faceIds.length} รูป';
      step.value = RegStep.done;
      _audio.play('audios/face_direction_success.mp3'); // เสียงแจ้งลงทะเบียนสำเร็จ
    } catch (e) {
      message.value = 'บันทึกไม่สำเร็จ: $e';
    } finally {
      busy.value = false;
    }
  }

  Future<String> _compress(List<int> bytes) async {
    final d = img.decodeImage(Uint8List.fromList(bytes));
    if (d == null) return base64Encode(bytes);
    final r = d.width > 480 ? img.copyResize(d, width: 480) : d;
    return base64Encode(img.encodeJpg(r, quality: 80));
  }

  /// done → "ถ่ายเพิ่ม": ต่อ template ให้ subject ที่เพิ่งลง (ไม่สร้างซ้ำ)
  Future<void> reset() async {
    _startCapture(append: lastSubjectId != null, subjectId: lastSubjectId);
  }

  // ---------- ML Kit: CameraImage → InputImage (replicate จากจอ scan) ----------
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
        bytesPerRow: frame.width,
      ),
    );
  }

  Uint8List? _toNv21(CameraImage frame) {
    if (frame.planes.length < 3) {
      final p = frame.planes.first;
      if (p.bytes.length == frame.width * frame.height * 3 ~/ 2) return p.bytes;
      return null;
    }
    final w = frame.width, h = frame.height;
    final out = Uint8List(w * h + (w ~/ 2) * (h ~/ 2) * 2);
    final yP = frame.planes[0], uP = frame.planes[1], vP = frame.planes[2];
    int o = 0;
    final yStride = yP.bytesPerRow;
    for (int row = 0; row < h; row++) {
      final base = row * yStride;
      for (int col = 0; col < w; col++) {
        out[o++] = yP.bytes[base + col];
      }
    }
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

  @override
  void onClose() {
    _enrollActive = false;
    _remindTimer?.cancel();
    camera?.dispose();
    _detector.close();
    super.onClose();
  }
}
