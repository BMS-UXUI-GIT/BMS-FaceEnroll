/// ค่าใบหน้าจำลองสำหรับเว็บเดโม — ไม่มี ML Kit ให้ตรวจจริง จึงเล่นตามสคริปต์วนลูป
///
/// ท่าครบทุกอย่างที่ liveness/ลงทะเบียนต้องใช้ (ตรง/ซ้าย/ขวา/เงย/กระพริบ/ยิ้ม)
/// เฟสละ 900 ms — ค้างพอให้ผ่านเกณฑ์ "นิ่ง" ของหน้าลงทะเบียนก่อนเปลี่ยนท่า
class DemoFacePose {
  const DemoFacePose(this.yaw, this.pitch, this.eyeOpen, this.smile);
  final double yaw; // + = หันซ้าย (normalize แล้ว)
  final double pitch; // + = เงยหน้า
  final double eyeOpen; // ความน่าจะเป็นตาเปิด (ทั้งสองข้าง)
  final double smile;

  /// ท่าปัจจุบันตามนาฬิกา — เรียกเมื่อไหร่ก็ได้ ไม่ต้องเก็บสถานะ
  static DemoFacePose now() =>
      _cycle[(DateTime.now().millisecondsSinceEpoch ~/ 900) % _cycle.length];

  static const _cycle = <DemoFacePose>[
    DemoFacePose(0, 0, 0.95, 0.05), // ตรง (หน้าลงทะเบียนถ่ายมุมนี้)
    DemoFacePose(0, 0, 0.95, 0.05), // ค้างอีกจังหวะ ให้ถ่ายทัน
    DemoFacePose(35, 0, 0.95, 0.05), // หันซ้าย
    DemoFacePose(35, 0, 0.95, 0.05),
    DemoFacePose(-35, 0, 0.95, 0.05), // หันขวา
    DemoFacePose(-35, 0, 0.95, 0.05),
    DemoFacePose(0, 25, 0.95, 0.05), // เงยหน้า
    DemoFacePose(0, 0, 0.95, 0.05), // ลืมตา (จังหวะแรกของกระพริบ)
    DemoFacePose(0, 0, 0.02, 0.05), // หลับตา (จังหวะสอง)
    DemoFacePose(0, 0, 0.95, 0.95), // ยิ้ม
  ];
}
