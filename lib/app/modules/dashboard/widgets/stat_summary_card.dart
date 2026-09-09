import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../dash_theme.dart';
import '../dashboard_controller.dart';
import 'skeleton.dart';

/// สรุปช่วงที่เลือกเป็นแถบสัดส่วนเส้นเดียว
///
/// การ์ด 4 ใบแบบเดิมบอกแต่ตัวเลขโดด ๆ อ่านไม่ออกว่าสัดส่วนวันที่มีปัญหา
/// เทียบกับทั้งเดือนเป็นเท่าไหร่
class StatSummaryCard extends StatelessWidget {
  const StatSummaryCard({super.key, required this.controller});

  final DashboardController controller;

  @override
  Widget build(BuildContext context) => Obx(() {
    if (controller.rangeLoading.value) {
      return Shimmer(child: Skel(height: 104, radius: 16, onPanel: true));
    }
    final b = controller.summary;
    final segs = <(String, int, Color)>[
      ('ปกติ', b.normalDays, Dash.ok),
      ('สาย', b.lateOnly, Dash.warn),
      ('ออกก่อน', b.earlyOnly, Dash.info),
      ('ลืมออก', b.noOutOnly, Dash.bad),
    ];
    final total = b.days;
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
      decoration: BoxDecoration(
        color: Dash.card,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text('มาทำงาน', style: Dash.body(size: 12.5, color: Dash.muted)),
              const SizedBox(width: 8),
              // นับขึ้นจาก 0 — ตาจับได้ว่าตัวเลขนี้เพิ่งเปลี่ยนตามช่วงที่เลือก
              TweenAnimationBuilder<double>(
                key: ValueKey(total),
                tween: Tween(begin: 0, end: total.toDouble()),
                duration: const Duration(milliseconds: 450),
                curve: Curves.easeOutCubic,
                builder: (context, v, _) => Text(
                  '${v.round()} วัน',
                  style: Dash.num(
                    size: 18,
                    weight: FontWeight.w800,
                    color: Dash.ink,
                  ),
                ),
              ),
              const Spacer(),
              // ช่วงวันที่ของตัวเลขชุดนี้ — ใช้ค่าเดียวกับหัวการ์ดกราฟ เพราะสรุปจากแถวชุดเดียวกัน
              Text(
                controller.cardSub,
                style: Dash.body(size: 11.5, color: Dash.muted),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(100),
            child: SizedBox(
              height: Dash.sp(12),
              child: total == 0
                  ? ColoredBox(color: Dash.rowBg)
                  // ยืดจากซ้ายตอนโผล่/เปลี่ยนช่วง — key ผูกกับตัวเลขจริง
                  // ไม่งั้นสลับแท็บแล้วแถบเปลี่ยนค่าเงียบ ๆ ไม่รู้ว่าอัปเดตแล้ว
                  : TweenAnimationBuilder<double>(
                      key: ValueKey(
                        '$total-${b.normalDays}-${b.lateOnly}-${b.earlyOnly}-${b.noOutOnly}',
                      ),
                      tween: Tween(begin: 0, end: 1),
                      duration: const Duration(milliseconds: 550),
                      curve: Curves.easeOutCubic,
                      builder: (context, t, child) => Align(
                        alignment: Alignment.centerLeft,
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: t,
                          child: child,
                        ),
                      ),
                      child: Row(
                        // stretch — ColoredBox/Container ในแถวนี้ไม่มีความสูงของตัวเอง
                        // ปล่อยไว้ Row จะให้ความสูง 0 แถบเลยหายทั้งแถบ
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          for (final (i, seg) in segs.indexed)
                            if (seg.$2 > 0) ...[
                              // ช่องไฟคั่นเป็นสีพื้นหลัง ไม่ใช่ช่องว่าง — ClipRRect ตัดขอบให้เอง
                              if (i > 0 && segs.take(i).any((e) => e.$2 > 0))
                                Container(width: 2, color: Dash.card),
                              // Expanded ไม่ใช่ Flexible — loose fit ทำให้ ColoredBox
                              // ที่ไม่มีขนาดของตัวเองหดเหลือ 0 แถบเลยหายไปทั้งแถว
                              Expanded(
                                flex: seg.$2,
                                child: ColoredBox(color: seg.$3),
                              ),
                            ],
                        ],
                      ),
                    ),
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 14,
            runSpacing: 8,
            children: [
              for (final (label, v, c) in segs)
                StatLegendItem(label: label, value: v, color: c),
            ],
          ),
        ],
      ),
    );
  });
}

/// จุดสี + ชื่อสถานะ + จำนวนวัน — หนึ่งตัวต่อหนึ่งช่วงสีในแถบสัดส่วน
class StatLegendItem extends StatelessWidget {
  const StatLegendItem({
    super.key,
    required this.label,
    required this.value,
    required this.color,
  });

  final String label;
  final int value;
  final Color color;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
          // จางลงเมื่อเป็นศูนย์ — ตายังกวาดหาอันที่มีค่าได้เร็ว
          color: value > 0 ? color : Dash.faint,
          shape: BoxShape.circle,
        ),
      ),
      const SizedBox(width: 6),
      Text(label, style: Dash.body(size: 11.5, color: Dash.muted)),
      const SizedBox(width: 4),
      Text(
        '$value',
        style: Dash.num(
          size: 12.5,
          weight: FontWeight.w700,
          color: value > 0 ? Dash.ink : Dash.faint,
        ),
      ),
    ],
  );
}
