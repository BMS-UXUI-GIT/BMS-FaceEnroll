import 'package:get/get.dart';

import '../../services/api_service.dart';
import '../../services/audio_service.dart';
import '../../services/liveness_service.dart';
import '../../services/location_service.dart';
import '../../services/settings_service.dart';
import 'face_scan_controller.dart';

class FaceScanBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<ApiService>(() => ApiService(Get.find<SettingsService>()), fenix: true);
    Get.lazyPut<AudioService>(() => AudioService(), fenix: true);
    Get.lazyPut<LocationService>(() => LocationService(), fenix: true);
    Get.lazyPut<LivenessService>(() => LivenessService(), fenix: true);
    Get.lazyPut<FaceScanController>(() => FaceScanController());
  }
}
