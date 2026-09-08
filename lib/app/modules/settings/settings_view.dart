import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../widgets/tappable.dart';

import '../../theme/nexus.dart';
import '../../widgets/dismiss_keyboard.dart';
import 'settings_controller.dart';

/// หน้าตั้งค่า NEXUS — auto-save (ไม่มีปุ่มบันทึก) · hcode ตั้งตอน login / ไฟส่องหน้าอยู่จอสแกน
class SettingsView extends GetView<SettingsController> {
  const SettingsView({super.key});

  @override
  Widget build(BuildContext context) {
    final s = controller.s;
    return DismissKeyboard(
      child: Scaffold(
        body: Container(
          decoration: Nexus.pScreenBg,
          child: SafeArea(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(18, 12, 16, 8),
                  // หน้าแยก (push จากเฟืองบน home) — มีปุ่มย้อนกลับ
                  child: Row(
                    children: [
                      Tappable(
                        onTap: Get.back,
                        child: Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: Icon(
                            PhosphorIconsRegular.caretLeft,
                            size: 20,
                            color: Nexus.pSub,
                          ),
                        ),
                      ),
                      Text(
                        'ตั้งค่า · Settings',
                        style: Nexus.tech(size: 17, weight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                    children: [
                      _section('บัญชี · ACCOUNT', [
                        _nav(
                          'ลงทะเบียนใบหน้าใหม่',
                          'อัปเดตข้อมูลใบหน้าของคุณ',
                          PhosphorIconsRegular.userFocus,
                          controller.goRegister,
                        ),
                      ]),
                      _section('ธีม · THEME', [_themeRow()]),
                      _section('ทั่วไป · GENERAL', [
                        Obx(
                          () => _staticRow(
                            'เวอร์ชัน',
                            s.appVersion.value.isEmpty
                                ? '—'
                                : s.appVersion.value,
                          ),
                        ),
                      ]),
                      const SizedBox(height: 18),
                      Tappable(
                        onTap: controller.logout,
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 15),
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: Nexus.pBadBg,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Nexus.pBadBorder),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                PhosphorIconsRegular.signOut,
                                size: 18,
                                color: Nexus.pBad,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'ออกจากระบบ',
                                style: Nexus.tech(
                                  size: 15,
                                  weight: FontWeight.w700,
                                  color: Nexus.pBad,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ---------- section / row ----------
  Widget _section(String title, List<Widget> rows) {
    final children = <Widget>[];
    for (var i = 0; i < rows.length; i++) {
      children.add(rows[i]);
      if (i != rows.length - 1)
        children.add(Divider(height: 1, thickness: 1, color: Nexus.pDivider));
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 0, 4, 8),
            child: Text(
              title,
              style: Nexus.tech(size: 11, color: Nexus.pDim, spacing: 1.5),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: Nexus.pPanel,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Nexus.pLine),
            ),
            child: Column(children: children),
          ),
        ],
      ),
    );
  }

  Widget _rowPad(Widget child) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 12),
    child: child,
  );

  Widget _labelCol(String label, String sub) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    mainAxisSize: MainAxisSize.min,
    children: [
      Text(
        label,
        style: Nexus.body(size: 14, weight: FontWeight.w600, color: Nexus.pInk),
      ),
      if (sub.isNotEmpty) ...[
        const SizedBox(height: 2),
        Text(sub, style: Nexus.body(size: 11.5, color: Nexus.pMuted)),
      ],
    ],
  );

  Widget _nav(String label, String sub, IconData icon, VoidCallback onTap) =>
      InkWell(
        onTap: onTap,
        child: _rowPad(
          Row(
            children: [
              Icon(icon, size: 20, color: Nexus.pAccent),
              const SizedBox(width: 12),
              Expanded(child: _labelCol(label, sub)),
              Icon(PhosphorIconsRegular.caretRight, color: Nexus.pMuted),
            ],
          ),
        ),
      );

  Widget _staticRow(String label, String value) => _rowPad(
    Row(
      children: [
        Expanded(child: _labelCol(label, '')),
        Text(
          value,
          style: Nexus.tech(
            size: 13,
            weight: FontWeight.w700,
            color: Nexus.pSub,
          ),
        ),
      ],
    ),
  );

  // ---------- โหมดธีม (มืด/สว่าง) ----------
  Widget _themeRow() => _rowPad(
    Row(
      children: [
        Expanded(child: _labelCol('โหมดธีม', 'มืด / สว่าง (accent = ฟ้า)')),
        Obx(() {
          final dark = controller.s.themeMode.value == 'dark';
          return Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              _modeBtn(
                'มืด',
                PhosphorIconsRegular.moon,
                dark,
                () => controller.setThemeMode(true),
              ),
              const SizedBox(width: 8),
              _modeBtn(
                'สว่าง',
                PhosphorIconsRegular.sun,
                !dark,
                () => controller.setThemeMode(false),
              ),
            ],
          );
        }),
      ],
    ),
  );

  Widget _modeBtn(String label, IconData icon, bool sel, VoidCallback onTap) =>
      Tappable(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
          decoration: BoxDecoration(
            color: sel ? Nexus.pAccent.withValues(alpha: 0.15) : Nexus.pPanel,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: sel ? Nexus.pAccent : Nexus.pLine),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: sel ? Nexus.pAccent : Nexus.pMuted),
              const SizedBox(width: 6),
              Text(
                label,
                style: Nexus.body(
                  size: 12.5,
                  color: sel ? Nexus.pAccent : Nexus.pSub,
                ),
              ),
            ],
          ),
        ),
      );
}
