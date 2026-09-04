import 'package:flutter/foundation.dart' show kIsWeb;

/// build เดโม = เว็บ prototype (GitHub Pages) เท่านั้น
///
/// บนเว็บไม่มีทั้ง backend (CORS + ไม่มี API key) และ ML Kit (ไม่รองรับ web)
/// เปิดโหมดนี้แล้วทุกอย่างตอบจากข้อมูลจำลองในเครื่อง ไม่มี request ออกนอกเลย
/// build มือถือของจริง kIsWeb = false → เส้นทางเดิมทั้งหมด ไม่มีอะไรเปลี่ยน
const bool kDemoBuild = kIsWeb;
