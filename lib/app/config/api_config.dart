/// คุยกับ 2 backend แยกกัน (deploy แยก):
///   - face-scan service : ลงทะเบียน + สแกน (match) + คืน subject_id
///   - attendance service: login พนักงาน + เอา emp_id ไปลงเวลา (hos staff)
class ApiConfig {
  ApiConfig._();

  /// URL face-scan service (register/match) — ฝังตอน build
  /// prod: face-enroll-cloud deploy แล้วที่ facehub.bmscloud.in.th (override ได้ด้วย --dart-define)
  static const String faceScanUrl = String.fromEnvironment(
    'FACE_SCAN_URL',
    defaultValue: 'https://facehub.bmscloud.in.th',
  );

  /// URL attendance service (ลงเวลา) — prod จริง (เทสในเครื่อง override ด้วย --dart-define)
  static const String attendanceUrl = String.fromEnvironment(
    'ATTENDANCE_URL',
    defaultValue: 'https://face-check-api.bmscloud.in.th',
  );

  /// api key ของแอปนี้ (Bearer ให้ face-scan resolve app_id)
  /// ห้ามใส่ค่าจริงเป็น default — repo นี้เป็น public prototype
  /// build จริงส่งผ่าน --dart-define=API_KEY=...
  static const String apiKey = String.fromEnvironment('API_KEY');

  // face-scan paths
  static const String pathMatch = '/match';
  static const String pathRegister = '/register';
  static const String pathHealth = '/health';
  // attendance path: {attendanceUrl}/{hcode}/?Data=DoorEnroll
  static const String pathDoorEnroll = '/?Data=DoorEnroll';

  /// BMS push notification (เด้งแจ้งตอนเช็คอิน) — ต้องเปิด toggle + มี token
  static const String notifyUrl =
      'https://api-notify.bmscloud.in.th/api/v1/push-notify';

  static const String testHcode = '99999';
}
