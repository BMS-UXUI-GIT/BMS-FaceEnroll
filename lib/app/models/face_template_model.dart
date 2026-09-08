// Models สำหรับ backend ใหม่ (ตัวกลาง face-enroll-cloud + attendance)
//   /match    -> MatchResponse { matched, result{ subject_id, metadata, score } }
//   /register -> RegisterResponse { subject_id, face_ids }
//   /{hcode}/login    -> LoginResult
//   attendance DoorEnroll -> DoorEnrollResponse

// ---------- face-scan: /match ----------
/// ตัวกลางคืน subject_id (uuid ที่มันออกให้) + metadata (ข้อมูลที่ consumer ฝากไว้ตอน register)
/// ข้อมูลคนจริง (emp_id/ชื่อ) อ่านจาก metadata ผ่าน getter ข้างล่าง
class MatchResult {
  final String subjectId;
  final Map<String, dynamic> metadata;
  final double score;

  MatchResult({
    required this.subjectId,
    this.metadata = const {},
    required this.score,
  });

  String get empId => metadata['emp_id']?.toString() ?? '';
  String? get name {
    final n = metadata['name']?.toString();
    return (n == null || n.isEmpty) ? null : n;
  }

  String get position => metadata['position']?.toString() ?? '';

  factory MatchResult.fromJson(Map<String, dynamic> json) => MatchResult(
    subjectId: json['subject_id']?.toString() ?? '',
    metadata: (json['metadata'] as Map?)?.cast<String, dynamic>() ?? const {},
    score: (json['score'] as num?)?.toDouble() ?? 0.0,
  );
}

class MatchResponse {
  final bool matched;
  final MatchResult? result;
  final String?
  matchedAt; // เวลา server ตอน match (ISO โซนไทย) — ใช้บันทึก session การ์ดวันนี้

  MatchResponse({required this.matched, this.result, this.matchedAt});

  factory MatchResponse.fromJson(Map<String, dynamic> json) => MatchResponse(
    matched: json['matched'] == true,
    result: json['result'] == null
        ? null
        : MatchResult.fromJson(json['result'] as Map<String, dynamic>),
    matchedAt: json['matched_at']?.toString(),
  );
}

// ---------- face-scan: /register ----------
class RegisterResponse {
  final String
  subjectId; // uuid ที่ตัวกลางออกให้ (เก็บไว้ถ้าจะเพิ่มรูป/ลบทีหลัง)
  final List<int> faceIds;

  RegisterResponse({required this.subjectId, this.faceIds = const []});

  factory RegisterResponse.fromJson(Map<String, dynamic> json) =>
      RegisterResponse(
        subjectId: json['subject_id']?.toString() ?? '',
        faceIds:
            (json['face_ids'] as List?)
                ?.map((e) => (e as num).toInt())
                .toList() ??
            const [],
      );
}

// ---------- attendance: /{hcode}/login (พนักงาน login ด้วย HOSxP -> emp_id) ----------
class LoginResult {
  final bool ok;
  final String empId;
  final String name;
  final String message;

  LoginResult({
    this.ok = false,
    this.empId = '',
    this.name = '',
    this.message = '',
  });

  factory LoginResult.fromJson(Map<String, dynamic> json) => LoginResult(
    ok: json['ok'] == true,
    empId: json['emp_id']?.toString() ?? '',
    name: json['name']?.toString() ?? '',
    message: json['message']?.toString() ?? '',
  );
}

// ---------- attendance: /{hcode}/?Data=DoorEnroll ----------
class DoorEnrollResponse {
  final int messageCode;
  final String message;
  final String? inOutType; // 'I' | 'O' | null
  final String? subjectId; // echo กลับมา (audit)
  // สถานะจากเซิร์ฟเวอร์ (เทียบเวลาเวรให้แล้ว) — 1=ตรงเวลา 2=สาย 3=ออกก่อนเวลา 4=ออกครบเวลา
  final int? statusId;
  final String? statusName;
  final int? diffMinute; // สาย/ออกก่อน กี่นาที (0 = ตรงเวลา)
  // ควบเวร: เซิร์ฟเวอร์ปิดเวรก่อนหน้าให้อัตโนมัติ (สแตมป์เวลาเลิกเวรเก่า)
  final String? autoOutTime; // "16:00"
  final int? autoOutShiftId;
  final String? autoOutShiftName;

  DoorEnrollResponse({
    required this.messageCode,
    required this.message,
    this.inOutType,
    this.subjectId,
    this.statusId,
    this.statusName,
    this.diffMinute,
    this.autoOutTime,
    this.autoOutShiftId,
    this.autoOutShiftName,
  });

  bool get success => messageCode == 200;
  bool get isLate => statusId == 2;
  bool get isEarlyOut => statusId == 3;

  factory DoorEnrollResponse.fromJson(Map<String, dynamic> json) {
    final auto = json['auto_out'] as Map<String, dynamic>?;
    return DoorEnrollResponse(
      messageCode: (json['MessageCode'] as num?)?.toInt() ?? 0,
      message: json['Message']?.toString() ?? '',
      inOutType: json['in_out_type']?.toString(),
      subjectId: json['subject_id']?.toString(),
      statusId: (json['status_id'] as num?)?.toInt(),
      statusName: json['status_name']?.toString(),
      diffMinute: (json['diff_minute'] as num?)?.toInt(),
      autoOutTime: auto?['time']?.toString(),
      autoOutShiftId: (auto?['shift_id'] as num?)?.toInt(),
      autoOutShiftName: auto?['shift_name']?.toString(),
    );
  }
}

// ---------- attendance: /{hcode}/shifts (เลือกเวรตอน confirm — hos staff) ----------
class EmpShift {
  final int id;
  final String name;
  final String timeStart;
  final String timeEnd;

  EmpShift({
    required this.id,
    required this.name,
    this.timeStart = '',
    this.timeEnd = '',
  });

  factory EmpShift.fromJson(Map<String, dynamic> json) => EmpShift(
    id: (json['emp_shift_id'] as num?)?.toInt() ?? 0,
    name: json['emp_shift_name']?.toString() ?? '',
    timeStart: json['time_start']?.toString() ?? '',
    timeEnd: json['time_end']?.toString() ?? '',
  );
}
