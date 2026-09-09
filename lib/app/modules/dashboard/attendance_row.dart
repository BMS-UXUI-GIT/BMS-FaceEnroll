/// ตัวช่วยอ่านแถวลงเวลา (Map จาก API/เดโม) — เวร เวลาตัวแทน ป้ายปัญหา
/// ใช้ร่วมกันทุกหน้าใน flow แดชบอร์ด · ข้อมูลยังไม่ส่งชื่อเวรมา จึงอนุมานจากช่วงเวลา
/// (เมื่อ my-attendance ส่งเวรที่คนเลือกตอนสแกนมาแล้ว แก้ที่ [shiftOfRow] ที่เดียว)
library;

import 'package:flutter/material.dart';

import 'dash_theme.dart';
import 'dashboard_controller.dart';
import 'widgets/web_badges.dart';

/// สีประจำสถานะของหนึ่งเวร — ใช้ร่วมกันทั้งแดชบอร์ดและหน้ารายการขอแก้ไข
Color dayMarkColor(DayMark m) => switch (m) {
  DayMark.ok => Dash.ok,
  DayMark.late => Dash.warn,
  DayMark.early => Dash.info,
  DayMark.bad => Dash.bad,
};

/// ชิป legend หนึ่งตัวคุมหนึ่งสถานะ — แปลงกลับให้วงกลม/ปฏิทินใช้ตัวกรองเดียวกับกราฟแท่ง
Series seriesOf(DayMark m) => switch (m) {
  DayMark.ok => Series.ok,
  DayMark.late => Series.late,
  DayMark.early => Series.early,
  DayMark.bad => Series.bad,
};

/// เวรนี้ยื่นคำขอแก้ไขได้ไหม — เกณฑ์เดียวกันทุกที่ในโฟลว์
/// (มาสาย/ออกก่อนไม่นับ เพราะเวลาที่เครื่องบันทึกถูกต้องอยู่แล้ว)
bool rowNeedsFix(Map<String, dynamic> r) =>
    rowNoIn(r) || rowNoOut(r) || r['out_area'] == true;

/// วันนี้ไม่มีเวลาเข้า — เกิดตอนลืมสแกนเข้า (มีแต่สแกนออก) ระบบเลยได้ครึ่งเดียว
bool rowNoIn(Map<String, dynamic> r) =>
    r['no_in'] == true || '${r['in'] ?? ''}'.isEmpty;

bool rowNoOut(Map<String, dynamic> r) => r['no_out'] == true;

/// เวรของแถว — ปกติดูจากเวลาเข้า ถ้าไม่มีเวลาเข้าให้เดาจากเวลาออกแทน
/// (ออกก่อนเที่ยง = เวรดึกที่ข้ามคืนมา · ออกบ่าย = เวรเช้า · ออกค่ำ = เวรบ่าย)
String shiftOfRow(Map<String, dynamic> r) {
  final inT = '${r['in'] ?? ''}';
  if (inT.isNotEmpty) return shiftName(inT);
  final outT = '${r['out'] ?? ''}';
  if (outT.isEmpty) return 'เวร';
  final h = int.tryParse(outT.split(':').first) ?? 16;
  if (h < 12) return 'เวรดึก';
  if (h < 18) return 'เวรเช้า';
  return 'เวรบ่าย';
}

/// เวลาตัวแทนของเวร — ใช้วาดฉากท้องฟ้า/ชิปเวรตอนแถวไม่มีเวลาเข้า
String shiftAnchor(Map<String, dynamic> r) {
  final inT = '${r['in'] ?? ''}';
  if (inT.isNotEmpty) return inT;
  return switch (shiftOfRow(r)) {
    'เวรบ่าย' => '16:00',
    'เวรดึก' => '23:00',
    _ => '08:00',
  };
}

/// ป้ายบอกว่าแถวนี้ข้อมูลขาดตรงไหน — เรียงตามลำดับเวลา เข้า → ออก → พื้นที่
/// [withLateEarly] = ต่อท้ายด้วยมาสาย/ออกก่อนด้วย (การ์ดวันนี้) — หน้าขอแก้ไขไม่ต้อง
/// เพราะสองอย่างนั้นไม่ใช่ข้อมูลขาด แค่ผิดเวลา
List<Widget> problemBadgesOf(
  Map<String, dynamic> r, {
  bool blur = false,
  bool withLateEarly = false,
}) => [
  if (rowNoIn(r))
    WebStatusBadge(kind: 'noin', label: 'ไม่มีเวลาเข้า', blur: blur),
  if (rowNoOut(r))
    WebStatusBadge(kind: 'leave', label: 'ไม่มีเวลาออก', blur: blur),
  if (r['out_area'] == true)
    WebStatusBadge(kind: 'outarea', label: 'นอกพื้นที่', blur: blur),
  if (withLateEarly && r['late'] == true)
    WebStatusBadge(kind: 'late', label: 'เข้าสาย', blur: blur),
  if (withLateEarly && r['early'] == true)
    WebStatusBadge(kind: 'early', label: 'ออกก่อนเวลา', blur: blur),
];

String shiftName(String hhmm) {
  final h = int.tryParse(hhmm.split(':').first) ?? 8;
  if (h < 12) return 'เวรเช้า';
  if (h < 18) return 'เวรบ่าย';
  return 'เวรดึก';
}

/// สีอ่อนประจำเวร — ใช้ไล่เฉดมุมขวาบนการ์ดและเป็นพื้นฉากที่วาดเอง
Color shiftTint(String hhmm) {
  final h = int.tryParse(hhmm.split(':').first) ?? 8;
  if (h < 12) return const Color(0xFFCFE3FB); // เช้า ฟ้า
  if (h < 18) return const Color(0xFFFFE3BE); // บ่าย ครีม
  return const Color(0xFFD6CCE6); // ดึก ม่วง
}

/// สีชิปเวร — ชุดเดียวกับ web app FaceEnroll (.chip เช้า/บ่าย/ดึก)
/// เช้า ฟ้าอ่อน · บ่าย ครีม · ดึก เทาน้ำเงิน — พื้นอ่อน ตัวอักษรเข้ม ไม่ใช่พื้นทึบตัวขาว
(Color, Color) shiftChipColors(String hhmm) {
  final h = int.tryParse(hhmm.split(':').first) ?? 8;
  if (h < 12) return (const Color(0xFFD7E8F6), const Color(0xFF404D8C));
  if (h < 18) return (const Color(0xFFFFF0D9), const Color(0xFF8C591A));
  return (const Color(0xFFD4DDE9), const Color(0xFF263873));
}
