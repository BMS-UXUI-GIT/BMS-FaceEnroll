import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:get/get.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import 'app/routes/app_pages.dart';
import 'app/services/checkin_service.dart';
import 'app/services/pin_service.dart';
import 'app/services/settings_service.dart';
import 'app/theme/nexus.dart';

/// เครื่องมือวัดเฟรม (build/raster เป็นไมโครวินาที) — ทำงานเฉพาะ profile build
/// เปิดเมื่อจะจูนประสิทธิภาพ แล้วอ่านค่าจาก logcat บรรทัดที่ขึ้นต้นด้วย FT
const bool kPerfLog = false;

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (kPerfLog && kProfileMode) {
    SchedulerBinding.instance.addTimingsCallback((frames) {
      for (final f in frames) {
        debugPrint(
          'FT ${f.buildDuration.inMicroseconds} '
          '${f.rasterDuration.inMicroseconds} '
          '${f.totalSpan.inMicroseconds}',
        );
      }
    });
  }
  final settings = await Get.putAsync(
    () => SettingsService().init(),
    permanent: true,
  );
  Nexus.applyMode(
    settings.themeMode.value == 'dark',
  ); // โหมดธีมที่ผู้ใช้ตั้งไว้
  final pin = await Get.putAsync(() => PinService().init(), permanent: true);
  await Get.putAsync(() => CheckinService().init(), permanent: true);
  if (settings.keepScreenOn.value) await WakelockPlus.enable();
  // ยังไม่ login -> login / login แล้วแต่ยังไม่ตั้ง PIN -> ตั้ง PIN / มี PIN -> ใส่ PIN ปลดล็อก (#1 cold start)
  final String start;
  if (!settings.isLoggedIn.value) {
    start = Routes.login;
  } else if (!pin.hasPin) {
    start = Routes.setPin;
  } else {
    start = Routes.enterPin;
  }
  runApp(BmsFaceScanApp(initialRoute: start));
}

class BmsFaceScanApp extends StatelessWidget {
  const BmsFaceScanApp({super.key, required this.initialRoute});
  final String initialRoute;

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      title: 'FaceCheck',
      debugShowCheckedModeBanner: false,
      theme: Nexus.themeData,
      initialRoute: initialRoute,
      getPages: AppPages.pages,
    );
  }
}
