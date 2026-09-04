import 'dart:async';
import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../../models/checkin.dart';
import '../../routes/app_pages.dart';
import '../../services/api_service.dart';
import '../../services/checkin_service.dart';
import '../../services/pin_service.dart';
import '../../services/settings_service.dart';
import '../../theme/nexus.dart';

/// หน้า login พนักงาน (HOSxP) — loginname + password -> attendance /{hcode}/login
/// สำเร็จ -> เก็บ session (emp_id/ชื่อ) แล้วไปหน้าหลัก
class LoginController extends GetxController {
  final settings = Get.find<SettingsService>();
  ApiService get _api => Get.find<ApiService>();

  final loginCtrl = TextEditingController();
  final passCtrl = TextEditingController();
  final busy = false.obs;
  final message = ''.obs;
  final obscure = true.obs; // ซ่อน/แสดงรหัสผ่าน (ปุ่มตา)

  Future<void> doLogin() async {
    final hcode = settings.hcode.value.trim();
    if (hcode.isEmpty) {
      message.value = 'ตั้งค่าเลขโรงพยาบาลก่อน (กดรูปเฟือง ⚙️)';
      return;
    }
    final ln = loginCtrl.text.trim();
    final pw = passCtrl.text.trim();
    if (ln.isEmpty || pw.isEmpty) {
      message.value = 'กรอกชื่อผู้ใช้และรหัสผ่าน';
      return;
    }
    busy.value = true;
    message.value = '';
    try {
      final r = await _api.login(hcode, ln, pw);
      if (!r.ok) {
        message.value = r.message.isEmpty ? 'เข้าระบบไม่สำเร็จ' : r.message;
        return;
      }
      await settings.setSession(empId: r.empId, name: r.name, loginName: ln);
      passCtrl.clear();
      // ดึง policy กลางของโรง (admin ตั้งจาก dashboard) มาทับค่าในเครื่อง (best-effort)
      try {
        final pol = await _api.getPolicy();
        if (pol != null) await settings.applyPolicy(pol);
      } catch (_) {}
      // ดึงเวรเก็บ local ไว้คิดสาย/ก่อนเวลา (best-effort — ดึงไม่ได้ก็ไม่บล็อก login)
      try {
        final sh = await _api.getShifts();
        await Get.find<CheckinService>().setShifts(
          sh.map((e) => Shift(id: e.id, name: e.name, timeStart: e.timeStart, timeEnd: e.timeEnd)).toList(),
        );
      } catch (_) {}
      // ยังไม่เคยตั้ง PIN → ตั้งก่อนเข้า home / มีแล้ว → เข้าเลย (เพิ่ง auth แล้ว ไม่ต้องใส่ PIN ซ้ำ)
      final pin = Get.find<PinService>();
      Get.offAllNamed(pin.hasPin ? Routes.home : Routes.setPin);
    } catch (e) {
      message.value = e is TimeoutException
          ? 'เซิร์ฟเวอร์ตอบช้าเกินเวลา — เช็คสัญญาณเน็ตแล้วลองใหม่'
          : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — ตรวจเลขโรง/เครือข่าย';
    } finally {
      busy.value = false;
    }
  }

  Future<void> saveHcode(String h) async {
    settings.hcode.value = h.trim();
    await settings.save();
    message.value = settings.hcode.value.isEmpty ? '' : 'ตั้งโรงพยาบาล ${settings.hcode.value} แล้ว';
  }

  /// สลับ theme มืด/สว่าง จากหน้า login
  void toggleTheme() {
    final dark = settings.themeMode.value != 'dark';
    settings.themeMode.value = dark ? 'dark' : 'light';
    Nexus.applyMode(dark);
    settings.save();
    Get.forceAppUpdate();
  }

  /// ค้นรายชื่อโรงพยาบาล (ให้ dropdown ใน login) — q ว่าง = รายการแรกๆ
  Future<List<Hospital>> searchHospitals(String q) => _api.getHospitals(q);

  /// เลือกโรงพยาบาลจาก dropdown -> เก็บทั้งเลข + ชื่อ (โชว์ในแอป)
  Future<void> saveHospital(String hcode, String name) async {
    settings.hcode.value = hcode.trim();
    settings.hospitalName.value = name.trim();
    await settings.save();
    message.value = '';
  }

  @override
  void onClose() {
    loginCtrl.dispose();
    passCtrl.dispose();
    super.onClose();
  }
}
