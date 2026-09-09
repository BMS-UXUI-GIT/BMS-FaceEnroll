import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../widgets/tappable.dart';
import '../dash_theme.dart';
import 'dash_buttons.dart';
import 'outlined_tap_field.dart';

/// สาเหตุที่เจอบ่อย — กดเลือกแทนพิมพ์ (พิมพ์เองได้ในช่องหมายเหตุ)
const List<String> kFixReasons = [
  'ลืมสแกนเข้า',
  'ลืมสแกนออก',
  'สแกนนอกพื้นที่',
  'เครื่องสแกนขัดข้อง',
  'ปฏิบัติงานนอกสถานที่',
  'ควบเวรต่อ',
];

/// สีประจำสาเหตุ — ชุดเดียวกับป้ายสถานะ: ขาดเวลาเข้า=ส้ม · ขาดเวลาออก=เขียวน้ำทะเล
/// นอกพื้นที่=เทา · เครื่องขัดข้อง=แดง · นอกสถานที่=ม่วง · ควบเวร=น้ำเงิน
Color fixReasonColor(String r) => switch (r) {
  'ลืมสแกนเข้า' => Dash.warn,
  'ลืมสแกนออก' => const Color(0xFF1E6E80),
  'สแกนนอกพื้นที่' => Dash.muted,
  'เครื่องสแกนขัดข้อง' => Dash.bad,
  'ปฏิบัติงานนอกสถานที่' => Dash.info,
  _ => Dash.accentActive,
};

/// ไอคอนประจำสาเหตุ — กวาดตาหาอันที่ต้องการได้เร็วกว่าอ่านข้อความเรียงกันหกบรรทัด
const Map<String, IconData> kFixReasonIcons = {
  'ลืมสแกนเข้า': PhosphorIconsRegular.signIn,
  'ลืมสแกนออก': PhosphorIconsRegular.signOut,
  'สแกนนอกพื้นที่': PhosphorIconsRegular.mapPinLine,
  'เครื่องสแกนขัดข้อง': PhosphorIconsRegular.warningCircle,
  'ปฏิบัติงานนอกสถานที่': PhosphorIconsRegular.briefcase,
  'ควบเวรต่อ': PhosphorIconsRegular.arrowsClockwise,
};

/// ช่องสาเหตุ — ทรงเดียวกับช่องเวลา แตะแล้วเปิดแผ่นเลือกด้านล่าง
/// (ชิปเรียงยาวกินพื้นที่ฟอร์มไปครึ่งจอ ย้ายไปอยู่ในแผ่นแทน)
class ReasonField extends StatelessWidget {
  const ReasonField({super.key, required this.picked, required this.onTap});

  final Set<String> picked;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final empty = picked.isEmpty;
    return OutlinedTapField(
      label: 'สาเหตุที่ขอแก้ไข',
      onTap: onTap,
      // ยังไม่เลือกเลย = ส่งไม่ได้ บอกไว้ก่อนจะไปเจอปุ่มที่กดไม่ได้
      bad: empty,
      trailing: FieldStatusDot(done: !empty),
      contentHeight: 30,
      child: empty
          ? const FieldPlaceholder('แตะเพื่อเลือกสาเหตุ')
          : ReasonAvatarStack(picked: picked),
    );
  }
}

/// สาเหตุที่เลือกไว้ — โชว์แค่วงไอคอนซ้อนเหลื่อมกันแบบกองรูปโปรไฟล์
/// (ชื่อเต็มหกสาเหตุยาวเกินกว่าจะวางในการ์ดเดียว ดูรายชื่อได้ในแผ่นเลือก)
class ReasonAvatarStack extends StatelessWidget {
  const ReasonAvatarStack({super.key, required this.picked});

  final Set<String> picked;

  @override
  Widget build(BuildContext context) {
    final list = [
      for (final r in kFixReasons)
        if (picked.contains(r)) r,
    ];
    final size = Dash.box(30);
    final step = size * 0.68; // เหลื่อมกันราวหนึ่งในสาม เห็นไอคอนครบทุกวง
    return SizedBox(
      height: size,
      width: step * (list.length - 1) + size,
      child: Stack(
        children: [
          for (final (i, r) in list.indexed)
            Positioned(
              left: i * step,
              child: Container(
                width: size,
                height: size,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: fixReasonColor(r),
                  shape: BoxShape.circle,
                  // ขอบสีพื้นการ์ด — วงที่ซ้อนกันจึงไม่กลืนเป็นก้อนเดียว
                  border: Border.all(color: Dash.card, width: 2),
                ),
                child: Icon(
                  kFixReasonIcons[r] ?? PhosphorIconsRegular.note,
                  size: Dash.sp(16),
                  color: Dash.on,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// แผ่นเลือกสาเหตุ — ติ๊กได้หลายอัน เห็นผลทันทีทั้งในแผ่นและบนการ์ด
///
/// [blockedOf] คืนเหตุผลที่สาเหตุนั้นกดไม่ได้ (null = กดได้) — เช่นมีเวลาเข้าอยู่แล้ว
/// ก็เลือก "ลืมสแกนเข้า" ไม่ได้ · [onChanged] ถูกเรียกทุกครั้งที่ติ๊กเพื่อให้ฟอร์มวาดใหม่ตาม
Future<void> showReasonSheet(
  BuildContext context, {
  required Set<String> picked,
  required String? Function(String reason) blockedOf,
  required VoidCallback onChanged,
}) {
  FocusScope.of(context).unfocus();
  return showModalBottomSheet<void>(
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
            const Center(child: SheetGrabber()),
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
            for (final r in kFixReasons)
              _ReasonSheetRow(
                reason: r,
                on: picked.contains(r),
                blocked: blockedOf(r),
                // อัปเดตทั้งแผ่นและฟอร์มพร้อมกัน — ปิดแผ่นแล้วการ์ดต้องตรงเลย
                onTap: () {
                  setSheet(
                    () => picked.contains(r) ? picked.remove(r) : picked.add(r),
                  );
                  onChanged();
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

/// หนึ่งบรรทัดในแผ่นเลือกสาเหตุ
class _ReasonSheetRow extends StatelessWidget {
  const _ReasonSheetRow({
    required this.reason,
    required this.on,
    required this.blocked,
    required this.onTap,
  });

  final String reason;
  final bool on;

  /// เหตุผลที่กดไม่ได้ — null = กดได้ตามปกติ
  final String? blocked;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final off = blocked != null;
    final color = fixReasonColor(reason);
    return Opacity(
      // จางทั้งแถว — เห็นว่ามีตัวเลือกนี้อยู่ แต่รู้ทันทีว่ากดไม่ได้
      opacity: off ? 0.45 : 1,
      child: Tappable(
        onTap: off ? null : onTap,
        borderRadius: BorderRadius.zero,
        splash: Dash.accent,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              // ไอคอนประจำสาเหตุในวงกลมสีอ่อน — เข้มขึ้นเมื่อถูกเลือก
              Container(
                width: Dash.box(40),
                height: Dash.box(40),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: on ? 1 : 0.14),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  kFixReasonIcons[reason] ?? PhosphorIconsRegular.note,
                  size: Dash.sp(20),
                  color: on ? Dash.on : color,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      reason,
                      style: Dash.body(
                        size: 14.5,
                        weight: on ? FontWeight.w700 : FontWeight.w500,
                        color: Dash.ink,
                      ),
                    ),
                    // เหตุผลที่กดไม่ได้ — ไม่งั้นคนกดแล้วไม่เกิดอะไรจะงง
                    if (off) ...[
                      const SizedBox(height: 2),
                      Text(
                        blocked!,
                        style: Dash.body(size: 11.5, color: Dash.muted),
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
                color: on ? color : Dash.faint,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// ขีดจับหัวแผ่นล่าง — บอกว่าลากปิดได้
class SheetGrabber extends StatelessWidget {
  const SheetGrabber({super.key});

  @override
  Widget build(BuildContext context) => Container(
    width: 40,
    height: 4,
    decoration: BoxDecoration(
      color: Dash.hairline,
      borderRadius: BorderRadius.circular(100),
    ),
  );
}
