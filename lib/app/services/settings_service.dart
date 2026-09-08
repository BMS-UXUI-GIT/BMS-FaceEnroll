import 'dart:convert';

import 'package:get/get.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../config/api_config.dart';

/// การตั้งค่าประจำเครื่อง — เก็บใน SharedPreferences
/// ค่าหลักคือ "เลขโรงพยาบาล (hcode)" + session ของพนักงานที่ login (emp_id/ชื่อ)
class SettingsService extends GetxService {
  late final SharedPreferences _prefs;

  // ---- โรงพยาบาล ----
  final hcode = ''.obs;
  final hospitalName =
      ''.obs; // ชื่อ รพ. ที่เลือก (เก็บไว้โชว์ในแอป — คู่กับ hcode)

  // ---- session พนักงานที่ login (HOSxP) ----
  final isLoggedIn = false.obs;
  final empId = ''.obs;
  final staffName = ''.obs;
  final loginName = ''.obs;

  // ---- ปรับค่ากล้อง / การตรวจจับ ----
  final throttlerMs = 300.obs;
  final minFaceWidthPercent = 30.obs;
  final requestTimeoutMs = 15000.obs;

  // ---- หน้าจอ / อุปกรณ์ ----
  final dimScreen = false.obs;
  final showBattery = false.obs;
  final keepScreenOn = true.obs;
  final fillLight = false.obs; // ไฟส่องหน้า (เร่งจอสว่างตอนสแกน ช่วยที่แสงน้อย)

  // ---- Liveness (กันปลอม) ----
  final isEnableLivenessDetection = false.obs; // ค่าเริ่มต้น = ปิด
  final livenessRandomCount = 2.obs;
  final selectedLivenessType = 'random'.obs;
  // เกณฑ์ liveness (จาก policy กลาง — เดิม hardcode ใน liveness_service)
  final livenessYawDeg = 20.0.obs; // องศาหันซ้าย/ขวา
  final livenessPitchDeg = 12.0.obs; // องศาเงยหน้า
  final livenessEyeOpen = 0.8.obs; // เกณฑ์ลืมตา (ท่ากระพริบ)
  final livenessSmile = 0.8.obs; // เกณฑ์ยิ้ม

  // ---- Confirm ก่อนลงเวลา ----
  final isEnableConfirmPopup = false.obs;
  final isEnableSmileConfirmation = false.obs;

  // ---- GPS ตอนลงเวลา (logic ระบบเก่า — เปิดแล้วต้องได้พิกัดก่อนถึงลงเวลาได้) ----
  final isEnableLocationEnrolling = true.obs;
  // จุดลงเวลาของโรงจาก policy กลาง [{id,name,lat,lng,radius_m}] (เก็บเป็น JSON string) — ว่าง = ไม่จำกัดพื้นที่
  final gpsLocationsJson = '[]'.obs;

  // ---- PIN ล็อกแอป (ค่าจาก policy กลาง) ----
  final pinLength = 6.obs;
  final pinMaxAttempts = 5.obs;
  final pinLockSeconds = 60.obs;
  final pinIdleMinutes = 5.obs;
  final pinUnlockAt =
      ''.obs; // timestamp ล่าสุดที่ admin กดปลดล็อคจาก dashboard

  // ---- แจ้งเตือน (แยกช่องทาง) ----
  final bmsNotiEnabled = false.obs;
  final notiToken = ''.obs;
  final telegramNotiEnabled = false.obs;
  final telegramBotToken = ''.obs;
  final telegramChatId = ''.obs;

  // ---- อื่นๆ ----
  final contactMsg = ''.obs;

  // ---- ธีม — โหมดมืด/สว่าง (accent คงสีฟ้าอย่างเดียว) ----
  final themeMode = 'dark'.obs; // 'dark' | 'light'

  // ---- เลข version แอป (โชว์หน้า login/home) — โหลดครั้งเดียวตอน init ----
  final appVersion = ''.obs;

  bool get isTestHospital => hcode.value == ApiConfig.testHcode;
  String get baseUrl => ApiConfig.faceScanUrl;
  double get minFaceWidthRatio => minFaceWidthPercent.value / 100.0;
  bool get isConfigured => hcode.value.isNotEmpty;

  Future<SettingsService> init() async {
    final p = _prefs = await SharedPreferences.getInstance();
    hcode.value = p.getString('hcode') ?? '';
    hospitalName.value = p.getString('hospitalName') ?? '';
    isLoggedIn.value = p.getBool('isLoggedIn') ?? false;
    empId.value = p.getString('empId') ?? '';
    staffName.value = p.getString('staffName') ?? '';
    loginName.value = p.getString('loginName') ?? '';
    throttlerMs.value = p.getInt('throttlerMs') ?? 300;
    minFaceWidthPercent.value = (p.getInt('minFaceWidthPercent') ?? 30).clamp(
      10,
      90,
    );
    requestTimeoutMs.value = (p.getInt('requestTimeoutMs') ?? 15000).clamp(
      10000,
      30000,
    ); // ยิงข้ามเน็ตจริง ต่ำกว่า 10 วิ timeout ปลอมบ่อย
    dimScreen.value = p.getBool('dimScreen') ?? false;
    showBattery.value = p.getBool('showBattery') ?? false;
    keepScreenOn.value = p.getBool('keepScreenOn') ?? true;
    fillLight.value = p.getBool('fillLight') ?? false;
    isEnableLivenessDetection.value =
        p.getBool('isEnableLivenessDetection') ?? false;
    livenessRandomCount.value = (p.getInt('livenessRandomCount') ?? 2).clamp(
      1,
      5,
    );
    selectedLivenessType.value =
        p.getString('selectedLivenessType') ?? 'random';
    isEnableConfirmPopup.value = p.getBool('isEnableConfirmPopup') ?? false;
    isEnableSmileConfirmation.value =
        p.getBool('isEnableSmileConfirmation') ?? false;
    isEnableLocationEnrolling.value =
        p.getBool('isEnableLocationEnrolling') ?? true;
    livenessYawDeg.value = p.getDouble('livenessYawDeg') ?? 20.0;
    livenessPitchDeg.value = p.getDouble('livenessPitchDeg') ?? 12.0;
    livenessEyeOpen.value = p.getDouble('livenessEyeOpen') ?? 0.8;
    livenessSmile.value = p.getDouble('livenessSmile') ?? 0.8;
    gpsLocationsJson.value = p.getString('gpsLocationsJson') ?? '[]';
    pinLength.value = p.getInt('pinLength') ?? 6;
    pinMaxAttempts.value = p.getInt('pinMaxAttempts') ?? 5;
    pinLockSeconds.value = p.getInt('pinLockSeconds') ?? 60;
    pinIdleMinutes.value = p.getInt('pinIdleMinutes') ?? 5;
    pinUnlockAt.value = p.getString('pinUnlockAt') ?? '';
    bmsNotiEnabled.value = p.getBool('bmsNotiEnabled') ?? false;
    notiToken.value = p.getString('notiToken') ?? '';
    telegramNotiEnabled.value = p.getBool('telegramNotiEnabled') ?? false;
    telegramBotToken.value = p.getString('telegramBotToken') ?? '';
    telegramChatId.value = p.getString('telegramChatId') ?? '';
    contactMsg.value = p.getString('contactMsg') ?? '';
    themeMode.value = p.getString('themeMode') ?? 'dark';

    // เลข version จาก pubspec (เช่น 0.1.0+1) — กันพังถ้าโหลดไม่ได้ (เช่นใน test)
    try {
      final info = await PackageInfo.fromPlatform();
      appVersion.value = 'v${info.version}+${info.buildNumber}';
    } catch (_) {
      appVersion.value = '';
    }
    return this;
  }

  /// persist ค่าตั้งค่า (view ผูกกับ .obs ตรงๆ แล้วกดบันทึก)
  Future<void> save() async {
    final p = _prefs;
    hcode.value = hcode.value.trim();
    await p.setString('hcode', hcode.value);
    await p.setString('hospitalName', hospitalName.value.trim());
    await p.setInt('throttlerMs', throttlerMs.value);
    await p.setInt('minFaceWidthPercent', minFaceWidthPercent.value);
    await p.setInt('requestTimeoutMs', requestTimeoutMs.value);
    await p.setBool('dimScreen', dimScreen.value);
    await p.setBool('showBattery', showBattery.value);
    await p.setBool('keepScreenOn', keepScreenOn.value);
    await p.setBool('fillLight', fillLight.value);
    await p.setBool(
      'isEnableLivenessDetection',
      isEnableLivenessDetection.value,
    );
    await p.setInt('livenessRandomCount', livenessRandomCount.value);
    await p.setString('selectedLivenessType', selectedLivenessType.value);
    await p.setBool('isEnableConfirmPopup', isEnableConfirmPopup.value);
    await p.setBool(
      'isEnableSmileConfirmation',
      isEnableSmileConfirmation.value,
    );
    await p.setBool(
      'isEnableLocationEnrolling',
      isEnableLocationEnrolling.value,
    );
    await p.setBool('bmsNotiEnabled', bmsNotiEnabled.value);
    await p.setString('notiToken', notiToken.value.trim());
    await p.setBool('telegramNotiEnabled', telegramNotiEnabled.value);
    await p.setString('telegramBotToken', telegramBotToken.value.trim());
    await p.setString('telegramChatId', telegramChatId.value.trim());
    await p.setString('contactMsg', contactMsg.value.trim());
    await p.setString('themeMode', themeMode.value);
  }

  /// รับ policy กลางจาก server (GET /{hcode}/policy) มาทับค่าในเครื่อง + persist
  /// เรียกตอน login สำเร็จ — admin ตั้งจาก dashboard, พนักงานแก้เองไม่ได้
  Future<void> applyPolicy(Map<String, dynamic> pol) async {
    double d(String k, double def) => (pol[k] as num?)?.toDouble() ?? def;
    int i(String k, int def) => (pol[k] as num?)?.toInt() ?? def;
    bool b(String k, bool def) => pol[k] as bool? ?? def;
    String s(String k, String def) => pol[k]?.toString() ?? def;

    isEnableLivenessDetection.value = b(
      'liveness_enabled',
      isEnableLivenessDetection.value,
    );
    livenessRandomCount.value = i(
      'liveness_count',
      livenessRandomCount.value,
    ).clamp(1, 5);
    selectedLivenessType.value = s('liveness_type', selectedLivenessType.value);
    livenessYawDeg.value = d('liveness_yaw_deg', livenessYawDeg.value);
    livenessPitchDeg.value = d('liveness_pitch_deg', livenessPitchDeg.value);
    livenessEyeOpen.value = d('liveness_eye_open', livenessEyeOpen.value);
    livenessSmile.value = d('liveness_smile', livenessSmile.value);
    isEnableLocationEnrolling.value = b(
      'gps_required',
      isEnableLocationEnrolling.value,
    );
    final locs = pol['gps_locations'];
    if (locs is List) gpsLocationsJson.value = jsonEncode(locs);
    isEnableSmileConfirmation.value = b(
      'smile_confirm',
      isEnableSmileConfirmation.value,
    );
    isEnableConfirmPopup.value = b('confirm_popup', isEnableConfirmPopup.value);
    minFaceWidthPercent.value = i(
      'min_face_width',
      minFaceWidthPercent.value,
    ).clamp(10, 90);
    bmsNotiEnabled.value = b('bms_noti', bmsNotiEnabled.value);
    final tok = s('noti_token', '');
    if (tok.isNotEmpty) notiToken.value = tok;
    telegramNotiEnabled.value = b('telegram_noti', telegramNotiEnabled.value);
    final tgTok = s('telegram_bot_token', '');
    if (tgTok.isNotEmpty) telegramBotToken.value = tgTok;
    final tgChat = s('telegram_chat_id', '');
    if (tgChat.isNotEmpty) telegramChatId.value = tgChat;
    pinLength.value = i('pin_length', pinLength.value).clamp(4, 8);
    pinMaxAttempts.value = i('pin_max_attempts', pinMaxAttempts.value);
    pinLockSeconds.value = i('pin_lock_seconds', pinLockSeconds.value);
    pinIdleMinutes.value = i('pin_idle_minutes', pinIdleMinutes.value);
    pinUnlockAt.value = s('pin_unlock_at', pinUnlockAt.value);

    final p = _prefs;
    await save();
    await p.setDouble('livenessYawDeg', livenessYawDeg.value);
    await p.setDouble('livenessPitchDeg', livenessPitchDeg.value);
    await p.setDouble('livenessEyeOpen', livenessEyeOpen.value);
    await p.setDouble('livenessSmile', livenessSmile.value);
    await p.setString('gpsLocationsJson', gpsLocationsJson.value);
    await p.setInt('pinLength', pinLength.value);
    await p.setInt('pinMaxAttempts', pinMaxAttempts.value);
    await p.setInt('pinLockSeconds', pinLockSeconds.value);
    await p.setInt('pinIdleMinutes', pinIdleMinutes.value);
    await p.setString('pinUnlockAt', pinUnlockAt.value);
  }

  /// บันทึก session หลัง login สำเร็จ
  Future<void> setSession({
    required String empId,
    required String name,
    required String loginName,
  }) async {
    this.empId.value = empId;
    staffName.value = name;
    this.loginName.value = loginName;
    isLoggedIn.value = true;
    final p = _prefs;
    await p.setBool('isLoggedIn', true);
    await p.setString('empId', empId);
    await p.setString('staffName', name);
    await p.setString('loginName', loginName);
  }

  /// ออกจากระบบ (ล้าง session — ไม่ลบ hcode/ตั้งค่าเครื่อง)
  Future<void> logout() async {
    isLoggedIn.value = false;
    empId.value = '';
    staffName.value = '';
    loginName.value = '';
    final p = _prefs;
    await p.setBool('isLoggedIn', false);
    await p.remove('empId');
    await p.remove('staffName');
    await p.remove('loginName');
  }
}
