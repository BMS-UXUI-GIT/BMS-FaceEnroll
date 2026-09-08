import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../widgets/tappable.dart';
import '../../routes/app_pages.dart';
import 'dash_theme.dart';
import 'attendance_row.dart';
import 'widgets/fix_day_card.dart';
import 'widgets/dash_page.dart';
import 'widgets/dash_page_bar.dart';
import 'widgets/dash_text.dart';
import 'widgets/dash_buttons.dart';
import 'widgets/time_field.dart';
import 'widgets/outlined_tap_field.dart';

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

  /// สาเหตุที่เจอบ่อย — กดเลือกแทนพิมพ์ (พิมพ์เองได้ในช่องล่าง)
  static const _reasons = [
    'ลืมสแกนเข้า',
    'ลืมสแกนออก',
    'สแกนนอกพื้นที่',
    'เครื่องสแกนขัดข้อง',
    'ปฏิบัติงานนอกสถานที่',
    'ควบเวรต่อ',
  ];

  /// สีประจำสาเหตุ — ชุดเดียวกับป้ายสถานะ: ขาดเวลาเข้า=ส้ม · ขาดเวลาออก=เขียวน้ำทะเล
  /// นอกพื้นที่=เทา · เครื่องขัดข้อง=แดง · นอกสถานที่=ม่วง · ควบเวร=น้ำเงิน
  static Color _reasonColor(String r) => switch (r) {
    'ลืมสแกนเข้า' => Dash.warn,
    'ลืมสแกนออก' => const Color(0xFF1E6E80),
    'สแกนนอกพื้นที่' => Dash.muted,
    'เครื่องสแกนขัดข้อง' => Dash.bad,
    'ปฏิบัติงานนอกสถานที่' => Dash.info,
    _ => Dash.accentActive,
  };

  /// ไอคอนประจำสาเหตุ — กวาดตาหาอันที่ต้องการได้เร็วกว่าอ่านข้อความเรียงกันหกบรรทัด
  static const _reasonIcons = {
    'ลืมสแกนเข้า': PhosphorIconsRegular.signIn,
    'ลืมสแกนออก': PhosphorIconsRegular.signOut,
    'สแกนนอกพื้นที่': PhosphorIconsRegular.mapPinLine,
    'เครื่องสแกนขัดข้อง': PhosphorIconsRegular.warningCircle,
    'ปฏิบัติงานนอกสถานที่': PhosphorIconsRegular.briefcase,
    'ควบเวรต่อ': PhosphorIconsRegular.arrowsClockwise,
  };

  late final Map<String, dynamic> _row =
      (Get.arguments as Map?)?.cast<String, dynamic>() ?? const {};

  /// สาเหตุที่ขัดกับข้อมูลที่เครื่องบันทึก — มีเวลาเข้าอยู่แล้วก็เลือก "ลืมสแกนเข้า" ไม่ได้
  /// ยังขึ้นในลิสต์อยู่แต่กดไม่ได้ พร้อมบอกเหตุผล — หายไปเฉย ๆ คนหาไม่เจอแล้วงงกว่า
  String? _reasonBlocked(String r) => switch (r) {
    'ลืมสแกนเข้า' when !_noIn => 'มีเวลาเข้าแล้ว',
    'ลืมสแกนออก' when !_noOut => 'มีเวลาออกแล้ว',
    _ => null,
  };

  late String _shift;
  late TimeOfDay? _in;
  late TimeOfDay? _out;

  /// สาเหตุเลือกได้หลายอัน — วันเดียวติดสองเรื่อง (นอกพื้นที่ + ลืมออก) ส่งเป็นคำขอเดียว
  final Set<String> _picked = {};
  final _note = TextEditingController();

  /// รูปประกอบ — เก็บเป็น bytes ไม่ใช่ path เพราะเว็บเดโมอ่านไฟล์จากดิสก์ไม่ได้
  final List<Uint8List> _photos = [];
  static const _maxPhotos = 3;
  bool _pickingPhoto = false;

  /// แนบรูป: ถ่ายใหม่หรือเลือกจากคลัง — ย่อฝั่งเครื่องก่อนเก็บ ไม่ให้กินหน่วยความจำ
  Future<void> _addPhoto(ImageSource src) async {
    if (_pickingPhoto || _photos.length >= _maxPhotos) return;
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

  /// เลือกว่าจะถ่ายใหม่หรือหยิบจากคลัง
  Future<void> _pickPhotoSource() async {
    FocusScope.of(context).unfocus();
    final src = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: Dash.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Dash.hairline,
                borderRadius: BorderRadius.circular(100),
              ),
            ),
            const SizedBox(height: 8),
            ListTile(
              leading: Icon(PhosphorIconsRegular.camera, color: Dash.accent),
              title: Text(
                'ถ่ายรูป',
                style: Dash.body(size: 14, color: Dash.ink),
              ),
              onTap: () => Navigator.pop(context, ImageSource.camera),
            ),
            ListTile(
              leading: Icon(PhosphorIconsRegular.images, color: Dash.accent),
              title: Text(
                'เลือกจากคลังรูป',
                style: Dash.body(size: 14, color: Dash.ink),
              ),
              onTap: () => Navigator.pop(context, ImageSource.gallery),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (src != null) await _addPhoto(src);
  }

  bool get _noOut => rowNoOut(_row);
  bool get _noIn => rowNoIn(_row);
  bool get _outArea => _row['out_area'] == true;

  @override
  void initState() {
    super.initState();
    final inT = '${_row['in'] ?? ''}';
    // ไม่มีเวลาเข้าก็ยังเดาเวรได้จากเวลาออก
    _shift = shiftOfRow(_row);
    if (!_shifts.contains(_shift)) _shift = _shifts.first;
    _in = _parse(inT);
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

  Future<void> _pick(bool isIn) async {
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

  bool get _ready => _in != null && _out != null && _picked.isNotEmpty;

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

  /// กด "ส่งคำขอ" → ไปหน้าตรวจสอบก่อน ยืนยันที่นั่นแล้วค่อยปิดฟอร์มพร้อมผล true
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
                            child: _choice(
                              v,
                              _shift == v,
                              () => setState(() => _shift = v),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 22),
                    ..._timeSection(),
                    SectionLabel('สาเหตุ'),
                    const SizedBox(height: 8),
                    _reasonCard(),
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
                    _photoRow(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ---------- สาเหตุ ----------

  /// ช่องสาเหตุ — ทรงเดียวกับช่องเวลา แตะแล้วเปิดแผ่นเลือกด้านล่าง
  /// (ชิปเรียงยาวกินพื้นที่ฟอร์มไปครึ่งจอ ย้ายไปอยู่ในแผ่นแทน)
  Widget _reasonCard() {
    final empty = _picked.isEmpty;
    return OutlinedTapField(
      label: 'สาเหตุที่ขอแก้ไข',
      onTap: _pickReasons,
      // ยังไม่เลือกเลย = ส่งไม่ได้ บอกไว้ก่อนจะไปเจอปุ่มที่กดไม่ได้
      bad: empty,
      trailing: FieldStatusDot(done: !empty),
      contentHeight: 30,
      child: empty
          ? const FieldPlaceholder('แตะเพื่อเลือกสาเหตุ')
          : _reasonStack(),
    );
  }

  /// สาเหตุที่เลือกไว้ — โชว์แค่วงไอคอนซ้อนเหลื่อมกันแบบกองรูปโปรไฟล์
  /// (ชื่อเต็มหกสาเหตุยาวเกินกว่าจะวางในการ์ดเดียว ดูรายชื่อได้ในแผ่นเลือก)
  Widget _reasonStack() {
    final picked = [
      for (final r in _reasons)
        if (_picked.contains(r)) r,
    ];
    final size = Dash.box(30);
    final step = size * 0.68; // เหลื่อมกันราวหนึ่งในสาม เห็นไอคอนครบทุกวง
    return SizedBox(
      height: size,
      width: step * (picked.length - 1) + size,
      child: Stack(
        children: [
          for (final (i, r) in picked.indexed)
            Positioned(
              left: i * step,
              child: Container(
                width: size,
                height: size,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: _reasonColor(r),
                  shape: BoxShape.circle,
                  // ขอบสีพื้นการ์ด — วงที่ซ้อนกันจึงไม่กลืนเป็นก้อนเดียว
                  border: Border.all(color: Dash.card, width: 2),
                ),
                child: Icon(
                  _reasonIcons[r] ?? PhosphorIconsRegular.note,
                  size: Dash.sp(16),
                  color: Dash.on,
                ),
              ),
            ),
        ],
      ),
    );
  }

  /// แผ่นเลือกสาเหตุ — ติ๊กได้หลายอัน เห็นผลทันทีทั้งในแผ่นและบนการ์ด
  Future<void> _pickReasons() async {
    FocusScope.of(context).unfocus();
    await showModalBottomSheet<void>(
      context: context,
      backgroundColor: Dash.card,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, setSheet) => SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 8),
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Dash.hairline,
                    borderRadius: BorderRadius.circular(100),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      'สาเหตุที่ขอแก้ไข',
                      style: Dash.tech(size: 16, weight: FontWeight.w700),
                    ),
                    const Spacer(),
                    Text(
                      'เลือกได้มากกว่า 1',
                      style: Dash.body(size: 11.5, color: Dash.muted),
                    ),
                  ],
                ),
              ),
              for (final r in _reasons)
                Builder(
                  builder: (_) {
                    final blocked = _reasonBlocked(r);
                    final off = blocked != null;
                    final on = _picked.contains(r);
                    return Opacity(
                      // จางทั้งแถว — เห็นว่ามีตัวเลือกนี้อยู่ แต่รู้ทันทีว่ากดไม่ได้
                      opacity: off ? 0.45 : 1,
                      child: Tappable(
                        // อัปเดตทั้งแผ่นและฟอร์มพร้อมกัน — ปิดแผ่นแล้วการ์ดต้องตรงเลย
                        onTap: off
                            ? null
                            : () {
                                setSheet(
                                  () => on ? _picked.remove(r) : _picked.add(r),
                                );
                                setState(() {});
                              },
                        borderRadius: BorderRadius.zero,
                        splash: Dash.accent,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 14,
                          ),
                          child: Row(
                            children: [
                              // ไอคอนประจำสาเหตุในวงกลมสีอ่อน — เข้มขึ้นเมื่อถูกเลือก
                              Container(
                                width: Dash.box(40),
                                height: Dash.box(40),
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: _reasonColor(
                                    r,
                                  ).withValues(alpha: on ? 1 : 0.14),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  _reasonIcons[r] ?? PhosphorIconsRegular.note,
                                  size: Dash.sp(20),
                                  color: on ? Dash.on : _reasonColor(r),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      r,
                                      style: Dash.body(
                                        size: 14.5,
                                        weight: on
                                            ? FontWeight.w700
                                            : FontWeight.w500,
                                        color: Dash.ink,
                                      ),
                                    ),
                                    // เหตุผลที่กดไม่ได้ — ไม่งั้นคนกดแล้วไม่เกิดอะไรจะงง
                                    if (off) ...[
                                      const SizedBox(height: 2),
                                      Text(
                                        blocked,
                                        style: Dash.body(
                                          size: 11.5,
                                          color: Dash.muted,
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
                              // ติ๊กอยู่ขวาสุด — ตาไล่ชื่อสาเหตุลงมาแล้วค่อยเช็คว่าอันไหนติ๊กไว้
                              Icon(
                                off
                                    ? PhosphorIconsRegular.prohibit
                                    : (on
                                          ? PhosphorIconsFill.checkCircle
                                          : PhosphorIconsRegular.circle),
                                size: Dash.sp(22),
                                color: on ? _reasonColor(r) : Dash.faint,
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                child: DashPillButton(
                  label: 'เสร็จสิ้น',
                  height: 48,
                  onTap: () => Navigator.pop(sheetContext),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ---------- รูปประกอบ ----------

  /// แถวรูปที่แนบ + ปุ่มเพิ่ม — แตะรูปเพื่อดูใหญ่ กากบาทมุมขวาบนเพื่อเอาออก
  Widget _photoRow() {
    final size = Dash.box(84);
    return SizedBox(
      height: size,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          for (final (i, p) in _photos.indexed) ...[
            _photoTile(p, i, size),
            const SizedBox(width: 8),
          ],
          if (_photos.length < _maxPhotos) _addPhotoTile(size),
        ],
      ),
    );
  }

  Widget _photoTile(Uint8List bytes, int i, double size) => SizedBox(
    width: size,
    height: size,
    child: Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned.fill(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Image.memory(
              bytes,
              fit: BoxFit.cover,
              // ถอดรหัสเท่าที่วางจริง — รูปจากกล้องใหญ่กว่านี้หลายเท่า
              cacheWidth: (size * Dash.dpr).round(),
            ),
          ),
        ),
        Positioned(
          top: -6,
          right: -6,
          child: Tappable(
            onTap: () => setState(() => _photos.removeAt(i)),
            circle: true,
            splash: Dash.bad,
            child: Container(
              width: 24,
              height: 24,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Dash.bad,
                shape: BoxShape.circle,
                border: Border.all(color: Dash.bg, width: 2),
              ),
              child: Icon(PhosphorIconsBold.x, size: 12, color: Dash.on),
            ),
          ),
        ),
      ],
    ),
  );

  Widget _addPhotoTile(double size) => Tappable(
    onTap: _pickingPhoto ? null : _pickPhotoSource,
    borderRadius: BorderRadius.circular(16),
    splash: Dash.accent,
    child: Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Dash.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Dash.hairline),
      ),
      child: _pickingPhoto
          ? SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Dash.accent,
              ),
            )
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  PhosphorIconsRegular.plus,
                  size: Dash.sp(20),
                  color: Dash.accent,
                ),
                const SizedBox(height: 4),
                Text(
                  'เพิ่มรูป',
                  style: Dash.body(size: 11.5, color: Dash.accent),
                ),
              ],
            ),
    ),
  );

  // ---------- หัวเรื่อง: แถบสี + การ์ดสรุปวันที่ขอแก้ ----------

  Widget _header(BuildContext context) {
    final inT = '${_row['in'] ?? ''}';
    final outT = '${_row['out'] ?? ''}';
    return Container(
      color: Dash.panel,
      padding: EdgeInsets.only(top: MediaQuery.viewPaddingOf(context).top),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          DashPageBar(title: 'ขอแก้ไขเวลา', trailing: _reviewButton()),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
            child: _dayCard(inT, outT),
          ),
        ],
      ),
    );
  }

  /// ปุ่มไปหน้าตรวจสอบ มุมขวาบน — จางลงตอนยังกรอกไม่ครบ
  Widget _reviewButton() => Tappable(
    onTap: _ready ? _submit : null,
    borderRadius: BorderRadius.circular(100),
    splash: Dash.onPanel(),
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: Dash.onPanel(_ready ? 1 : 0.18),
        borderRadius: BorderRadius.circular(100),
      ),
      child: Text(
        'ตรวจสอบ',
        style: Dash.tech(
          size: 13,
          weight: FontWeight.w700,
          color: _ready ? Dash.accentActive : Dash.onPanel(0.5),
        ),
      ),
    ),
  );

  /// การ์ดวันที่ขอแก้ไข — ตัวการ์ดอยู่ใน [FixDayCard] ใช้ร่วมกับหน้าตรวจสอบ
  Widget _dayCard(String inT, String outT) {
    // ผูกกับเวลาที่ระบบบันทึกไว้ ไม่ใช่ชิปเวรที่เลือก — การ์ดนี้คือ "ของเดิม" ที่กำลังขอแก้
    final anchor = shiftAnchor(_row);
    return FixDayCard(
      date: '${_row['date']}',
      anchor: anchor,
      badges: problemBadgesOf(_row, blur: true),
      badgeKey: 'old',
      inTime: inT,
      outTime: outT,
      // ช่องที่เป็นปัญหาเป็นสีแดง ช่องที่ค่าใช้ได้เป็นสีปกติ
      inColor: inT.isEmpty ? Dash.bad : (_outArea ? Dash.bad : Dash.ok),
      outColor: outT.isEmpty ? Dash.bad : Dash.ok,
    );
  }

  // ---------- ชิ้นส่วนฟอร์ม ----------

  /// โชว์เฉพาะช่องเวลาที่ยังต้องระบุ — เวลาที่เครื่องบันทึกไว้ถูกแล้วอยู่บนการ์ดหัวหน้าอยู่แล้ว
  /// ช่องอ่านอย่างเดียวซ้ำของเดิมเปล่า ๆ และทำให้ดูเหมือนแก้ได้ทั้งที่แตะไม่ได้
  List<Widget> _timeSection() {
    final fields = <Widget>[
      if (_noIn)
        TimeField(
          label: 'เวลาเข้า',
          value: _in == null ? null : _fmt(_in),
          onTap: () => _pick(true),
        ),
      if (_noOut)
        TimeField(
          label: 'เวลาออก',
          value: _out == null ? null : _fmt(_out),
          onTap: () => _pick(false),
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

  /// ชิปตัวเลือก — เลือกแล้วน้ำเงินทึบ ไม่เลือกเป็นกล่องขอบบาง
  Widget _choice(String label, bool on, VoidCallback onTap) => Tappable(
    onTap: onTap,
    borderRadius: BorderRadius.circular(100),
    splash: Dash.accent,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: on ? Dash.accentActive : Dash.card,
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: on ? Dash.accentActive : Dash.hairline),
      ),
      child: Text(
        label,
        style: Dash.body(
          size: 12.5,
          weight: FontWeight.w600,
          color: on ? Dash.on : Dash.sub,
        ),
      ),
    ),
  );
}
