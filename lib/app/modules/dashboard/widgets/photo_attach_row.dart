import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../widgets/tappable.dart';
import '../dash_theme.dart';
import 'fix_reason_picker.dart' show SheetGrabber;

/// แถวรูปที่แนบ + ปุ่มเพิ่ม — กากบาทมุมขวาบนเพื่อเอาออก
class PhotoAttachRow extends StatelessWidget {
  const PhotoAttachRow({
    super.key,
    required this.photos,
    required this.maxPhotos,
    required this.busy,
    required this.onRemove,
    required this.onAdd,
  });

  final List<Uint8List> photos;
  final int maxPhotos;

  /// กำลังเปิดกล้อง/คลังรูปอยู่ — ปุ่มเพิ่มเปลี่ยนเป็นวงหมุนและกดซ้ำไม่ได้
  final bool busy;
  final ValueChanged<int> onRemove;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final size = Dash.box(84);
    return SizedBox(
      height: size,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          for (final (i, p) in photos.indexed) ...[
            PhotoTile(bytes: p, size: size, onRemove: () => onRemove(i)),
            const SizedBox(width: 8),
          ],
          if (photos.length < maxPhotos)
            AddPhotoTile(size: size, busy: busy, onTap: onAdd),
        ],
      ),
    );
  }
}

/// รูปที่แนบไว้หนึ่งใบ
class PhotoTile extends StatelessWidget {
  const PhotoTile({
    super.key,
    required this.bytes,
    required this.size,
    required this.onRemove,
  });

  final Uint8List bytes;
  final double size;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: size,
    height: size,
    child: Stack(
      clipBehavior: Clip.none,
      children: [
        Positioned.fill(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Image.memory(
              bytes,
              fit: BoxFit.cover,
              // ถอดรหัสเท่าที่วางจริง — รูปจากกล้องใหญ่กว่านี้หลายเท่า
              cacheWidth: (size * Dash.dpr).round(),
            ),
          ),
        ),
        Positioned(
          top: -6,
          right: -6,
          child: Tappable(
            onTap: onRemove,
            circle: true,
            splash: Dash.bad,
            child: Container(
              width: 24,
              height: 24,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Dash.bad,
                shape: BoxShape.circle,
                border: Border.all(color: Dash.bg, width: 2),
              ),
              child: Icon(PhosphorIconsBold.x, size: 12, color: Dash.on),
            ),
          ),
        ),
      ],
    ),
  );
}

/// ช่องเปล่าท้ายแถว — แตะเพื่อแนบรูปเพิ่ม
class AddPhotoTile extends StatelessWidget {
  const AddPhotoTile({
    super.key,
    required this.size,
    required this.busy,
    required this.onTap,
  });

  final double size;
  final bool busy;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Tappable(
    onTap: busy ? null : onTap,
    borderRadius: BorderRadius.circular(16),
    splash: Dash.accent,
    child: Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Dash.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Dash.hairline),
      ),
      child: busy
          ? SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Dash.accent,
              ),
            )
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  PhosphorIconsRegular.plus,
                  size: Dash.sp(20),
                  color: Dash.accent,
                ),
                const SizedBox(height: 4),
                Text(
                  'เพิ่มรูป',
                  style: Dash.body(size: 11.5, color: Dash.accent),
                ),
              ],
            ),
    ),
  );
}

/// เลือกว่าจะถ่ายใหม่หรือหยิบจากคลัง — คืน null เมื่อปิดแผ่นทิ้ง
Future<ImageSource?> showPhotoSourceSheet(BuildContext context) {
  FocusScope.of(context).unfocus();
  return showModalBottomSheet<ImageSource>(
    context: context,
    backgroundColor: Dash.card,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (context) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 8),
          const SheetGrabber(),
          const SizedBox(height: 8),
          ListTile(
            leading: Icon(PhosphorIconsRegular.camera, color: Dash.accent),
            title: Text('ถ่ายรูป', style: Dash.body(size: 14, color: Dash.ink)),
            onTap: () => Navigator.pop(context, ImageSource.camera),
          ),
          ListTile(
            leading: Icon(PhosphorIconsRegular.images, color: Dash.accent),
            title: Text(
              'เลือกจากคลังรูป',
              style: Dash.body(size: 14, color: Dash.ink),
            ),
            onTap: () => Navigator.pop(context, ImageSource.gallery),
          ),
          const SizedBox(height: 8),
        ],
      ),
    ),
  );
}
