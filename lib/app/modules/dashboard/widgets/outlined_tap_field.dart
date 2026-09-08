import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../widgets/tappable.dart';
import '../dash_theme.dart';

/// ขอบช่องกรอกทรง outlined — มุม 12 หนาขึ้นตอนโฟกัส/ผิดพลาด
OutlineInputBorder dashFieldBorder(Color c, [double w = 1]) =>
    OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide(color: c, width: w),
    );

/// หน้าตาช่องกรอกกลางของฟอร์มขอแก้ไข — ใช้ทั้งช่องที่แตะเลือก ([OutlinedTapField])
/// และ TextField จริงที่พิมพ์ได้ ทุกช่องในฟอร์มเดียวกันจึงเป็นทรงเดียวกันเป๊ะ
InputDecoration dashFieldDecoration({
  required String label,
  String? hint,
  bool bad = false,
  Widget? suffix,
}) {
  final labelStyle = Dash.body(
    size: 13,
    weight: FontWeight.w600,
    color: bad ? Dash.bad : Dash.muted,
  );
  return InputDecoration(
    labelText: label,
    // ป้ายลอยขึ้นขอบเสมอ — ช่องมีค่าหรือไม่ก็ตาม ป้ายต้องไม่ทับค่า
    floatingLabelBehavior: FloatingLabelBehavior.always,
    labelStyle: labelStyle,
    floatingLabelStyle: labelStyle,
    hintText: hint,
    hintStyle: Dash.body(size: 14, weight: FontWeight.w400, color: Dash.faint),
    filled: true,
    fillColor: Dash.card,
    contentPadding: const EdgeInsets.fromLTRB(16, 12, 12, 12),
    border: dashFieldBorder(bad ? Dash.bad : Dash.hairline),
    enabledBorder: dashFieldBorder(bad ? Dash.bad : Dash.hairline),
    focusedBorder: dashFieldBorder(Dash.accentActive, 1.5),
    errorBorder: dashFieldBorder(Dash.bad, 1.5),
    focusedErrorBorder: dashFieldBorder(Dash.bad, 1.5),
    suffixIcon: suffix == null
        ? null
        : Padding(padding: const EdgeInsets.only(right: 12), child: suffix),
    suffixIconConstraints: BoxConstraints(
      minWidth: Dash.sp(26) + 12,
      minHeight: Dash.sp(26),
    ),
  );
}

/// ช่องกรอกทรง outlined text field ของ Material — แต่ค่าใส่ผ่านการแตะ ไม่ใช่พิมพ์
/// (ตัวเลือกเวลา / แผ่นเลือกสาเหตุ)
///
/// ใช้ [InputDecorator] ตรง ๆ จึงได้กรอบเว้ารับป้ายลอย + ข้อความ error/helper
/// ตามสเปก Material มาเลย ไม่ต้องวาดเอง และหน้าตาตรงกับ TextField จริงในฟอร์มเดียวกัน
class OutlinedTapField extends StatelessWidget {
  const OutlinedTapField({
    super.key,
    required this.label,
    required this.child,
    required this.onTap,
    this.status,
    this.statusColor,
    this.bad = false,
    this.trailing,
    this.contentHeight = 24,
  });

  /// ป้ายที่ลอยอยู่บนเส้นขอบ
  final String label;

  /// ค่าที่เลือกไว้ (หรือข้อความชวนกดตอนยังว่าง)
  final Widget child;
  final VoidCallback onTap;

  /// ป้ายสถานะมุมขวาบนเหนือช่อง — "ต้องระบุ" / "ระบุแล้ว"
  final String? status;
  final Color? statusColor;

  /// ยังกรอกไม่ครบ — ขอบและป้ายเป็นแดง
  final bool bad;

  /// ไอคอนสถานะมุมขวาในช่อง
  final Widget? trailing;

  /// ความสูงบรรทัดค่า — ตรึงไว้ ช่องจึงไม่ยุบ/ยืดตอนค่าเปลี่ยน
  final double contentHeight;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      if (status != null)
        FieldStatusLabel(status!, color: statusColor ?? Dash.muted),
      Tappable(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        splash: Dash.accent,
        child: InputDecorator(
          // ไม่ว่างเสมอ — ป้ายจะได้ลอยอยู่บนขอบ ไม่หล่นลงมาทับค่า
          isEmpty: false,
          decoration: dashFieldDecoration(
            label: label,
            bad: bad,
            suffix: trailing,
          ),
          child: SizedBox(
            height: Dash.box(contentHeight),
            child: Align(alignment: Alignment.centerLeft, child: child),
          ),
        ),
      ),
    ],
  );
}

/// ป้ายสถานะของช่อง — วางชิดขวาเหนือช่อง (ที่เดียวกับคำใบ้ "ไม่บังคับ" ของหัวข้ออื่น)
class FieldStatusLabel extends StatelessWidget {
  const FieldStatusLabel(this.text, {super.key, required this.color});

  final String text;
  final Color color;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Align(
      alignment: Alignment.centerRight,
      child: Text(
        text,
        style: Dash.body(size: 11.5, weight: FontWeight.w600, color: color),
      ),
    ),
  );
}

/// วงกลมสถานะมุมขวาในช่อง — ยังไม่กรอกเป็นส้มเตือน กรอกแล้วเป็นเขียวติ๊กถูก
class FieldStatusDot extends StatelessWidget {
  const FieldStatusDot({super.key, required this.done});

  final bool done;

  @override
  Widget build(BuildContext context) => Container(
    width: Dash.sp(26),
    height: Dash.sp(26),
    alignment: Alignment.center,
    // ยังไม่กรอก = ส้มเตือน ไม่ใช่เทา — เทากลืนไปกับช่องจนไม่เห็นว่าค้างอยู่
    decoration: BoxDecoration(
      color: done ? Dash.ok : Dash.warn,
      shape: BoxShape.circle,
    ),
    child: Icon(
      done ? PhosphorIconsBold.check : PhosphorIconsBold.exclamationMark,
      size: Dash.sp(15),
      color: Dash.on,
    ),
  );
}

/// ข้อความชวนกดตอนช่องยังว่าง — บางและเล็กกว่าค่าจริง
/// ไม่งั้นอ่านผ่าน ๆ นึกว่ามีค่าอยู่แล้ว
class FieldPlaceholder extends StatelessWidget {
  const FieldPlaceholder(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    maxLines: 1,
    style: Dash.body(size: 14, weight: FontWeight.w400, color: Dash.faint),
  );
}
