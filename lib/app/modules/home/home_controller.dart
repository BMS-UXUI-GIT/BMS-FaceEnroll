import 'package:get/get.dart';

import '../../models/checkin.dart';
import '../../routes/app_pages.dart';
import '../../services/api_service.dart';
import '../../services/checkin_service.dart';
import '../../services/settings_service.dart';
import '../shell/shell_controller.dart';

/// หน้าหลัก — การ์ดวันนี้ (จาก CheckinService) + สถานะลงทะเบียน + ปุ่มลงเวลารู้สถานะ
class HomeController extends GetxController {
  final settings = Get.find<SettingsService>();
  final checkin = Get.find<CheckinService>();
  ApiService get _api => Get.find<ApiService>();

  final registered = Rxn<bool>(); // null = ยังไม่รู้/เช็คไม่ได้ (เน็ต)

  // การ์ดวันนี้: แท็บเวรที่เลือกดู (-1 = auto ตามเวรที่กำลังเข้า) — โผล่เฉพาะควบเวร (>1 session)
  final todayTab = (-1).obs;
  int _lastSessionLen = 0;

  @override
  void onInit() {
    checkMissedOut();
    super.onInit();
    checkRegistration();
    _refreshPolicy();
    _refreshShifts();
    // มีเวรใหม่เพิ่ม (สแกนเข้าเวรถัดไป) → เด้งกลับไปแท็บเวรที่กำลังเข้า ไม่ค้างแท็บเก่า
    _lastSessionLen = checkin.sessions.length;
    ever(checkin.sessions, (list) {
      if (list.length != _lastSessionLen) {
        _lastSessionLen = list.length;
        todayTab.value = -1;
      }
    });
  }

  /// ดึงตั้งค่ากลางของโรง (admin แก้จาก dashboard) ทุกครั้งที่เข้าหน้าหลัก
  Future<void> _refreshPolicy() async {
    try {
      final pol = await _api.getPolicy();
      if (pol != null) await settings.applyPolicy(pol);
    } catch (_) {}
  }

  /// ดึงรายชื่อเวรใหม่ทุกครั้งที่เข้าหน้าหลัก (เปิดแอพใหม่ก็ได้ชุดล่าสุด ไม่ต้อง logout)
  /// ดึงไม่ได้ = ใช้ชุดเดิมใน cache ต่อ ไม่ล้างทิ้ง
  Future<void> _refreshShifts() async {
    try {
      final sh = await _api.getShifts();
      if (sh.isEmpty) return;
      await checkin.setShifts(
        sh
            .map(
              (e) => Shift(
                id: e.id,
                name: e.name,
                timeStart: e.timeStart,
                timeEnd: e.timeEnd,
              ),
            )
            .toList(),
      );
    } catch (_) {}
  }

  /// เช็คว่าลงทะเบียนใบหน้าแล้วหรือยัง (จาก emp_id)
  Future<void> checkRegistration() async {
    final emp = settings.empId.value;
    if (emp.isEmpty) {
      registered.value = false;
      return;
    }
    try {
      final ids = await _api.findSubjectIdsByEmpId(emp);
      registered.value = ids.isNotEmpty;
    } catch (_) {
      registered.value = null; // เช็คไม่ได้ — ไม่ฟันธง (ปล่อยให้ลองได้)
    }
  }

  /// ไปสแกน — ส่ง "suggest" (in/out ที่ควรเป็นต่อไป) ให้ confirm popup เป็นค่าเริ่มต้น
  void startScan() {
    Get.toNamed(Routes.faceScan, arguments: {'suggest': checkin.nextAction});
  }

  /// ลงทะเบียน — กลับมาแล้ว re-check สถานะ
  void startRegister() {
    Get.toNamed(Routes.registration)?.then((_) => checkRegistration());
  }

  /// สลับไปแท็บประวัติ (เมนูย้ายไปแท็บล่างแล้ว)
  void goMyTime() => Get.find<ShellController>().go(2);

  /// ตั้งค่าเป็นหน้าแยก — เปิดจากเฟืองมุมขวาบน
  void goSettings() => Get.toNamed(Routes.settings);

  /// วันก่อนหน้าที่ลืมลงเวลาออก (เตือนบน home) — best-effort ไม่บล็อค
  final missedOutDate = RxnString();
  Future<void> checkMissedOut() async {
    try {
      final att = await _api.myAttendance(days: 3);
      final today = DateTime.now().toIso8601String().substring(0, 10);
      for (final r in ((att['rows'] as List?) ?? []).whereType<Map>()) {
        if (r['date'] == today) continue;
        if (r['no_out'] == true) {
          missedOutDate.value = r['date'] as String?;
          return;
        }
      }
      missedOutDate.value = null;
    } catch (_) {}
  }
}
