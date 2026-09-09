import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../dash_theme.dart';
import 'dash_text.dart';

/// สรุปสาเหตุที่เลือก + รายละเอียดเพิ่มเติม + รูปประกอบ — อ่านอย่างเดียว
/// ใช้ในหน้าตรวจสอบก่อนส่ง เพื่อให้เห็นทุกอย่างที่จะถูกส่งออกไปในการ์ดใบเดียว
class ReviewReasonCard extends StatelessWidget {
  const ReviewReasonCard({
    super.key,
    required this.reasons,
    required this.note,
    required this.photos,
  });

  final List<String> reasons;
  final String note;
  final List<Uint8List> photos;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Dash.card,
      borderRadius: BorderRadius.circular(16),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, r) in reasons.indexed) ...[
          if (i > 0) const SizedBox(height: 8),
          Row(
            children: [
              Icon(
                PhosphorIconsFill.checkCircle,
                size: Dash.sp(18),
                color: Dash.accentActive,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(r, style: Dash.body(size: 13.5, color: Dash.ink)),
              ),
            ],
          ),
        ],
        const SizedBox(height: 10),
        const Hairline(),
        const SizedBox(height: 10),
        Text(
          'รายละเอียดเพิ่มเติม',
          style: Dash.body(size: 11.5, color: Dash.muted),
        ),
        const SizedBox(height: 2),
        Text(
          note.isEmpty ? '—' : note,
          style: Dash.body(
            size: 13.5,
            color: note.isEmpty ? Dash.faint : Dash.ink,
          ),
        ),
        if (photos.isNotEmpty) ...[
          const SizedBox(height: 10),
          const Hairline(),
          const SizedBox(height: 10),
          Text(
            'รูปประกอบ ${photos.length} รูป',
            style: Dash.body(size: 11.5, color: Dash.muted),
          ),
          const SizedBox(height: 6),
          SizedBox(
            height: Dash.box(72),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: photos.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, i) => ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.memory(
                  photos[i],
                  width: Dash.box(72),
                  height: Dash.box(72),
                  fit: BoxFit.cover,
                  cacheWidth: (Dash.box(72) * Dash.dpr).round(),
                ),
              ),
            ),
          ),
        ],
      ],
    ),
  );
}
