import 'dart:ui' show Rect, Size;

import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

import 'demo_face_script.dart';

export 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

/// ใบหน้าจำลอง — ฝั่งมือถือไม่ได้ใช้ (มีไว้ให้ signature ตรงกับฝั่งเว็บเท่านั้น)
Face demoFace(Size frame) {
  final p = DemoFacePose.now();
  final w = frame.width * 0.7, h = frame.height * 0.7;
  return Face(
    boundingBox: Rect.fromLTWH(
      (frame.width - w) / 2,
      (frame.height - h) / 2,
      w,
      h,
    ),
    landmarks: const {},
    contours: const {},
    headEulerAngleX: p.pitch,
    headEulerAngleY: p.yaw,
    headEulerAngleZ: 0,
    leftEyeOpenProbability: p.eyeOpen,
    rightEyeOpenProbability: p.eyeOpen,
    smilingProbability: p.smile,
  );
}
