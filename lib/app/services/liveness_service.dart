import 'package:get/get.dart';
import 'face_detection.dart';

import '../modules/face_scan/liveness/face_liveness_action.dart';
import 'face_geometry.dart';
import 'settings_service.dart';

/// ตรวจว่าใบหน้า "ทำท่า liveness" สำเร็จไหม — ค่าเกณฑ์มาจาก policy กลาง
/// (admin ตั้งจาก dashboard; default = ค่าระบบเดิมเป๊ะ)
///
/// ⚠️ ต้องเปิด enableClassification ใน FaceDetectorOptions ไม่งั้น
/// smilingProbability / eyeOpenProbability จะเป็น null (กระพริบ/ยิ้มใช้ไม่ได้)
///
/// ⚠️ มุมหัน yaw ของกล้องหน้ากลับด้านบน iOS — normalize ที่ faceYaw() แล้ว
/// (หันซ้าย = บวก, หันขวา = ลบ ทุกเครื่อง) · pitch (เงยหน้า) ยังใช้ค่าตรงตามเดิม
class LivenessService {
  SettingsService get _s => Get.find<SettingsService>();
  double get _yawTurn => _s.livenessYawDeg.value; // หันซ้าย/ขวา (headEulerAngleY)
  double get _pitchUp => _s.livenessPitchDeg.value; // เงยหน้า (headEulerAngleX) — calibrate
  double get _eyeOpen => _s.livenessEyeOpen.value; // ตาเปิด
  static const double _eyeClosed = 0.3; // ตาปิด (คงที่ — คู่กับเกณฑ์ตาเปิด)
  double get _smile => _s.livenessSmile.value; // ยิ้ม

  bool isFacingLeft(Face f) => faceYaw(f) >= _yawTurn;
  bool isFacingRight(Face f) => faceYaw(f) <= -_yawTurn;
  bool isFacingUp(Face f) => (f.headEulerAngleX ?? 0) >= _pitchUp;

  bool areEyesOpen(Face f) {
    final l = f.leftEyeOpenProbability, r = f.rightEyeOpenProbability;
    if (l == null || r == null) return false;
    return l > _eyeOpen && r > _eyeOpen;
  }

  bool areEyesClosed(Face f) {
    final l = f.leftEyeOpenProbability, r = f.rightEyeOpenProbability;
    if (l == null || r == null) return false;
    return l < _eyeClosed && r < _eyeClosed;
  }

  bool isSmiling(Face f) {
    final s = f.smilingProbability;
    if (s == null) return false;
    return s >= _smile;
  }

  /// ตรวจท่าเดียว (ยกเว้น blink ที่เป็น 2 จังหวะ — จัดการใน controller)
  bool passesSimple(FaceLivenessAction action, Face f) => switch (action) {
    FaceLivenessAction.left => isFacingLeft(f),
    FaceLivenessAction.right => isFacingRight(f),
    FaceLivenessAction.up => isFacingUp(f),
    FaceLivenessAction.smile => isSmiling(f),
    FaceLivenessAction.blink => false, // 2 จังหวะ — เช็คแยกใน controller
  };
}
