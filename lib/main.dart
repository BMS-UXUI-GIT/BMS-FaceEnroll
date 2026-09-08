import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:get/get.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import 'app/config/demo_mode.dart';
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
  // เว็บ prototype: ข้าม login/PIN เข้าหน้าแดชบอร์ดเลย — คนที่เปิดลิงก์มาดู UI ไม่มีบัญชีจริงให้กรอก
  if (kDemoBuild) {
    if (!settings.isLoggedIn.value) {
      await settings.setSession(
        empId: '3926',
        name: 'อมล กุวาน่า',
        loginName: 'demo',
      );
    }
    runApp(const BmsFaceScanApp(initialRoute: Routes.home));
    return;
  }
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

  /// เว็บ prototype: กรอบมือถือรอบนอกบอกความสูงแถบสถานะ/แถบ home มาทาง query
  /// (index.html?safeTop=44&safeBottom=34) แอปจะได้กันพื้นที่เองเหมือนอยู่บนเครื่องจริง
  /// พื้นตรงนั้นจึงเป็นสีของแอป ไม่ใช่แถบดำของกรอบ
  static EdgeInsets get _demoInsets {
    final q = Uri.base.queryParameters;
    return EdgeInsets.only(
      top: double.tryParse(q['safeTop'] ?? '') ?? 0,
      bottom: double.tryParse(q['safeBottom'] ?? '') ?? 0,
    );
  }

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      title: 'FaceCheck',
      debugShowCheckedModeBanner: false,
      theme: Nexus.themeData,
      initialRoute: initialRoute,
      // เว็บ prototype: ซ่อนแถบเลื่อนของเดสก์ท็อป ให้เหมือนดูบนมือถือจริง
      scrollBehavior: kDemoBuild ? const _NoScrollbar() : null,
      builder: kDemoBuild
          ? (context, child) {
              final mq = MediaQuery.of(context);
              final pad = _demoInsets;
              return MediaQuery(
                data: mq.copyWith(padding: pad, viewPadding: pad),
                child: child ?? const SizedBox.shrink(),
              );
            }
          : null,
      getPages: AppPages.pages,
    );
  }
}

/// พฤติกรรมการเลื่อนของ build เดโม — ไม่วาดแถบเลื่อน แต่ยังลากด้วยเมาส์ได้
class _NoScrollbar extends MaterialScrollBehavior {
  const _NoScrollbar();

  @override
  Widget buildScrollbar(
    BuildContext context,
    Widget child,
    ScrollableDetails details,
  ) => child;

  @override
  Set<PointerDeviceKind> get dragDevices => {
    PointerDeviceKind.touch,
    PointerDeviceKind.mouse,
    PointerDeviceKind.trackpad,
    PointerDeviceKind.stylus,
  };
}
