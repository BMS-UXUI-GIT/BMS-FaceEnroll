import 'package:get/get.dart';

import '../../services/api_service.dart';
import '../../services/settings_service.dart';
import 'home_controller.dart';

class HomeBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<ApiService>(() => ApiService(Get.find<SettingsService>()), fenix: true);
    Get.lazyPut<HomeController>(() => HomeController());
  }
}
