import 'package:flutter/material.dart';

import '../../../utils/thai_date.dart';
import '../dash_theme.dart';
import '../attendance_row.dart';
import '../widgets/scan_tiles.dart';
import '../widgets/shift_scene.dart';
import '../widgets/shift_hero_frame.dart';
import '../widgets/shift_pill.dart';

/// การ์ดหัว "วันที่ขอแก้ไข" — ภาษาเดียวกับการ์ด "การสแกนของวันนี้" บนแดชบอร์ด
/// ไล่สีมุมขวาบนตามเวร + ฉากท้องฟ้า · วันที่ตัวใหญ่ · แผ่นขาวคลุมช่องเวลาเข้า/ออก
///
/// ใช้สองที่: หน้าฟอร์มโชว์ "ของเดิมที่ระบบบันทึก" · หน้าตรวจสอบโชว์ "ที่ขอแก้เป็น"
/// ทุกส่วนที่เปลี่ยนได้ (ไล่สี ฉาก ชิปเวร ป้ายปัญหา) เปลี่ยนแบบค่อย ๆ จาง
/// เพราะหน้าตรวจสอบสลับจากค่าเดิมเป็นค่าใหม่คาตา
class FixDayCard extends StatefulWidget {
  const FixDayCard({
    super.key,
    required this.date,
    required this.anchor,
    required this.badges,
    required this.badgeKey,
    required this.inTime,
    required this.outTime,
    required this.inColor,
    required this.outColor,
    this.skelIn = false,
    this.skelOut = false,
  });

  final String date;

  /// เวลาตัวแทนของเวร — คุมไล่สี ฉากท้องฟ้า และชิปเวร
  final String anchor;
  final List<Widget> badges;

  /// ป้ายชุดนี้คือชุดไหน — ใช้เป็นคีย์สลับ ไม่ใช่เทียบ widget ทีละตัว
  final String badgeKey;
  final String inTime;
  final String outTime;
  final Color inColor;
  final Color outColor;
  final bool skelIn;
  final bool skelOut;

  @override
  State<FixDayCard> createState() => _FixDayCardState();
}

class _FixDayCardState extends State<FixDayCard>
    with SingleTickerProviderStateMixin {
  static const _swap = Duration(milliseconds: 560);

  /// จางสลับพร้อมขยายนิดหน่อย — ป้าย/ชิปที่เปลี่ยนจะสะดุดตากว่าจางเฉย ๆ
  /// ไม่ใช้ easeOutBack: ป้ายเล็ก ๆ เด้งเกินขนาดแล้วดูสั่น
  static Widget _fade(Widget child, Animation<double> anim) => FadeTransition(
    opacity: CurvedAnimation(parent: anim, curve: Curves.easeOut),
    child: ScaleTransition(
      scale: Tween(
        begin: 0.94,
        end: 1.0,
      ).animate(CurvedAnimation(parent: anim, curve: Curves.easeOutCubic)),
      child: child,
    ),
  );

  @override
  Widget build(BuildContext context) => _card();

  Widget _card() {
    final tint = shiftTint(
      widget.anchor,
    ).withValues(alpha: Dash.dark ? 0.22 : 0.95);
    final shiftKey = ValueKey(shiftName(widget.anchor));
    return ShiftHeroFrame(
      tint: tint,
      duration: _swap,
      scene: AnimatedSwitcher(
        duration: _swap,
        // ฉากเก่าจางออกให้หมดก่อนฉากใหม่จะขึ้น — ซ้อนกันจะเห็นดวงอาทิตย์สองดวง
        switchOutCurve: const Interval(0, 0.45, curve: Curves.easeIn),
        switchInCurve: const Interval(0.55, 1, curve: Curves.easeOut),
        transitionBuilder: (child, anim) =>
            FadeTransition(opacity: anim, child: child),
        child: ShiftScene(
          key: shiftKey,
          hhmm: widget.anchor,
          width: Dash.sp(150),
          height: Dash.sp(86),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        // สูงเท่าเนื้อหาเท่านั้น — หน้าตรวจสอบวางการ์ดนี้ในกล่องที่สูงกว่า
        // ถ้าเป็น max การ์ดจะยืดจนมีที่ว่างโล่งใต้ช่องสแกน
        mainAxisSize: MainAxisSize.min,
        children: [
          HeroCardHeader(
            title: 'วันที่ขอแก้ไข',
            trailing: AnimatedSwitcher(
              duration: _swap,
              transitionBuilder: _fade,
              child: KeyedSubtree(
                key: shiftKey,
                child: ShiftPill(widget.anchor),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 8,
              runSpacing: 6,
              children: [
                Text(
                  thaiShortDate(widget.date),
                  style: Dash.tech(size: 20, weight: FontWeight.w600),
                ),
                // ป้ายบอกว่าข้อมูลวันนี้ขาดตรงไหน — ต่อท้ายวันที่ในแถวเดียวกัน
                // ป้ายที่หายไปต้องหุบความกว้างด้วย ไม่ใช่หายวับทิ้งช่องว่างไว้
                AnimatedSize(
                  duration: _swap,
                  curve: Curves.easeOutCubic,
                  alignment: Alignment.centerLeft,
                  child: AnimatedSwitcher(
                    duration: _swap,
                    switchOutCurve: const Interval(
                      0,
                      0.45,
                      curve: Curves.easeIn,
                    ),
                    switchInCurve: const Interval(
                      0.55,
                      1,
                      curve: Curves.easeOut,
                    ),
                    transitionBuilder: _fade,
                    // ชุดเก่ากับชุดใหม่ไม่ต้องซ้อนกัน — วาดทีละชุดแล้วให้ AnimatedSize คุมความกว้าง
                    layoutBuilder: (current, previous) =>
                        current ?? const SizedBox.shrink(),
                    child: Wrap(
                      key: ValueKey(widget.badgeKey),
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      runSpacing: 6,
                      children: widget.badges,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          ScanSheet(
            child: ScanTiles(
              inTime: widget.inTime,
              outTime: widget.outTime,
              inColor: widget.inColor,
              outColor: widget.outColor,
              skelIn: widget.skelIn,
              skelOut: widget.skelOut,
            ),
          ),
        ],
      ),
    );
  }
}
