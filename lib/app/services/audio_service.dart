import 'dart:developer';

import 'package:audioplayers/audioplayers.dart';

import '../modules/face_scan/liveness/face_liveness_action.dart';

/// เล่นเสียงสั่งผู้ใช้ (ไฟล์อัดไว้ ก๊อปจากระบบเดิม) — ใช้ทั้งจอสแกนและจอลงทะเบียน
class AudioService {
  final AudioPlayer _player = AudioPlayer();

  /// เล่นไฟล์ใน assets/ (เช่น 'audios/face_direction_left.mp3') — เล่นไม่ได้ไม่พังงาน
  Future<void> play(String assetPath) async {
    try {
      await _player.stop();
      await _player.play(AssetSource(assetPath));
    } catch (e) {
      log('[AudioService] play $assetPath failed: $e');
    }
  }

  /// เสียงสั่งท่า liveness
  Future<void> playAction(FaceLivenessAction action) => play(action.audioPath);

  void dispose() => _player.dispose();
}
