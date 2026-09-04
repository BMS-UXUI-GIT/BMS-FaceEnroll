import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/widgets.dart';
import 'package:get/get.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../routes/app_pages.dart';
import 'demo_api_service.dart';
import 'settings_service.dart';

/// PIN ในเครื่อง (ไม่แตะ DB) — เก็บ hash+salt ใน SharedPreferences
/// + นับครั้งผิด/ล็อกชั่วคราว + จับ idle ตอนแอปกลับจาก background (app-lock)
/// ค่าความยาว/จำนวนครั้ง/เวลาล็อค มาจาก policy กลาง (admin ตั้งจาก dashboard)
class PinService extends GetxService with WidgetsBindingObserver {
  static const _kHash = 'pin_hash';
  static const _kSalt = 'pin_salt';
  static const _kLen = 'pin_len'; // ความยาว PIN ตอนที่ตั้งไว้ (คงที่ ไม่ผูกกับ policy)
  static const _kFail = 'pin_fail';
  static const _kLockUntil = 'pin_lock_until'; // epoch ms
  static const _kUnlockSeen = 'pin_unlock_seen'; // timestamp ปลดล็อคจาก admin ที่เครื่องนี้เห็นแล้ว

  SettingsService get _settings => Get.find<SettingsService>();
  int get pinLength => _settings.pinLength.value;

  /// ความยาว PIN ที่ใช้ "ตอนกรอกเพื่อยืนยัน" — อิงความยาวตอนตั้ง ไม่ใช่ policy ปัจจุบัน
  int get savedPinLength {
    final n = _prefs.getInt(_kLen) ?? 0;
    return n > 0 ? n : pinLength;
  }

  int get maxAttempts => _settings.pinMaxAttempts.value;
  Duration get lockDuration => Duration(seconds: _settings.pinLockSeconds.value);
  Duration get idleTimeout => Duration(minutes: _settings.pinIdleMinutes.value);

  late final SharedPreferences _prefs;
  DateTime? _pausedAt;

  Future<PinService> init() async {
    _prefs = await SharedPreferences.getInstance();
    WidgetsBinding.instance.addObserver(this);
    return this;
  }

  bool get hasPin => (_prefs.getString(_kHash) ?? '').isNotEmpty;

  /// ตั้ง/เปลี่ยน PIN — เก็บแค่ hash(salt:pin) ไม่เก็บ PIN ดิบ
  Future<void> setPin(String pin) async {
    final salt = _randomSalt();
    await _prefs.setString(_kSalt, salt);
    await _prefs.setString(_kHash, _hash(pin, salt));
    await _prefs.setInt(_kLen, pin.length); // จำความยาวไว้ใช้ตอนกรอกยืนยัน
    await _clearFails();
  }

  bool verify(String pin) {
    final salt = _prefs.getString(_kSalt) ?? '';
    final hash = _prefs.getString(_kHash) ?? '';
    if (salt.isEmpty || hash.isEmpty) return false;
    return _hash(pin, salt) == hash;
  }

  int get failCount => _prefs.getInt(_kFail) ?? 0;

  /// เหลือเวลาล็อกกี่วินาที (0 = ไม่ได้ล็อก)
  int lockSecondsLeft() {
    final until = _prefs.getInt(_kLockUntil) ?? 0;
    final left = until - DateTime.now().millisecondsSinceEpoch;
    return left > 0 ? (left / 1000).ceil() : 0;
  }

  /// ใส่ผิด → คืนจำนวนครั้งที่เหลือก่อนล็อก (0 = โดนล็อกแล้ว)
  Future<int> registerFail() async {
    final n = failCount + 1;
    if (n >= maxAttempts) {
      await _prefs.setInt(_kLockUntil, DateTime.now().add(lockDuration).millisecondsSinceEpoch);
      await _prefs.setInt(_kFail, 0);
      return 0;
    }
    await _prefs.setInt(_kFail, n);
    return maxAttempts - n;
  }

  /// ปลดล็อกสำเร็จ → ล้างตัวนับ
  Future<void> onUnlocked() => _clearFails();

  /// เช็คคำสั่ง "ปลดล็อค" จาก admin (dashboard) — ดึง policy แล้วดู pin_unlock_at
  /// timestamp ใหม่กว่าที่เครื่องนี้เคยเห็น + กำลังโดนล็อค → ปลดทันที (คืน true)
  Future<bool> tryRemoteUnlock() async {
    final api = buildApiService(_settings);
    try {
      final pol = await api.getPolicy();
      final ts = pol?['pin_unlock_at']?.toString() ?? '';
      if (ts.isEmpty) return false;
      final seen = _prefs.getString(_kUnlockSeen) ?? '';
      if (ts == seen) return false;
      await _prefs.setString(_kUnlockSeen, ts);
      if (lockSecondsLeft() > 0 || failCount > 0) {
        await _clearFails();
        return true;
      }
      return false; // ไม่ได้ล็อคอยู่ — แค่จำ timestamp ไว้ (กันปลดย้อนหลัง)
    } catch (_) {
      return false;
    } finally {
      api.dispose();
    }
  }

  Future<void> _clearFails() async {
    await _prefs.remove(_kFail);
    await _prefs.remove(_kLockUntil);
  }

  String _hash(String pin, String salt) => sha256.convert(utf8.encode('$salt:$pin')).toString();

  String _randomSalt() {
    final r = Random.secure();
    return base64Url.encode(List<int>.generate(16, (_) => r.nextInt(256)));
  }

  // ---- app-lock: ล็อกตอนกลับจาก background นานเกิน idleTimeout ----
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      _pausedAt = DateTime.now();
    } else if (state == AppLifecycleState.resumed) {
      final paused = _pausedAt;
      _pausedAt = null;
      if (paused != null && DateTime.now().difference(paused) >= idleTimeout) {
        _lockNow();
      }
    }
  }

  void _lockNow() {
    final settings = Get.find<SettingsService>();
    if (!hasPin || !settings.isLoggedIn.value) return;
    if (Get.currentRoute == Routes.enterPin) return; // อยู่หน้า PIN อยู่แล้ว
    Get.toNamed(Routes.enterPin, arguments: {'purpose': 'overlay'});
  }

  @override
  void onClose() {
    WidgetsBinding.instance.removeObserver(this);
    super.onClose();
  }
}
