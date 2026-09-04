import 'dart:io' show Platform;

import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

/// yaw ของใบหน้าที่ normalize ข้ามแพลตฟอร์มแล้ว — หันซ้าย = ค่าบวก, หันขวา = ค่าลบ (เท่ากันทุกเครื่อง)
///
/// iOS กล้องหน้าคืน headEulerAngleY กลับเครื่องหมายกับ Android (ภาพ mirror คนละแบบ)
/// ทำให้ "หันซ้าย/ขวา" สลับกัน — คูณ -1 บน iOS ให้เหลือ convention เดียวทั้งลงทะเบียน/liveness/สแกน
double faceYaw(Face f) {
  final y = f.headEulerAngleY ?? 0;
  return Platform.isIOS ? -y : y;
}
