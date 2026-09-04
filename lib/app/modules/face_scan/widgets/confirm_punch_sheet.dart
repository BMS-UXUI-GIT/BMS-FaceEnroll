import 'dart:async';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../widgets/tappable.dart';

import '../../../models/face_template_model.dart';
import '../../../theme/nexus.dart';

/// Bottom sheet ยืนยันก่อนลงเวลา (ธีม NEXUS ตามดีไซน์) — เลือก เข้า/ออก + เวร (radio) แล้วยืนยัน
/// คืนค่า: {'confirmed': true, 'emp_shift_id': int?, 'enroll_type': 2|3} / null เมื่อยกเลิก/หมดเวลา
class ConfirmPunchSheet extends StatefulWidget {
  const ConfirmPunchSheet({
    super.key,
    required this.person,
    this.shifts = const [],
    this.suggest = 'in',
    this.smileHint = false,
    this.matchedAt,
    this.place,
    this.countdownSeconds = 12,
    this.onPicked,
  });

  final MatchResult person;
  final List<EmpShift> shifts;
  final String suggest; // 'in' | 'out' — default ของ toggle
  final bool smileHint;

  /// บอกค่าที่เลือกล่าสุดออกไปทุกครั้งที่เปลี่ยน — โหมดยิ้มยืนยันปิด sheet เองจากข้างนอก
  /// เลยต้องรู้ค่าปัจจุบัน ไม่งั้นจะส่งค่าตั้งต้นแทนสิ่งที่ผู้ใช้กด
  final void Function(int? shiftId, int type)? onPicked;
  final String? matchedAt; // เวลา server (ISO) — fallback เวลาเครื่อง
  final String? place; // ชื่อจุดลงเวลาที่ยืนอยู่ (จาก geofence) — ให้พนักงานเห็นด้วยตาว่าลงที่จุดไหน
  final int countdownSeconds;

  @override
  State<ConfirmPunchSheet> createState() => _ConfirmPunchSheetState();
}

class _ConfirmPunchSheetState extends State<ConfirmPunchSheet> {
  Timer? _timer;
  late int _left;
  int? _shiftId;
  late int _type; // 2 = เข้างาน, 3 = ออกงาน

  @override
  void initState() {
    super.initState();
    _shiftId = widget.shifts.isNotEmpty ? widget.shifts.first.id : null;
    _type = widget.suggest == 'out' ? 3 : 2;
    _left = widget.countdownSeconds;
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      setState(() => _left--);
      if (_left <= 0) {
        t.cancel();
        Get.back(result: null);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _confirm() {
    _timer?.cancel();
    Get.back(result: {'confirmed': true, 'emp_shift_id': _shiftId, 'enroll_type': _type});
  }

  void _cancel() {
    _timer?.cancel();
    Get.back(result: null);
  }

  // "HH:mm:ss" หรือ ISO → "HH:mm"
  static String _hhmm(String? v) {
    if (v == null || v.isEmpty) return '';
    final i = v.indexOf('T');
    final t = i >= 0 ? v.substring(i + 1) : v;
    return t.length >= 5 ? t.substring(0, 5) : t;
  }

  String get _timeText {
    final fromServer = _hhmm(widget.matchedAt);
    if (fromServer.isNotEmpty) return fromServer;
    final n = DateTime.now();
    return '${n.hour.toString().padLeft(2, '0')}:${n.minute.toString().padLeft(2, '0')}';
  }

  String _initials(String name) {
    final n = name.trim();
    if (n.isEmpty) return '?';
    final parts = n.split(RegExp(r'\s+'));
    if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
      return parts[0].characters.first + parts[1].characters.first;
    }
    return n.characters.take(2).toString();
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.person;
    return ConstrainedBox(
      // จำกัดสูงสุด → เนื้อหากลางเลื่อนได้ถ้าจอไม่พอ ปุ่มยืนยันไม่หลุดล่าง
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.9),
      child: Container(
        // + viewInsets (คีย์บอร์ด) + padding.bottom (แถบ nav เครื่อง) → ปุ่มไม่จมใต้ nav bar
        padding: EdgeInsets.fromLTRB(
          22,
          14,
          22,
          16 + MediaQuery.of(context).viewInsets.bottom + MediaQuery.of(context).padding.bottom,
        ),
        decoration: const BoxDecoration(
          color: Nexus.sheet,
          borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
          border: Border(top: BorderSide(color: Nexus.line2)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 42,
              height: 4,
              margin: const EdgeInsets.only(bottom: 18),
              decoration: BoxDecoration(color: const Color(0xFF23415F), borderRadius: BorderRadius.circular(2)),
            ),
            // เนื้อหาเลื่อนได้เฉพาะเวลาจำเป็น (เวรเยอะ/จอเล็ก) — ปกติแสดงครบทุกเวรไม่ต้องเลื่อน
            Flexible(
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // identity + เวลา (ไม่โชว์ emp_id)
                    Row(
                      children: [
                        Container(
                          width: 52,
                          height: 52,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(15),
                            border: Border.all(color: const Color(0xFF2A4D72)),
                            gradient: const LinearGradient(colors: [Color(0xFF112233), Color(0xFF1B3A57)]),
                          ),
                          child: Text(
                            _initials(p.name ?? ''),
                            style: Nexus.tech(size: 18, weight: FontWeight.w700, color: Nexus.cyan),
                          ),
                        ),
                        const SizedBox(width: 13),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                p.name ?? 'พนักงาน',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Nexus.body(size: 15, weight: FontWeight.w600, color: Nexus.ink),
                              ),
                              const SizedBox(height: 2),
                              Text('ยืนยันการลงเวลา', style: Nexus.body(size: 11.5, color: Nexus.muted)),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('เวลา', style: Nexus.tech(size: 10, color: Nexus.dim, spacing: 1)),
                            Text(
                              _timeText,
                              style: Nexus.tech(size: 22, weight: FontWeight.w700, color: Nexus.cyan, spacing: 1),
                            ),
                          ],
                        ),
                      ],
                    ),
                    if (widget.place != null && widget.place!.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0x80081420),
                          borderRadius: BorderRadius.circular(13),
                          border: Border.all(color: Nexus.line2),
                        ),
                        child: Row(
                          children: [
                            const Icon(PhosphorIconsRegular.mapPin, size: 16, color: Nexus.cyan),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'ลงเวลาที่ ${widget.place}',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: Nexus.body(size: 12.5, color: Nexus.sub),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 18),
                    _sectionLabel('ประเภท · TYPE'),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _typeBtn(
                            label: 'เข้างาน',
                            icon: PhosphorIconsRegular.signIn,
                            value: 2,
                            color: Nexus.green,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: _typeBtn(
                            label: 'ออกงาน',
                            icon: PhosphorIconsRegular.signOut,
                            value: 3,
                            color: Nexus.amber,
                          ),
                        ),
                      ],
                    ),
                    // เวร (radio list) — แสดงครบทุกเวรเสมอ (ทั้งชุดเลื่อนรวมถ้าจอไม่พอ)
                    if (widget.shifts.isNotEmpty) ...[
                      const SizedBox(height: 18),
                      _sectionLabel('เลือกเวร · SHIFT'),
                      const SizedBox(height: 8),
                      ...widget.shifts.map(_shiftRow),
                    ],
                    if (widget.smileHint) ...[
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0x1419E3FF),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Nexus.line2),
                        ),
                        child: Text(
                          '🙂 ยิ้มเพื่อยืนยัน  ·  หันขวาเพื่อลองใหม่',
                          textAlign: TextAlign.center,
                          style: Nexus.body(size: 12.5, color: Nexus.sub),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            // actions — เปิด "ยิ้มยืนยัน" = ซ่อนปุ่มยืนยัน (ยิ้มเท่านั้นถึงบันทึก) เหลือแค่ยกเลิก
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: Tappable(
                    onTap: _cancel,
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 15),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFF2A4D72)),
                      ),
                      child: Text(
                        'ยกเลิก',
                        style: Nexus.tech(size: 14, weight: FontWeight.w700, color: Nexus.sub),
                      ),
                    ),
                  ),
                ),
                if (!widget.smileHint) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: Tappable(
                      onTap: _confirm,
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          gradient: Nexus.cyanGradient,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: Nexus.glow(0.35, 22),
                        ),
                        child: Text(
                          'ยืนยัน',
                          style: Nexus.tech(size: 14, weight: FontWeight.w700, color: Nexus.on),
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 8),
            Text('ปิดเองใน $_left วิ', style: Nexus.body(size: 11.5, color: Nexus.dim)),
          ],
        ),
      ),
    );
  }

  Widget _sectionLabel(String t) => Align(
    alignment: Alignment.centerLeft,
    child: Text(t, style: Nexus.tech(size: 10.5, color: Nexus.dim, spacing: 1.5)),
  );

  Widget _typeBtn({required String label, required IconData icon, required int value, required Color color}) {
    final sel = _type == value;
    return Tappable(
      onTap: () => setState(() {
        _type = value;
        widget.onPicked?.call(_shiftId, _type);
      }),
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: sel ? color.withValues(alpha: 0.14) : const Color(0x66142840),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: sel ? color : Nexus.line),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 18, color: sel ? color : Nexus.muted),
            const SizedBox(width: 8),
            Text(
              label,
              style: Nexus.tech(size: 14, weight: FontWeight.w700, color: sel ? color : Nexus.muted),
            ),
          ],
        ),
      ),
    );
  }

  Widget _shiftRow(EmpShift sh) {
    final sel = _shiftId == sh.id;
    final start = _hhmm(sh.timeStart);
    final end = _hhmm(sh.timeEnd);
    final range = (start.isNotEmpty && end.isNotEmpty) ? '$start–$end' : '';
    return Tappable(
      onTap: () => setState(() {
        _shiftId = sh.id;
        widget.onPicked?.call(_shiftId, _type);
      }),
      circle: true,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: const Color(0x80081420),
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: sel ? Nexus.cyan : Nexus.line2),
        ),
        child: Row(
          children: [
            Container(
              width: 18,
              height: 18,
              padding: EdgeInsets.all(sel ? 5 : 2),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: sel ? Nexus.cyan : const Color(0xFF2A4D72),
                boxShadow: sel ? [BoxShadow(color: Nexus.cyan.withValues(alpha: 0.6), blurRadius: 10)] : null,
              ),
              child: Container(
                decoration: BoxDecoration(shape: BoxShape.circle, color: sel ? Nexus.on : Colors.transparent),
              ),
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Text(sh.name.isEmpty ? 'เวร ${sh.id}' : sh.name, style: Nexus.body(size: 13.5, color: Nexus.ink)),
            ),
            if (range.isNotEmpty) Text(range, style: Nexus.tech(size: 11.5, color: Nexus.muted, spacing: 0.5)),
          ],
        ),
      ),
    );
  }
}
