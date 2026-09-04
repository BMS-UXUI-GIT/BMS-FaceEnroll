import 'package:get/get.dart';

import '../../services/api_service.dart';
import '../../services/demo_api_service.dart';
import '../../services/settings_service.dart';
import 'login_controller.dart';

class LoginBinding extends Bindings {
  @override
  void dependencies() {
    // fenix: true = สร้างใหม่ถ้าโดน dispose (release lifecycle จัด dependency เข้มกว่า debug
    // — เดิมไม่มี fenix พอปิด bottom-sheet เลือกโรง ApiService โดนทิ้ง → login หาไม่เจอ)
    Get.lazyPut<ApiService>(() => buildApiService(Get.find<SettingsService>()), fenix: true);
    Get.lazyPut(() => LoginController());
  }
}
