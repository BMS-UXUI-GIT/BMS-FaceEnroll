import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';

import '../../routes/app_pages.dart';
import 'attendance_row.dart';
import 'dash_theme.dart';
import 'widgets/dash_buttons.dart';
import 'widgets/dash_page.dart';
import 'widgets/dash_page_bar.dart';
import 'widgets/dash_text.dart';
import 'widgets/fix_day_card.dart';
import 'widgets/fix_reason_picker.dart';
import 'widgets/outlined_tap_field.dart';
import 'widgets/photo_attach_row.dart';
import 'widgets/time_field.dart';

/// หน้าฟอร์มขอแก้ไขเวลาของหนึ่งวัน — เปิดจากรายการในหน้า "ต้องขอแก้ไข"
///
/// ⚠️ ต้นแบบ: กดส่งแล้วไม่ได้ยิงไปไหน (ยังไม่มี endpoint รับคำขอ)
/// ปิดหน้าแล้วคืน true ให้หน้ารายการย้ายวันนั้นไปแท็บ "ส่งแล้ว" — ต่อ API ที่ _submit()
class FixRequestFormView extends StatefulWidget {
  const FixRequestFormView({super.key});

  @override
  State<FixRequestFormView> createState() => _FixRequestFormViewState();
}

class _FixRequestFormViewState extends State<FixRequestFormView> {
  static const _shifts = ['เวรเช้า', 'เวรบ่าย', 'เวรดึก'];
  static const _maxPhotos = 3;

  late final Map<String, dynamic> _row =
      (Get.arguments as Map?)?.cast<String, dynamic>() ?? const {};

  late String _shift;
  late TimeOfDay? _in;
  late TimeOfDay? _out;

  /// สาเหตุเลือกได้หลายอัน — วันเดียวติดสองเรื่อง (นอกพื้นที่ + ลืมออก) ส่งเป็นคำขอเดียว
  final Set<String> _picked = {};
  final _note = TextEditingController();

  /// รูปประกอบ — เก็บเป็น bytes ไม่ใช่ path เพราะเว็บเดโมอ่านไฟล์จากดิสก์ไม่ได้
  final List<Uint8List> _photos = [];
  bool _pickingPhoto = false;

  bool get _noOut => rowNoOut(_row);
  bool get _noIn => rowNoIn(_row);
  bool get _outArea => _row['out_area'] == true;
  bool get _ready => _in != null && _out != null && _picked.isNotEmpty;

  /// สาเหตุที่ขัดกับข้อมูลที่เครื่องบันทึก — มีเวลาเข้าอยู่แล้วก็เลือก "ลืมสแกนเข้า" ไม่ได้
  /// ยังขึ้นในลิสต์อยู่แต่กดไม่ได้ พร้อมบอกเหตุผล — หายไปเฉย ๆ คนหาไม่เจอแล้วงงกว่า
  String? _reasonBlocked(String r) => switch (r) {
    'ลืมสแกนเข้า' when !_noIn => 'มีเวลาเข้าแล้ว',
    'ลืมสแกนออก' when !_noOut => 'มีเวลาออกแล้ว',
    _ => null,
  };

  @override
  void initState() {
    super.initState();
    // ไม่มีเวลาเข้าก็ยังเดาเวรได้จากเวลาออก
    _shift = shiftOfRow(_row);
    if (!_shifts.contains(_shift)) _shift = _shifts.first;
    _in = _parse('${_row['in'] ?? ''}');
    _out = _parse('${_row['out'] ?? ''}');
    // ไม่ติ๊กสาเหตุให้ล่วงหน้า — ระบบเดาแทนคนไม่ได้ว่าวันนั้นเกิดอะไรขึ้นจริง
    // (ป้ายบนการ์ดบอกอยู่แล้วว่าข้อมูลขาดตรงไหน คนกรอกเป็นคนเลือกเหตุผลเอง)
  }

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  static TimeOfDay? _parse(String hhmm) {
    final p = hhmm.split(':');
    if (p.length != 2) return null;
    final h = int.tryParse(p[0]), m = int.tryParse(p[1]);
    if (h == null || m == null) return null;
    return TimeOfDay(hour: h, minute: m);
  }

  static String _fmt(TimeOfDay? t) => t == null
      ? '--:--'
      : '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  Future<void> _pickTime(bool isIn) async {
    final picked = await showTimePicker(
      context: context,
      initialTime: (isIn ? _in : _out) ?? const TimeOfDay(hour: 8, minute: 0),
      builder: (context, child) => MediaQuery(
        // นาฬิกาแบบเข็มกดยากบนจอเล็ก — เปิดเป็นช่องกรอกตัวเลขไปเลย
        data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked == null) return;
    setState(() => isIn ? _in = picked : _out = picked);
  }

  /// แนบรูป: ถ่ายใหม่หรือเลือกจากคลัง — ย่อฝั่งเครื่องก่อนเก็บ ไม่ให้กินหน่วยความจำ
  Future<void> _addPhoto() async {
    if (_pickingPhoto || _photos.length >= _maxPhotos) return;
    final src = await showPhotoSourceSheet(context);
    if (src == null || !mounted) return;
    setState(() => _pickingPhoto = true);
    try {
      final x = await ImagePicker().pickImage(
        source: src,
        maxWidth: 1600,
        imageQuality: 80,
      );
      if (x == null) return;
      final bytes = await x.readAsBytes();
      if (!mounted) return;
      setState(() => _photos.add(bytes));
    } catch (e) {
      if (!mounted) return;
      Get.snackbar(
        'แนบรูปไม่สำเร็จ',
        '$e',
        snackPosition: SnackPosition.BOTTOM,
        margin: const EdgeInsets.all(16),
        borderRadius: 16,
        backgroundColor: Dash.card,
        colorText: Dash.ink,
      );
    } finally {
      if (mounted) setState(() => _pickingPhoto = false);
    }
  }

  /// สรุปว่าคำขอนี้ "ยืนยัน" หรือ "ระบุ" เวลาไหน — นอกพื้นที่คือขอให้รับรองเวลาเดิม ไม่ใช่แก้
  String get _summary {
    final inS = _noIn
        ? 'ระบุเวลาเข้า ${_fmt(_in)} น.'
        : (_outArea && _parse('${_row['in'] ?? ''}') == _in
              ? 'ยืนยันเวลาเข้า ${_fmt(_in)} น.'
              : 'เวลาเข้า ${_fmt(_in)} น.');
    final outS = _noOut
        ? 'ระบุเวลาออก ${_fmt(_out)} น.'
        : 'เวลาออก ${_fmt(_out)} น.';
    return '$inS · $outS · ${_picked.join(', ')}';
  }

  /// กด "ตรวจสอบ" → ไปหน้าตรวจสอบก่อน ยืนยันที่นั่นแล้วค่อยปิดฟอร์มพร้อมผล true
  Future<void> _submit() async {
    if (!_ready) return;
    final ok = await Get.toNamed<Object?>(
      Routes.fixRequestReview,
      arguments: {
        'row': _row,
        'shift': _shift,
        'in': _fmt(_in),
        'out': _fmt(_out),
        'reasons': _picked.toList(),
        'note': _note.text.trim(),
        'photos': _photos,
        'summary': _summary,
      },
    );
    // ใช้ Navigator ตรง ๆ — Get.back() ตอน snackbar ของหน้าตรวจสอบยังโชว์อยู่จะไปปิด snackbar แทน
    if (ok == true && mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    return DashPage(
      // แตะที่ว่างตรงไหนก็ปิดคีย์บอร์ด — ช่องหมายเหตุเป็นหลายบรรทัด ปุ่ม return จึงขึ้นบรรทัดใหม่
      builder: (context) => GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        behavior: HitTestBehavior.translucent,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _header(context),
            Expanded(
              child: SingleChildScrollView(
                // ลากเลื่อนหน้าก็ปิดคีย์บอร์ดเหมือนกัน
                keyboardDismissBehavior:
                    ScrollViewKeyboardDismissBehavior.onDrag,
                // ไม่มีแถบปุ่มล่างแล้ว — เว้นขอบล่างเผื่อ gesture bar เอง
                padding: EdgeInsets.fromLTRB(
                  16,
                  20,
                  16,
                  24 + MediaQuery.viewPaddingOf(context).bottom,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SectionLabel('เวร'),
                    const SizedBox(height: 10),
                    // ระบบยังไม่ผูกกับตารางเวร — คนสแกนเป็นคนเลือกเวรเอง เลือกผิดได้
                    // จึงต้องแก้ได้ในคำขอนี้ ไม่ใช่ค่าที่ตายตัวเหมือนเวลาที่เครื่องบันทึก
                    Row(
                      children: [
                        for (final v in _shifts) ...[
                          if (v != _shifts.first) const SizedBox(width: 8),
                          Expanded(
                            child: PillChoice(
                              label: v,
                              on: _shift == v,
                              onTap: () => setState(() => _shift = v),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 22),
                    ..._timeSection(),
                    SectionLabel('สาเหตุ'),
                    const SizedBox(height: 8),
                    ReasonField(
                      picked: _picked,
                      onTap: () => showReasonSheet(
                        context,
                        picked: _picked,
                        blockedOf: _reasonBlocked,
                        onChanged: () => setState(() {}),
                      ),
                    ),
                    const SizedBox(height: 14),
                    FieldStatusLabel('ไม่บังคับ', color: Dash.muted),
                    TextField(
                      controller: _note,
                      maxLines: 3,
                      minLines: 1,
                      // ปุ่มมุมคีย์บอร์ดเป็น "เสร็จ" — กดแล้วปิดคีย์บอร์ดได้เลย
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => FocusScope.of(context).unfocus(),
                      style: Dash.body(size: 14, color: Dash.ink),
                      // ทรงเดียวกับช่องเวลา/ช่องสาเหตุ — ช่องนี้ไม่บังคับ จึงไม่มีสถานะแดง
                      decoration: dashFieldDecoration(
                        label: 'รายละเอียดเพิ่มเติม',
                        hint:
                            'เช่น เครื่องสแกนขัดข้อง ต้องไปติดต่อหน่วยงานอื่น',
                      ),
                    ),
                    const SizedBox(height: 22),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        SectionLabel('รูปประกอบ'),
                        const Spacer(),
                        Text(
                          'ไม่บังคับ · สูงสุด $_maxPhotos รูป',
                          style: Dash.body(size: 11.5, color: Dash.muted),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    PhotoAttachRow(
                      photos: _photos,
                      maxPhotos: _maxPhotos,
                      busy: _pickingPhoto,
                      onRemove: (i) => setState(() => _photos.removeAt(i)),
                      onAdd: _addPhoto,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ---------- หัวเรื่อง: แถบสี + การ์ดสรุปวันที่ขอแก้ ----------

  Widget _header(BuildContext context) => Container(
    color: Dash.panel,
    padding: EdgeInsets.only(top: MediaQuery.viewPaddingOf(context).top),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        DashPageBar(
          title: 'ขอแก้ไขเวลา',
          // ปุ่มไปหน้าตรวจสอบ มุมขวาบน — จางลงตอนยังกรอกไม่ครบ
          trailing: PanelPillButton(
            label: 'ตรวจสอบ',
            enabled: _ready,
            onTap: _submit,
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
          child: _dayCard(),
        ),
      ],
    ),
  );

  /// การ์ดวันที่ขอแก้ไข — ตัวการ์ดอยู่ใน [FixDayCard] ใช้ร่วมกับหน้าตรวจสอบ
  Widget _dayCard() {
    final inT = '${_row['in'] ?? ''}';
    final outT = '${_row['out'] ?? ''}';
    return FixDayCard(
      date: '${_row['date']}',
      // ผูกกับเวลาที่ระบบบันทึกไว้ ไม่ใช่ชิปเวรที่เลือก — การ์ดนี้คือ "ของเดิม" ที่กำลังขอแก้
      anchor: shiftAnchor(_row),
      badges: problemBadgesOf(_row, blur: true),
      badgeKey: 'old',
      inTime: inT,
      outTime: outT,
      // ช่องที่เป็นปัญหาเป็นสีแดง ช่องที่ค่าใช้ได้เป็นสีปกติ
      inColor: inT.isEmpty ? Dash.bad : (_outArea ? Dash.bad : Dash.ok),
      outColor: outT.isEmpty ? Dash.bad : Dash.ok,
    );
  }

  /// โชว์เฉพาะช่องเวลาที่ยังต้องระบุ — เวลาที่เครื่องบันทึกไว้ถูกแล้วอยู่บนการ์ดหัวหน้าอยู่แล้ว
  /// ช่องอ่านอย่างเดียวซ้ำของเดิมเปล่า ๆ และทำให้ดูเหมือนแก้ได้ทั้งที่แตะไม่ได้
  List<Widget> _timeSection() {
    final fields = <Widget>[
      if (_noIn)
        TimeField(
          label: 'เวลาเข้า',
          value: _in == null ? null : _fmt(_in),
          onTap: () => _pickTime(true),
        ),
      if (_noOut)
        TimeField(
          label: 'เวลาออก',
          value: _out == null ? null : _fmt(_out),
          onTap: () => _pickTime(false),
        ),
    ];
    // ไม่มีเวลาไหนขาด (มาสาย/ออกก่อน/นอกพื้นที่) — ขอรับรองเวลาเดิม ไม่ต้องมีช่องให้กรอก
    if (fields.isEmpty) return const [];
    return [
      SectionLabel('แก้ไขเวลา'),
      const SizedBox(height: 12),
      if (fields.length == 1)
        fields.first
      else
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: fields.first),
            const SizedBox(width: 12),
            Expanded(child: fields.last),
          ],
        ),
      const SizedBox(height: 22),
    ];
  }
}
