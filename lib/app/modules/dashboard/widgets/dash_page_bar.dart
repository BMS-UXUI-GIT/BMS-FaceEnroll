import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../widgets/tappable.dart';
import '../dash_theme.dart';

/// ปุ่มย้อนกลับวงกลม — บนแผงน้ำเงินเป็นขาว บนพื้นสว่างเป็นสีหมึก
class DashBackButton extends StatelessWidget {
  const DashBackButton({super.key, this.onPanel = false, this.size = 52});

  final bool onPanel;

  /// ด้านของพื้นที่กด (dp ก่อนสเกล) — แถบหัว 52 · หัวการ์ดที่ยุบได้ 44
  final double size;

  @override
  Widget build(BuildContext context) => Tappable(
    onTap: Get.back,
    circle: true,
    splash: onPanel ? Dash.onPanel() : Dash.accent,
    child: SizedBox(
      width: Dash.box(size),
      height: Dash.box(size),
      child: Icon(
        PhosphorIconsRegular.arrowLeft,
        size: Dash.sp(20),
        color: onPanel ? Dash.onPanel() : Dash.ink,
      ),
    ),
  );
}

/// แถบหัวหน้าย่อย: ปุ่มย้อนกลับซ้าย · ชื่อหน้ากลางจอจริง · ปุ่มเสริมขวา (ถ้ามี)
///
/// ใช้ Stack ไม่ใช่ Row — ชื่อหน้าต้องอยู่กลางจอจริง ไม่ใช่กลางที่ว่างระหว่างปุ่มสองข้าง
/// (ปุ่มขวากว้างกว่าปุ่มซ้าย ถ้าใช้ Expanded ชื่อจะเบี่ยงซ้าย)
class DashPageBar extends StatelessWidget {
  const DashPageBar({
    super.key,
    required this.title,
    this.trailing,
    this.onPanel = true,
  });

  final String title;
  final Widget? trailing;
  final bool onPanel;

  @override
  Widget build(BuildContext context) {
    final fg = onPanel ? Dash.onPanel() : Dash.ink;
    return SizedBox(
      height: Dash.box(52),
      child: Stack(
        children: [
          Center(
            child: Text(
              title,
              style: Dash.tech(size: 16, weight: FontWeight.w700, color: fg),
            ),
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: DashBackButton(onPanel: onPanel),
          ),
          if (trailing != null)
            Align(
              alignment: Alignment.centerRight,
              child: Padding(
                padding: const EdgeInsets.only(right: 12),
                child: trailing,
              ),
            ),
        ],
      ),
    );
  }
}
