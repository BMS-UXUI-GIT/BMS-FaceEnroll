import 'package:get/get.dart';

import '../../services/api_service.dart';
import '../../services/audio_service.dart';
import '../../services/settings_service.dart';
import 'registration_controller.dart';

class RegistrationBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<ApiService>(() => ApiService(Get.find<SettingsService>()), fenix: true);
    Get.lazyPut<AudioService>(() => AudioService(), fenix: true);
    Get.lazyPut<RegistrationController>(() => RegistrationController());
  }
}
