/// ท่า liveness ที่ใช้กันการเอารูป/จอปลอมมาสแกน
enum FaceLivenessAction {
  blink('กรุณากระพริบตา', 'audios/face_direction_blink.mp3'),
  smile('กรุณายิ้ม', 'audios/face_direction_smile.mp3'),
  left('กรุณาหันหน้าไปทางซ้าย', 'audios/face_direction_left.mp3'),
  right('กรุณาหันหน้าไปทางขวา', 'audios/face_direction_right.mp3'),
  up('กรุณาเงยหน้าขึ้น', 'audios/face_direction_up.mp3');

  const FaceLivenessAction(this.instruction, this.audioPath);

  /// ข้อความบอกผู้ใช้
  final String instruction;

  /// ไฟล์เสียงสั่ง (AssetSource — สัมพัทธ์กับ assets/)
  final String audioPath;

  static FaceLivenessAction? fromKey(String key) {
    for (final a in FaceLivenessAction.values) {
      if (a.name == key) return a;
    }
    return null;
  }
}
