import 'package:flutter/foundation.dart' show TargetPlatform, defaultTargetPlatform, kIsWeb;

import 'face_detection.dart';

/// yaw ของใบหน้าที่ normalize ข้ามแพลตฟอร์มแล้ว — หันซ้าย = ค่าบวก, หันขวา = ค่าลบ (เท่ากันทุกเครื่อง)
///
/// iOS กล้องหน้าคืน headEulerAngleY กลับเครื่องหมายกับ Android (ภาพ mirror คนละแบบ)
/// ทำให้ "หันซ้าย/ขวา" สลับกัน — คูณ -1 บน iOS ให้เหลือ convention เดียวทั้งลงทะเบียน/liveness/สแกน
double faceYaw(Face f) {
  final y = f.headEulerAngleY ?? 0;
  return isIOSDevice ? -y : y;
}

/// iOS ของจริงเท่านั้น — เว็บไม่นับแม้เปิดบน iPhone (เดโมไม่ได้แตะกล้อง native และ
/// ค่ามุมจำลองก็ normalize มาแล้ว) ใช้แทน dart:io Platform.isIOS ที่ build เว็บไม่ได้
bool get isIOSDevice => !kIsWeb && defaultTargetPlatform == TargetPlatform.iOS;
