import 'dart:typed_data';
import 'dart:ui' show Rect, Size;

import 'demo_face_script.dart';

/// ตัวแทน API ของ google_mlkit_face_detection สำหรับ build เว็บ
///
/// ML Kit เป็น native plugin (แถม google_mlkit_commons import dart:io) จึงใช้บนเว็บไม่ได้เลย
/// ไฟล์นี้ประกาศชนิดชื่อเดียวกันเท่าที่แอปเรียกใช้ แล้วให้ [FaceDetector] คืน "ใบหน้าจำลอง"
/// ที่วนทำท่าตามสคริปต์ — เดโมบนเว็บจึงกดผ่าน liveness/ลงทะเบียนได้ทั้งเส้น
/// ไม่มีการตรวจใบหน้าจริง และไม่มีภาพใดถูกวิเคราะห์

enum FaceDetectorMode { fast, accurate }

enum InputImageFormat { nv21, yv12, yuv_420_888, yuv420, bgra8888 }

enum InputImageRotation {
  rotation0deg,
  rotation90deg,
  rotation180deg,
  rotation270deg,
}

abstract class InputImageRotationValue {
  static InputImageRotation? fromRawValue(int rawValue) => switch (rawValue) {
    0 => InputImageRotation.rotation0deg,
    90 => InputImageRotation.rotation90deg,
    180 => InputImageRotation.rotation180deg,
    270 => InputImageRotation.rotation270deg,
    _ => null,
  };
}

class InputImageMetadata {
  InputImageMetadata({
    required this.size,
    required this.rotation,
    required this.format,
    required this.bytesPerRow,
  });

  final Size size;
  final InputImageRotation rotation;
  final InputImageFormat format;
  final int bytesPerRow;
}

class InputImage {
  InputImage._(this.metadata);

  final InputImageMetadata metadata;

  /// bytes ถูกทิ้งทันที — ฝั่งเว็บไม่ได้อ่านภาพเลย เก็บไว้แค่ขนาดเฟรม
  factory InputImage.fromBytes({
    required Uint8List bytes,
    required InputImageMetadata metadata,
  }) => InputImage._(metadata);
}

class FaceDetectorOptions {
  FaceDetectorOptions({
    this.enableClassification = false,
    this.enableLandmarks = false,
    this.enableContours = false,
    this.enableTracking = false,
    this.minFaceSize = 0.1,
    this.performanceMode = FaceDetectorMode.fast,
  });

  final bool enableClassification;
  final bool enableLandmarks;
  final bool enableContours;
  final bool enableTracking;
  final double minFaceSize;
  final FaceDetectorMode performanceMode;
}

class Face {
  Face({
    required this.boundingBox,
    this.headEulerAngleX,
    this.headEulerAngleY,
    this.headEulerAngleZ,
    this.leftEyeOpenProbability,
    this.rightEyeOpenProbability,
    this.smilingProbability,
    this.trackingId,
  });

  final Rect boundingBox;
  final double? headEulerAngleX;
  final double? headEulerAngleY;
  final double? headEulerAngleZ;
  final double? leftEyeOpenProbability;
  final double? rightEyeOpenProbability;
  final double? smilingProbability;
  final int? trackingId;
}

class FaceDetector {
  FaceDetector({required this.options});

  final FaceDetectorOptions options;

  Future<List<Face>> processImage(InputImage inputImage) async => [
    demoFace(inputImage.metadata.size),
  ];

  Future<void> close() async {}
}

/// ใบหน้าจำลองกลางเฟรม ใหญ่พอผ่านเกณฑ์ minFaceWidthRatio เสมอ
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
    headEulerAngleX: p.pitch,
    headEulerAngleY: p.yaw,
    headEulerAngleZ: 0,
    leftEyeOpenProbability: p.eyeOpen,
    rightEyeOpenProbability: p.eyeOpen,
    smilingProbability: p.smile,
  );
}
