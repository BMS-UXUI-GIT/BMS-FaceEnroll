import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../widgets/tappable.dart';

import '../../models/checkin.dart';
import '../../services/checkin_service.dart';
import '../../theme/nexus.dart';
import 'home_controller.dart';

/// หน้าหลัก NEXUS — การ์ดวันนี้ (session active) + สถานะลงทะเบียน + ปุ่มลงเวลารู้สถานะ
/// หมายเหตุ: โชว์ emp_id ได้เฉพาะหน้า home (ผู้ใช้อนุญาต) — จออื่นยังไม่โชว์ตามกฎเดิม
class HomeView extends GetView<HomeController> {
  const HomeView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: Nexus.pScreenBg,
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 14, 24, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ตั้งค่าอยู่เฟืองมุมขวาบน (ปุ่มสแกนย้ายไปกลาง dock แล้ว)
                Row(
                  children: [
                    Text(
                      'หน้าหลัก',
                      style: Nexus.tech(size: 17, weight: FontWeight.w700),
                    ),
                    const Spacer(),
                    Tappable(
                      onTap: controller.goSettings,
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        width: 38,
                        height: 38,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Nexus.pLine),
                          color: Nexus.pPanel,
                        ),
                        child: Icon(
                          PhosphorIconsRegular.gear,
                          size: 19,
                          color: Nexus.pSub,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                _userCard(),
                Obx(() {
                  final d = controller.missedOutDate.value;
                  if (d == null) return const SizedBox.shrink();
                  return Tappable(
                    onTap: controller.goMyTime,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      margin: const EdgeInsets.only(top: 10),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: Nexus.pBadBg,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Nexus.pBadBorder),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            PhosphorIconsRegular.warningCircle,
                            size: 16,
                            color: Nexus.pBad,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'วันที่ $d ลืมลงเวลาออกเวร — แตะดูประวัติ / แจ้งผู้ดูแล',
                              style: Nexus.body(size: 12, color: Nexus.pInk),
                            ),
                          ),
                          Icon(
                            PhosphorIconsRegular.caretRight,
                            size: 16,
                            color: Nexus.pBad,
                          ),
                        ],
                      ),
                    ),
                  );
                }),
                const SizedBox(height: 14),
                Expanded(
                  child: Obx(() {
                    final reg = controller.registered.value;
                    return ListView(
                      padding: EdgeInsets.zero,
                      children: [
                        if (reg == false)
                          _notRegistered()
                        else
                          _registeredChip(),
                        if (reg != false) ...[
                          const SizedBox(height: 14),
                          _todayCard(),
                        ],
                      ],
                    );
                  }),
                ),
                // ปุ่มสแกนย้ายไปกลาง dock / เลขเวอร์ชันดูได้ในตั้งค่า
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ---------- user ----------
  Widget _userCard() {
    final s = controller.settings;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Nexus.pLine),
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Nexus.pPanel, Nexus.pPanel],
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 52,
            height: 52,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Nexus.pLine),
              gradient: const LinearGradient(
                colors: [Color(0xFF112233), Color(0xFF1B3A57)],
              ),
            ),
            child: Obx(
              () => Text(
                _initials(s.staffName.value),
                style: Nexus.tech(
                  size: 17,
                  weight: FontWeight.w700,
                  color: Nexus.pAccent,
                ),
              ),
            ),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Obx(
                  () => Text(
                    s.staffName.value.isEmpty ? 'พนักงาน' : s.staffName.value,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Nexus.body(size: 15, weight: FontWeight.w600),
                  ),
                ),
                const SizedBox(height: 3),
                Obx(
                  () => Text(
                    'EMP ${s.empId.value} · รพ. ${s.hcode.value}',
                    style: Nexus.tech(
                      size: 10.5,
                      color: Nexus.pAccent,
                      spacing: 1,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _initials(String name) {
    final n = name.trim();
    if (n.isEmpty) return '?';
    final parts = n.split(RegExp(r'\s+'));
    if (parts.length >= 2 && parts[0].isNotEmpty && parts[1].isNotEmpty) {
      return parts[0].characters.first + parts[1].characters.first;
    }
    return n.characters.take(2).toString();
  }

  // ---------- registration status ----------
  Widget _notRegistered() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          color: Nexus.pWarnBg,
          border: Border.all(color: Nexus.pWarnBorder),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(PhosphorIconsRegular.warning, color: Nexus.pWarn, size: 20),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'ยังไม่ได้ลงทะเบียนใบหน้า',
                    style: Nexus.body(
                      size: 13,
                      weight: FontWeight.w600,
                      color: Nexus.pWarn,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'ต้องลงทะเบียนใบหน้าก่อน จึงจะสแกนลงเวลาได้',
                    style: Nexus.body(size: 11.5, color: Nexus.pMuted),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      NexusButton(label: 'ลงทะเบียนใบหน้า', onTap: controller.startRegister),
    ],
  );

  Widget _registeredChip() => Container(
    padding: const EdgeInsets.all(13),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(16),
      color: Nexus.pOkBg,
      border: Border.all(color: Nexus.pOkBorder),
    ),
    child: Row(
      children: [
        Icon(PhosphorIconsRegular.checkCircle, color: Nexus.pOk, size: 20),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'ลงทะเบียนใบหน้าแล้ว',
                style: Nexus.body(
                  size: 13,
                  weight: FontWeight.w600,
                  color: Nexus.pOk,
                ),
              ),
              Text(
                'พร้อมสแกนลงเวลา',
                style: Nexus.body(size: 11, color: Nexus.pMuted),
              ),
            ],
          ),
        ),
        Tappable(
          onTap: controller.startRegister,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Nexus.pLine),
            ),
            child: Text(
              'ลงทะเบียนใหม่',
              style: Nexus.body(size: 11, color: Nexus.pSub),
            ),
          ),
        ),
      ],
    ),
  );

  // ---------- today card ----------
  BoxDecoration _cardDeco() => BoxDecoration(
    borderRadius: BorderRadius.circular(18),
    color: Nexus.pTodayBg,
    border: Border.all(color: Nexus.pLine),
  );

  String _shiftLabel(Shift? a, Shift? b) {
    if (a == null && b == null) return '';
    if (a != null && b != null && a.id != b.id) return '${a.name} → ${b.name}';
    return (a ?? b)!.name;
  }

  /// วันที่ปัจจุบันแบบไทย เช่น "จ. 29 มิ.ย. 69" (dynamic — ไม่ hardcode)
  String _todayThai() {
    final n = DateTime.now();
    const wd = [
      '',
      'จ.',
      'อ.',
      'พ.',
      'พฤ.',
      'ศ.',
      'ส.',
      'อา.',
    ]; // weekday 1=Mon..7=Sun
    const mo = [
      '',
      'ม.ค.',
      'ก.พ.',
      'มี.ค.',
      'เม.ย.',
      'พ.ค.',
      'มิ.ย.',
      'ก.ค.',
      'ส.ค.',
      'ก.ย.',
      'ต.ค.',
      'พ.ย.',
      'ธ.ค.',
    ];
    final be = ((n.year + 543) % 100).toString().padLeft(2, '0'); // พ.ศ. 2 หลัก
    return '${wd[n.weekday]} ${n.day} ${mo[n.month]} $be';
  }

  /// เวลาเวรของ session (จาก inShift/outShift ที่เก็บใน SharedPreferences) เช่น "08:00 - 16:00"
  String _shiftTimeOf(CheckinSession s) {
    final sh = s.inShift ?? s.outShift;
    if (sh == null) return '';
    String hm(String t) => t.length >= 5 ? t.substring(0, 5) : t;
    final st = hm(sh.timeStart), en = hm(sh.timeEnd);
    if (st.isEmpty || en.isEmpty) return '';
    return '$st - $en';
  }

  Widget _todayCard() {
    return Obx(() {
      final c = controller.checkin;
      final ss = c.sessions;
      final tab = controller.todayTab.value; // reactive: เปลี่ยนแท็บ = rebuild
      if (ss.isEmpty) {
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: _cardDeco(),
          child: Row(
            children: [
              Icon(
                PhosphorIconsRegular.calendarCheck,
                color: Nexus.pDim,
                size: 20,
              ),
              const SizedBox(width: 10),
              Text(
                'วันนี้ยังไม่ลงเวลา',
                style: Nexus.body(size: 13, color: Nexus.pMuted),
              ),
            ],
          ),
        );
      }
      // แท็บที่เลือก: -1 หรือเกินช่วง = auto (เวรที่กำลังเข้า ไม่งั้นเวรล่าสุด)
      final idx = (tab >= 0 && tab < ss.length) ? tab : _activeIndex(ss);
      final s = ss[idx];
      final multi = ss.length > 1; // ควบเวร → โชว์แท็บ

      final hasIn = s.inTime != null;
      final hasOut = s.outTime != null;
      final shiftLabel = _shiftLabel(s.inShift, s.outShift);
      // นาทีสาย/ออกก่อน มาจากเซิร์ฟเวอร์ (ตอนลงเวลา) — ไม่มีก็คำนวณจากเวรในเครื่อง
      (String, Color)? inBadge;
      if (hasIn) {
        final m = c.lateMinutes(s);
        inBadge = c.isLate(s)
            ? (m > 0 ? 'สาย $m นาที' : 'สาย', Nexus.pBad)
            : ('ตรงเวลา', Nexus.pOk);
      }
      (String, Color)? outBadge;
      if (hasOut) {
        final m = c.earlyMinutes(s);
        outBadge = c.isEarlyOut(s)
            ? (m > 0 ? 'ก่อนเวลา $m นาที' : 'ก่อนเวลา', Nexus.pBad)
            : ('ครบเวลา', Nexus.pOk);
      } else if (s.isOpen) {
        outBadge = ('กำลังเข้าเวร', Nexus.pAccent);
      }

      return Container(
        decoration: _cardDeco(),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(15, 13, 15, 11),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        'วันนี้',
                        style: Nexus.tech(size: 13.5, weight: FontWeight.w600),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _todayThai(),
                        style: Nexus.body(size: 11.5, color: Nexus.pMuted),
                      ),
                      const Spacer(),
                      // เวรเดียว = โชว์ชื่อเวรมุมขวาเหมือนเดิม / ควบเวร = ใช้แท็บด้านล่างแทน
                      if (!multi && shiftLabel.isNotEmpty)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Nexus.pAccent.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: Nexus.pLine2),
                          ),
                          child: Text(
                            shiftLabel,
                            style: Nexus.body(size: 11, color: Nexus.pSub),
                          ),
                        ),
                    ],
                  ),
                  if (multi) ...[
                    const SizedBox(height: 11),
                    _sessionTabs(ss, idx),
                  ],
                  if (_shiftTimeOf(s).isNotEmpty) ...[
                    SizedBox(height: multi ? 9 : 5),
                    Row(
                      children: [
                        Icon(
                          PhosphorIconsRegular.clock,
                          size: 13,
                          color: Nexus.pDim,
                        ),
                        const SizedBox(width: 5),
                        Text(
                          _shiftTimeOf(s),
                          style: Nexus.tech(
                            size: 12,
                            color: Nexus.pSub,
                            spacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            Row(
              children: [
                Expanded(
                  child: _punchCol(
                    'เข้างาน · IN',
                    CheckinService.hhmm(s.inTime),
                    inBadge,
                    borderRight: true,
                  ),
                ),
                Expanded(
                  child: _punchCol(
                    'ออกงาน · OUT',
                    CheckinService.hhmm(s.outTime),
                    outBadge,
                    autoOut: hasOut && s.autoOut,
                    onAutoInfo: () =>
                        _showAutoOutInfo(CheckinService.hhmm(s.outTime)),
                  ),
                ),
              ],
            ),
          ],
        ),
      );
    });
  }

  /// index ของเวรที่ "กำลังเข้า" (session เปิดล่าสุด) ไม่งั้น = เวรล่าสุด
  int _activeIndex(List<CheckinSession> ss) {
    for (var i = ss.length - 1; i >= 0; i--) {
      if (ss[i].isOpen) return i;
    }
    return ss.length - 1;
  }

  String _sessionShiftName(CheckinSession s) {
    final n = (s.inShift ?? s.outShift)?.name ?? '';
    return n.isEmpty ? 'เวร' : n;
  }

  /// แท็บเลือกเวร (โผล่เฉพาะควบเวร) — ✓ เขียว = จบแล้ว / จุด accent = กำลังเข้าเวร
  Widget _sessionTabs(List<CheckinSession> ss, int selected) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (var i = 0; i < ss.length; i++) ...[
            if (i > 0) const SizedBox(width: 8),
            _tabChip(ss[i], i, i == selected),
          ],
        ],
      ),
    );
  }

  Widget _tabChip(CheckinSession s, int i, bool sel) {
    final done = s.isDone;
    return Tappable(
      onTap: () => controller.todayTab.value = i,
      circle: true,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
        decoration: BoxDecoration(
          color: sel ? Nexus.pAccent.withValues(alpha: 0.12) : Nexus.pPanel,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: sel ? Nexus.pAccent.withValues(alpha: 0.5) : Nexus.pLine,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (done)
              Icon(PhosphorIconsRegular.checkCircle, size: 13, color: Nexus.pOk)
            else
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Nexus.pAccent,
                ),
              ),
            const SizedBox(width: 6),
            Text(
              _sessionShiftName(s),
              style: Nexus.body(
                size: 12,
                weight: sel ? FontWeight.w700 : FontWeight.w500,
                color: sel ? Nexus.pInk : Nexus.pSub,
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// อธิบายว่าทำไมเวรนี้มีเวลาออกทั้งที่ไม่ได้สแกนออกเอง (ควบเวร)
  void _showAutoOutInfo(String outTime) {
    Get.dialog(
      Dialog(
        backgroundColor:
            Nexus.pSheet, // ทึบ — pPanel โปร่งทำให้ทะลุเห็นข้างหลัง
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: BorderSide(color: Nexus.pLine),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    PhosphorIconsRegular.info,
                    size: 20,
                    color: Nexus.pAccent,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'ระบบลงเวลาออกให้',
                    style: Nexus.body(size: 15, weight: FontWeight.w700),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                'ระบบลงเวลาออกเวรนี้ให้ที่เวลาเลิกเวร ($outTime) โดยอัตโนมัติ '
                'เพราะคุณสแกนเข้าเวรถัดไปโดยยังไม่ได้สแกนออกเวรนี้\n\n'
                'ถ้าเวลาไม่ถูกต้อง แจ้งผู้ดูแลได้',
                style: Nexus.body(size: 12.5, color: Nexus.pSub),
              ),
              const SizedBox(height: 16),
              Align(
                alignment: Alignment.centerRight,
                child: Tappable(
                  onTap: Get.back,
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 18,
                      vertical: 9,
                    ),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      color: Nexus.pAccent.withValues(alpha: 0.15),
                      border: Border.all(
                        color: Nexus.pAccent.withValues(alpha: 0.4),
                      ),
                    ),
                    child: Text(
                      'เข้าใจแล้ว',
                      style: Nexus.body(
                        size: 13,
                        weight: FontWeight.w600,
                        color: Nexus.pAccent,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _punchCol(
    String label,
    String time,
    (String, Color)? badge, {
    bool borderRight = false,
    bool autoOut = false,
    VoidCallback? onAutoInfo,
  }) {
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: borderRight
          ? BoxDecoration(
              border: Border(right: BorderSide(color: Nexus.pDivider)),
            )
          : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Nexus.tech(size: 10, color: Nexus.pDim, spacing: 1),
          ),
          const SizedBox(height: 4),
          Text(time, style: Nexus.tech(size: 20, weight: FontWeight.w700)),
          if (badge != null)
            Padding(
              padding: const EdgeInsets.only(top: 7),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                decoration: BoxDecoration(
                  color: badge.$2.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(11),
                  border: Border.all(color: badge.$2.withValues(alpha: 0.4)),
                ),
                child: Text(
                  badge.$1,
                  style: Nexus.body(size: 10.5, color: badge.$2),
                ),
              ),
            ),
          // ควบเวร: เวลาออกนี้ระบบลงให้เอง — แตะดูคำอธิบาย
          if (autoOut)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Tappable(
                onTap: onAutoInfo,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      PhosphorIconsRegular.info,
                      size: 12,
                      color: Nexus.pMuted,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'ระบบลงให้',
                      style: Nexus.body(size: 10.5, color: Nexus.pMuted),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
