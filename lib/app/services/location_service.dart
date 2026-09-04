import 'dart:async';
import 'dart:developer';

import 'package:geolocator/geolocator.dart';

/// พิกัด GPS ตอนลงเวลา — ฟังตำแหน่งต่อเนื่องตั้งแต่เปิดจอสแกน แล้วเลือก fix ที่แม่นสุด
/// (ชิป GPS ยิ่งเปิดค้างยิ่งแม่นขึ้น — ขอค่าเดียวแล้วปิดจะได้ค่าแรกที่หยาบเสมอ)
/// คืน null ถ้า user ไม่ให้สิทธิ์ หรือปิด location service (ผู้เรียกตัดสินใจว่าจะบล็อกไหม)
class LocationService {
  /// ความคลาดที่ถือว่า "นิ่งพอ" — ได้เมื่อไหร่ใช้เลย ไม่รอต่อ (เท่ารัศมีจุดลงเวลา)
  static const double goodAccuracyM = 30;

  /// เพดานความคลาดที่ยอมหักออกจากระยะตอนตัดสินนอกพื้นที่ (กัน accuracy 3,000 ม. ผ่านจากไกล)
  static const double maxSlackM = 30;

  /// fix ที่ยังถือว่า "สด" — เก่ากว่านี้ไม่เอามาตัดสิน (คนอาจเดินมาจากอีกตึก)
  static const Duration freshWindow = Duration(seconds: 15);

  /// รอเพิ่มตอนกดยืนยัน ถ้าค่าที่มียังหยาบกว่า goodAccuracyM
  static const Duration extraWait = Duration(seconds: 5);

  final _geo = GeolocatorPlatform.instance;

  StreamSubscription<Position>? _sub;
  final _recent = <Position>[]; // fix ในช่วง freshWindow (เก่า -> ใหม่)
  final _updates = StreamController<Position>.broadcast();

  /// fix ใหม่ทุกครั้งที่มือถือส่งมา (ไว้ให้ UI โชว์สด)
  Stream<Position> get updates => _updates.stream;

  /// fix ล่าสุด (อาจเก่ากว่า freshWindow) — ไว้โชว์อย่างเดียว ห้ามใช้ตัดสิน
  Position? get latest => _recent.isEmpty ? null : _recent.last;

  bool get listening => _sub != null;

  /// เปิดฟังตำแหน่งค้างไว้ (เงียบๆ ไม่เด้งขอสิทธิ์) — เรียกตอนเข้าจอสแกน
  Future<void> startListening() async {
    if (_sub != null) return;
    try {
      if (!await _geo.isLocationServiceEnabled()) return;
      final perm = await _geo.checkPermission();
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;
      _sub = _geo
          .getPositionStream(
            locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, distanceFilter: 0),
          )
          .listen(_push, onError: (Object e) => log('GPS stream: $e'));
    } catch (e) {
      log('GPS startListening: $e');
    }
  }

  /// หยุดฟัง — ออกจากจอสแกน / พับแอป
  void stopListening() {
    _sub?.cancel();
    _sub = null;
  }

  void _push(Position p) {
    _recent.add(p);
    _prune(_recent);
    _updates.add(p);
  }

  /// ดึงตำแหน่งสำหรับตัดสิน (จัดการสิทธิ์ให้):
  ///   มี fix สดที่ accuracy <= goodAccuracyM → ใช้ทันที
  ///   ยังหยาบ + waitForGood → รอ fix ที่ดีพอจาก stream ไม่เกิน extraWait ; หมดเวลา = ใช้ fix สดที่ดีสุด
  ///   ไม่มี fix สดเลย → ขอค่าเดียวแบบเดิม (ละเอียด → หยาบ) → fix ล่าสุดอายุไม่เกิน 30 วิ → null
  Future<Position?> getCurrentPosition({bool waitForGood = true}) async {
    if (!await _ensurePermission()) return null;
    if (!listening) await startListening();

    var best = pickBest(_recent);
    if (best != null && isGood(best)) return best;
    if (waitForGood) {
      final good = await _waitForGood();
      if (good != null) return good;
      best = pickBest(_recent);
    }
    if (best != null) {
      log('GPS: ใช้ fix ดีสุดที่มี ±${best.accuracy.round()}m');
      return best;
    }
    return _oneShot();
  }

  Future<Position?> _waitForGood() async {
    try {
      return await updates.firstWhere(isGood).timeout(extraWait);
    } on TimeoutException {
      return null;
    } catch (e) {
      log('GPS wait: $e');
      return null;
    }
  }

  /// ขอค่าเดียวแบบเดิม — ใช้เฉพาะตอน stream ยังไม่มีอะไรให้เลย
  Future<Position?> _oneShot() async {
    for (final attempt in const [
      LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 8)),
      LocationSettings(accuracy: LocationAccuracy.medium, timeLimit: Duration(seconds: 5)),
    ]) {
      try {
        final pos = await _geo.getCurrentPosition(locationSettings: attempt);
        _push(pos);
        log('GPS one-shot: ${pos.latitude},${pos.longitude} ±${pos.accuracy.round()}m');
        return pos;
      } catch (e) {
        log('GPS error (${attempt.accuracy}): $e');
      }
    }
    final fb = latest ?? await _lastKnown();
    if (fb != null && DateTime.now().difference(fb.timestamp).abs() <= const Duration(seconds: 30)) {
      log('GPS fallback: ${fb.latitude},${fb.longitude} (${fb.timestamp})');
      return fb;
    }
    return null;
  }

  // ---- logic เลือกค่า (pure — มี test) ----

  static bool _fresh(Position p) => DateTime.now().difference(p.timestamp).abs() <= freshWindow;

  static void _prune(List<Position> fixes) => fixes.removeWhere((p) => !_fresh(p));

  /// accuracy ใช้ได้และดีพอ (0/ติดลบ = มือถือไม่รู้ค่า ถือว่าไม่ดี)
  static bool isGood(Position p) => p.accuracy > 0 && p.accuracy <= goodAccuracyM;

  /// fix สดที่ accuracy น้อยสุด — fix ที่ไม่รู้ค่า (<= 0) แพ้ fix ที่รู้ค่าเสมอ ; ไม่มีสด = null
  static Position? pickBest(List<Position> fixes) {
    Position? best;
    for (final p in fixes.where(_fresh)) {
      if (best == null || _rank(p) < _rank(best)) best = p;
    }
    return best;
  }

  static double _rank(Position p) => p.accuracy > 0 ? p.accuracy : double.infinity;

  /// ระยะที่ยอมหักออกตอนเทียบรัศมี = accuracy แต่ไม่เกิน maxSlackM ; ค่าเพี้ยน = 0
  static double slackFor(double accuracyM) {
    if (!accuracyM.isFinite || accuracyM <= 0) return 0;
    return accuracyM > maxSlackM ? maxSlackM : accuracyM;
  }

  Future<Position?> _lastKnown() async {
    try {
      return await _geo.getLastKnownPosition();
    } catch (_) {
      return null;
    }
  }

  /// ขอ/เช็คสิทธิ์ location + เปิด location service (เหมือน flow ระบบเก่า)
  Future<bool> _ensurePermission() async {
    var serviceEnabled = await _geo.isLocationServiceEnabled();
    if (!serviceEnabled) {
      await Geolocator.openLocationSettings();
      serviceEnabled = await _geo.isLocationServiceEnabled();
      if (!serviceEnabled) return false;
    }
    var permission = await _geo.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await _geo.requestPermission();
      if (permission == LocationPermission.denied) return false;
    }
    if (permission == LocationPermission.deniedForever) return false;
    return true;
  }
}
