import 'package:get/get.dart';

import '../../config/demo_mode.dart';
import '../my_time/my_time.dart';

/// คุมแท็บล่างของโครงหลัก (0 หน้าหลัก / 1 แดชบอร์ด / 2 ประวัติ / 3 บัญชี)
class ShellController extends GetxController {
  /// เว็บ prototype เปิดมาที่แดชบอร์ดเลย — บนมือถือยังเริ่มที่หน้าหลักเหมือนเดิม
  ///
  /// ส่งลิงก์เจาะไปแท็บอื่นได้ด้วย ?tab=0..3 — ใช้ตอนเก็บภาพหน้าจอและตอนส่งลิงก์
  /// ให้คนอื่นดูเฉพาะหน้าที่ต้องการ (build มือถือจริงไม่อ่านค่านี้)
  static int get _first {
    if (!kDemoBuild) return 0;
    final q = int.tryParse(Uri.base.queryParameters['tab'] ?? '');
    return q != null && q >= 0 && q <= 3 ? q : 1;
  }

  final int _start = _first;
  late final tab = _start.obs;
  late final built = <int>{
    _start,
  }.obs; // สร้างแท็บเมื่อเปิดครั้งแรก (ประวัติจะได้ไม่ยิง API ตั้งแต่ login)

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
