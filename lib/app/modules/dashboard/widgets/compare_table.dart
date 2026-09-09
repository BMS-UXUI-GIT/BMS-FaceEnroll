import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../dash_theme.dart';
import 'dash_text.dart';

/// หนึ่งแถวในตารางเทียบ: ป้าย · ค่าเดิม · ค่าที่ขอ · หมายเหตุ
/// ([note] มีค่าเมื่อไหร่จะไปแทนคำว่า เปลี่ยน/เท่าเดิม ที่ระบบเขียนให้เอง)
class CompareItem {
  const CompareItem(this.label, this.oldValue, this.newValue, {this.note});

  final String label;
  final String oldValue;
  final String newValue;
  final String? note;

  bool get changed => oldValue != newValue;
}

/// ตารางเทียบค่าเดิมกับค่าที่ขอแก้ — กวาดตาแถวเดียวรู้ว่าจะส่งอะไรออกไป
class CompareTable extends StatelessWidget {
  const CompareTable({super.key, required this.rows});

  final List<CompareItem> rows;

  /// ความกว้างคอลัมน์ชื่อรายการ — หัวตารางกับทุกแถวใช้ค่าเดียวกัน
  static double get _colW => Dash.box(64);

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: Dash.card,
      borderRadius: BorderRadius.circular(16),
    ),
    // แถบหัวตารางสีเทาเกือบเท่าสีพื้นหน้า มุมโค้งเลยมองไม่ออกว่าโค้ง — ตีเส้นขอบให้เห็นรูปการ์ด
    // วาดทับลูก ไม่ใช่ border ใน decoration — ของเดิมโดน clipBehavior กินไปครึ่งเส้น
    foregroundDecoration: BoxDecoration(
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: Dash.hairline),
    ),
    clipBehavior: Clip.antiAlias,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
          color: Dash.rowBg,
          child: Row(
            children: [
              SizedBox(width: _colW, child: TableHeadCell('รายการ')),
              Expanded(child: TableHeadCell('ระบบบันทึก')),
              Expanded(child: TableHeadCell('หลังแก้ไข')),
            ],
          ),
        ),
        for (final (i, r) in rows.indexed) ...[
          if (i > 0)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 14),
              child: Hairline(),
            ),
          _CompareRow(r),
        ],
      ],
    ),
  );
}

class _CompareRow extends StatelessWidget {
  const _CompareRow(this.item);

  final CompareItem item;

  @override
  Widget build(BuildContext context) {
    final changed = item.changed;
    // แถวเวลาต่อท้ายด้วย น. แถวเวรเป็นข้อความล้วน ไม่ต้องต่อ
    final unit = item.label.contains('เวลา') ? ' น.' : '';
    final oldShown = '${item.oldValue.isEmpty ? '--:--' : item.oldValue}$unit';
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: CompareTable._colW,
            child: Text(
              item.label,
              style: Dash.body(size: 12.5, color: Dash.muted),
            ),
          ),
          Expanded(
            child: Text(
              oldShown,
              style:
                  Dash.tech(
                    size: 15,
                    weight: FontWeight.w600,
                    // ค่าเดิมที่ถูกแทนขีดฆ่าให้เห็นว่าอันนี้จะหายไป
                    color: item.oldValue.isEmpty ? Dash.faint : Dash.sub,
                  ).copyWith(
                    decoration: changed && item.oldValue.isNotEmpty
                        ? TextDecoration.lineThrough
                        : null,
                    decorationColor: Dash.muted,
                  ),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    if (changed) ...[
                      Icon(
                        PhosphorIconsBold.arrowRight,
                        size: Dash.sp(12),
                        color: Dash.accentActive,
                      ),
                      const SizedBox(width: 4),
                    ],
                    Text(
                      '${item.newValue}$unit',
                      style: Dash.tech(
                        size: 15,
                        weight: FontWeight.w700,
                        color: changed ? Dash.accentActive : Dash.ink,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  item.note ?? (changed ? 'เปลี่ยน' : 'เท่าเดิม'),
                  style: Dash.body(
                    size: 10.5,
                    weight: FontWeight.w600,
                    color: item.note != null
                        ? Dash.ok
                        : changed
                        ? Dash.accentActive
                        : Dash.muted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
