import 'package:get/get.dart';

import '../my_time/my_time.dart';

/// คุมแท็บล่างของโครงหลัก (0 หน้าหลัก / 1 แดชบอร์ด / 2 ประวัติ / 3 บัญชี)
class ShellController extends GetxController {
  final tab = 0.obs;
  final built = <int>{0}.obs; // สร้างแท็บเมื่อเปิดครั้งแรก (ประวัติจะได้ไม่ยิง API ตั้งแต่ login)

  void go(int i) {
    final first = !built.contains(i);
    built.add(i);
    tab.value = i;
    // กลับเข้าแท็บประวัติ = ดึงข้อมูลล่าสุด (เพิ่งสแกนเสร็จจะได้เห็นทันที)
    if (i == 2 && !first && Get.isRegistered<MyTimeController>()) {
      Get.find<MyTimeController>().refreshAll();
    }
  }
}
