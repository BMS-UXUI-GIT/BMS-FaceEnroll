/// ทางเข้าเดียวของ ML Kit face detection
///
/// มือถือ = ของจริง · เว็บ = ตัวจำลอง (ML Kit ไม่มี web ทั้ง plugin และ dart:io ใน commons)
/// โค้ดที่เรียกใช้ import ไฟล์นี้แทน package ตรง ๆ จะได้ build ได้ทุกแพลตฟอร์ม
library;

export 'face_detection_mlkit.dart'
    if (dart.library.js_interop) 'face_detection_web.dart';
