import 'package:get/get.dart';

import '../modules/dashboard/dashboard_view.dart';
import '../modules/face_scan/face_scan_binding.dart';
import '../modules/face_scan/face_scan_view.dart';
import '../modules/login/login_binding.dart';
import '../modules/login/login_view.dart';
import '../modules/pin/enter_pin.dart';
import '../modules/pin/set_pin.dart';
import '../modules/registration/registration_binding.dart';
import '../modules/registration/registration_view.dart';
import '../modules/settings/settings_controller.dart';
import '../modules/settings/settings_view.dart';
import '../modules/shell/shell_view.dart';

abstract class Routes {
  static const login = '/login';
  static const home = '/home';
  static const faceScan = '/face-scan';
  static const registration = '/registration';
  static const settings = '/settings';
  static const setPin = '/set-pin';
  static const enterPin = '/enter-pin';
  static const fixRequest = '/fix-request';
  static const fixRequestForm = '/fix-request/form';
}

abstract class AppPages {
  static const initial = Routes.login;

  static final pages = <GetPage>[
    GetPage(
      name: Routes.login,
      page: () => const LoginView(),
      binding: LoginBinding(),
    ),
    // home = โครงแท็บล่าง (หน้าหลัก/ประวัติ + ปุ่มสแกนกลาง dock) — ตั้งค่าเป็นหน้าแยก push จากเฟืองบน home
    GetPage(
      name: Routes.home,
      page: () => const ShellView(),
      binding: ShellBinding(),
    ),
    GetPage(
      name: Routes.settings,
      page: () => const SettingsView(),
      binding: SettingsBinding(),
    ),
    GetPage(
      name: Routes.faceScan,
      page: () => const FaceScanView(),
      binding: FaceScanBinding(),
    ),
    GetPage(
      name: Routes.registration,
      page: () => const RegistrationView(),
      binding: RegistrationBinding(),
    ),
    GetPage(
      name: Routes.setPin,
      page: () => const SetPinView(),
      binding: SetPinBinding(),
    ),
    GetPage(
      name: Routes.enterPin,
      page: () => const EnterPinView(),
      binding: EnterPinBinding(),
    ),
    // รายการที่ต้องขอแก้ไข — เปิดจากการ์ดแจ้งเตือนบนแดชบอร์ด (ข้อมูลส่งมาทาง arguments)
    GetPage(name: Routes.fixRequest, page: () => const FixRequestView()),
    // ฟอร์มขอแก้ไขของหนึ่งวัน — คืน true เมื่อกดส่ง
    GetPage(
      name: Routes.fixRequestForm,
      page: () => const FixRequestFormView(),
    ),
  ];
}
