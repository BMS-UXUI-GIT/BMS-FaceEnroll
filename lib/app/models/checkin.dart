/// เวร (จาก emp_shift) — เก็บใน SharedPreferences ตอน login (ไม่ดึงทุกครั้ง)
class Shift {
  const Shift({
    required this.id,
    required this.name,
    required this.timeStart,
    required this.timeEnd,
  });
  final int id;
  final String name;
  final String timeStart; // "HH:mm:ss"
  final String timeEnd;

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'start': timeStart,
    'end': timeEnd,
  };

  factory Shift.fromJson(Map<String, dynamic> j) => Shift(
    id: (j['id'] as num?)?.toInt() ?? 0,
    name: j['name']?.toString() ?? '',
    timeStart: j['start']?.toString() ?? '',
    timeEnd: j['end']?.toString() ?? '',
  );
}

/// 1 รอบเข้า-ออกของวันนี้.
/// รองรับ "เข้าเวรเช้า ออกเวรบ่าย" — เก็บเวรตอนเข้า (inShift) แยกจากเวรตอนออก (outShift)
/// time เก็บเป็น ISO ของ server (matched_at) เช่น "2026-06-29T08:05:00+07:00"
class CheckinSession {
  CheckinSession({
    this.inShift,
    this.inTime,
    this.outShift,
    this.outTime,
    this.lateMin,
    this.earlyMin,
    this.autoOut = false,
  });
  Shift? inShift;
  String? inTime;
  Shift? outShift;
  String? outTime;
  // นาทีสาย/ออกก่อน ที่เซิร์ฟเวอร์คำนวณตอนลงเวลา (null = ไม่รู้ -> คำนวณเองจากเวร)
  int? lateMin;
  int? earlyMin;
  // true = ระบบสแตมป์ออกให้เอง (ควบเวร: เข้าเวรใหม่โดยยังไม่สแกนออกเวรนี้) ไม่ใช่คนสแกนออกเอง
  bool autoOut;

  bool get isOpen => inTime != null && outTime == null;
  bool get isDone => outTime != null;

  Map<String, dynamic> toJson() => {
    if (inShift != null) 'inShift': inShift!.toJson(),
    'inTime': inTime,
    if (outShift != null) 'outShift': outShift!.toJson(),
    'outTime': outTime,
    if (lateMin != null) 'lateMin': lateMin,
    if (earlyMin != null) 'earlyMin': earlyMin,
    if (autoOut) 'autoOut': true,
  };

  factory CheckinSession.fromJson(Map<String, dynamic> j) => CheckinSession(
    inShift: j['inShift'] != null
        ? Shift.fromJson(Map<String, dynamic>.from(j['inShift'] as Map))
        : null,
    inTime: j['inTime']?.toString(),
    outShift: j['outShift'] != null
        ? Shift.fromJson(Map<String, dynamic>.from(j['outShift'] as Map))
        : null,
    outTime: j['outTime']?.toString(),
    lateMin: (j['lateMin'] as num?)?.toInt(),
    earlyMin: (j['earlyMin'] as num?)?.toInt(),
    autoOut: j['autoOut'] == true,
  );
}
