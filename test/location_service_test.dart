import 'package:bms_face_scan/app/services/location_service.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';

Position _fix(double acc, {int ageSec = 0}) => Position(
      latitude: 13.7,
      longitude: 100.5,
      timestamp: DateTime.now().toUtc().subtract(Duration(seconds: ageSec)),
      accuracy: acc,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
    );

void main() {
  group('pickBest', () {
    test('null เมื่อไม่มี fix', () {
      expect(LocationService.pickBest([]), isNull);
    });
    test('เลือก fix ที่ accuracy น้อยสุด', () {
      final best = LocationService.pickBest([_fix(70), _fix(25), _fix(40)]);
      expect(best!.accuracy, 25);
    });
    test('fix ที่ accuracy 0/ติดลบ (ไม่รู้ค่า) แพ้ fix ที่รู้ค่าเสมอ', () {
      expect(LocationService.pickBest([_fix(0), _fix(80)])!.accuracy, 80);
      expect(LocationService.pickBest([_fix(-1), _fix(0)])!.accuracy, -1);
    });
    test('ไม่นับ fix ที่เก่ากว่า freshWindow', () {
      final best = LocationService.pickBest([_fix(10, ageSec: 60), _fix(45)]);
      expect(best!.accuracy, 45);
    });
  });

  group('isGood', () {
    test('ดีเมื่อ 0 < accuracy <= goodAccuracyM', () {
      expect(LocationService.isGood(_fix(30)), isTrue);
      expect(LocationService.isGood(_fix(30.1)), isFalse);
      expect(LocationService.isGood(_fix(0)), isFalse);
    });
  });

  group('slackFor', () {
    test('หักได้ตามค่าจริงแต่ไม่เกินเพดาน', () {
      expect(LocationService.slackFor(12), 12);
      expect(LocationService.slackFor(30), 30);
      expect(LocationService.slackFor(3000), LocationService.maxSlackM);
    });
    test('ค่าเพี้ยน = ไม่หัก', () {
      expect(LocationService.slackFor(0), 0);
      expect(LocationService.slackFor(-5), 0);
      expect(LocationService.slackFor(double.nan), 0);
      expect(LocationService.slackFor(double.infinity), 0);
    });
  });
}
