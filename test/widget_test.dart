import 'package:flutter_test/flutter_test.dart';

import 'package:bms_face_scan/app/models/face_template_model.dart';

void main() {
  group('MatchResult (subject/uuid model)', () {
    test('parses subject_id + metadata + getters', () {
      final r = MatchResult.fromJson({
        'subject_id': '7c9e-uuid',
        'metadata': {
          'emp_id': 'E101',
          'name': 'สมชาย',
          'position': 'พยาบาล',
        },
        'score': 0.997,
      });
      expect(r.subjectId, '7c9e-uuid');
      expect(r.empId, 'E101');
      expect(r.name, 'สมชาย');
      expect(r.position, 'พยาบาล');
      expect(r.score, closeTo(0.997, 0.0001));
    });

    test('metadata ขาดชื่อ -> name เป็น null', () {
      final r = MatchResult.fromJson({
        'subject_id': 'x',
        'metadata': {'emp_id': 'E1'},
        'score': 1.0,
      });
      expect(r.empId, 'E1');
      expect(r.name, isNull);
    });
  });

  group('MatchResponse', () {
    test('matched=false -> result null', () {
      final r = MatchResponse.fromJson({'matched': false, 'result': null});
      expect(r.matched, isFalse);
      expect(r.result, isNull);
    });

    test('matched=true -> nested result', () {
      final r = MatchResponse.fromJson({
        'matched': true,
        'result': {
          'subject_id': 's1',
          'metadata': {'emp_id': 'E1'},
          'score': 1.0,
        },
      });
      expect(r.matched, isTrue);
      expect(r.result!.empId, 'E1');
    });
  });

  group('RegisterResponse', () {
    test('parses subject_id + face_ids', () {
      final r = RegisterResponse.fromJson({
        'subject_id': 's1',
        'face_ids': [101, 102],
      });
      expect(r.subjectId, 's1');
      expect(r.faceIds, [101, 102]);
    });
  });

  group('DoorEnrollResponse', () {
    test('parses in_out_type + subject_id echo', () {
      final r = DoorEnrollResponse.fromJson({
        'MessageCode': 200,
        'Message': 'Success',
        'in_out_type': 'I',
        'subject_id': 's1',
      });
      expect(r.success, isTrue);
      expect(r.inOutType, 'I');
      expect(r.subjectId, 's1');
    });

    test('tolerates legacy response without in_out_type', () {
      final r =
          DoorEnrollResponse.fromJson({'MessageCode': 200, 'Message': 'Success'});
      expect(r.success, isTrue);
      expect(r.inOutType, isNull);
    });
  });

  group('LoginResult', () {
    test('parses ok + emp_id + name', () {
      final r = LoginResult.fromJson({
        'ok': true,
        'emp_id': 'E101',
        'name': 'สมชาย ใจดี',
        'message': '',
      });
      expect(r.ok, isTrue);
      expect(r.empId, 'E101');
      expect(r.name, 'สมชาย ใจดี');
    });
  });
}
