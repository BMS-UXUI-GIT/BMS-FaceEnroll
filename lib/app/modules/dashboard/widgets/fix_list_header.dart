import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../widgets/tappable.dart';
import '../dash_theme.dart';
import 'dash_text.dart';
import 'sliver_headers.dart';
import 'underline_tab.dart';

/// ความกว้างคอลัมน์วันที่ — หัวคอลัมน์กับทุกแถวใช้ค่าเดียวกัน
double get kFixColDateW => Dash.box(104);

/// แถบตรึงของหน้ารายการขอแก้ไข — แท็บสถานะ + หัวคอลัมน์
class FixListHeaderSliver extends StatelessWidget {
  const FixListHeaderSliver({
    super.key,
    required this.pending,
    required this.sent,
    required this.count,
    required this.showSent,
    required this.dateDesc,
    required this.onTab,
    required this.onToggleSort,
  });

  final int pending;
  final int sent;

  /// จำนวนแถวที่แสดงอยู่จริง — เข้าไปในลายเซ็นเพื่อบังคับให้หัววาดใหม่
  final int count;
  final bool showSent;
  final bool dateDesc;
  final ValueChanged<bool> onTab;
  final VoidCallback onToggleSort;

  @override
  Widget build(BuildContext context) {
    final h = Dash.box(46) + 14 + Dash.box(22) + 6;
    return SliverPersistentHeader(
      pinned: true,
      delegate: FixedHeightHeader(
        height: h,
        // ความสูงเท่าเดิมทุกแท็บ ถ้าเทียบแค่ความสูงหัวจะไม่วาดใหม่ แท็บที่เลือกเลยค้าง
        signature: '$showSent|$dateDesc|$pending|$sent|$count',
        child: ColoredBox(
          color: Dash.bg,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                height: Dash.box(46),
                // แท็บสถานะแบบขีดใต้ — ชิดขอบจอเหมือนแท็บช่วงเวลาบนแดชบอร์ด
                child: Row(
                  children: [
                    Expanded(
                      child: UnderlineTab(
                        label: 'ยังไม่ส่ง ($pending)',
                        on: !showSent,
                        onTap: () => onTab(false),
                      ),
                    ),
                    Expanded(
                      child: UnderlineTab(
                        label: 'ส่งแล้ว ($sent)',
                        on: showSent,
                        onTap: () => onTab(true),
                      ),
                    ),
                  ],
                ),
              ),
              // ไม่มีช่องว่างตรงนี้ — หัวคอลัมน์กินระยะ _headHit ขึ้นไปเป็นพื้นที่กดแทน
              // หัวคอลัมน์ของรายการ — สเปกเดียวกับหัวตารางรายวันบนแดชบอร์ด
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 6),
                child: SizedBox(
                  height: Dash.box(22) + _headHit,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      SizedBox(
                        width: kFixColDateW,
                        child: _SortableDateHead(
                          desc: dateDesc,
                          onTap: onToggleSort,
                        ),
                      ),
                      Expanded(child: TableHeadCell('เวลาการทำงาน')),
                      TableHeadCell('สาเหตุ', end: true),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// ระยะที่ยืดพื้นที่กดของหัวคอลัมน์ "วันที่" ขึ้นไปข้างบน — ตัวหนังสือสูงแค่ ~15
/// กดพลาดบ่อย เลยเผื่อขึ้นไปให้ครบเกณฑ์นิ้วโป้ง (รวมแล้วประมาณ 34)
const double _headHit = 14;

/// หัวคอลัมน์ "วันที่" ที่กดสลับลำดับได้ — ลูกศรบอกทิศทางที่เรียงอยู่
class _SortableDateHead extends StatelessWidget {
  const _SortableDateHead({required this.desc, required this.onTap});

  final bool desc;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Tappable(
    onTap: onTap,
    borderRadius: BorderRadius.circular(6),
    splash: Dash.accent,
    child: Padding(
      // พื้นที่กดกินเต็มความกว้างคอลัมน์ และสูงขึ้นไปข้างบน _headHit
      // ตัวหนังสือยังชิดล่างเหมือนเดิม ขนาดที่กดได้จริงจึงโตขึ้นเงียบๆ
      padding: const EdgeInsets.fromLTRB(4, _headHit + 2, 4, 2),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          TableHeadCell('วันที่'),
          const SizedBox(width: 2),
          Icon(
            desc ? PhosphorIconsBold.caretDown : PhosphorIconsBold.caretUp,
            size: Dash.sp(11),
            color: Dash.accentActive,
          ),
        ],
      ),
    ),
  );
}
