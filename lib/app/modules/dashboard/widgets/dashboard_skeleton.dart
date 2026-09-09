import 'package:flutter/material.dart';

import '../dash_theme.dart';
import 'skeleton.dart';

/// โครงร่างระหว่างโหลดของทั้งหน้าแดชบอร์ด
///
/// ใช้โครงเดียวกับของจริง (hero + แผงน้ำเงิน) เพื่อไม่ให้ layout กระโดดตอนข้อมูลมาถึง
/// หัวเรื่องแสดงของจริงไปเลย เพราะเป็นข้อความคงที่ ไม่ต้องรอโหลด
class DashboardSkeleton extends StatelessWidget {
  const DashboardSkeleton({super.key});

  @override
  Widget build(BuildContext context) => Shimmer(
    child: SingleChildScrollView(
      physics: const NeverScrollableScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            color: Dash.bg,
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SafeArea(bottom: false, child: DashboardHeroTitle()),
                SizedBox(height: 12),
                Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: TodayCardSkeleton(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Container(
            decoration: BoxDecoration(
              color: Dash.panel,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(24),
              ),
            ),
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Skel(width: 96, height: 22, onPanel: true, phase: 0.00),
                const SizedBox(height: 16),
                Row(
                  children: [
                    for (var i = 0; i < 3; i++) ...[
                      Expanded(
                        child: Skel(
                          height: 36,
                          radius: 100,
                          onPanel: true,
                          phase: 0.08 + i * 0.06,
                        ),
                      ),
                      if (i < 2) const SizedBox(width: 8),
                    ],
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    const Skel(
                      width: 120,
                      height: 34,
                      onPanel: true,
                      phase: 0.28,
                    ),
                    const Spacer(),
                    const Skel(
                      width: 40,
                      height: 40,
                      radius: 100,
                      onPanel: true,
                      phase: 0.32,
                    ),
                    const SizedBox(width: 16),
                    const Skel(
                      width: 40,
                      height: 40,
                      radius: 100,
                      onPanel: true,
                      phase: 0.34,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    for (var i = 0; i < 4; i++) ...[
                      Expanded(
                        child: Skel(
                          height: 88,
                          radius: 16,
                          onPanel: true,
                          phase: 0.36 + i * 0.05,
                        ),
                      ),
                      if (i < 3) const SizedBox(width: 8),
                    ],
                  ],
                ),
                const SizedBox(height: 16),
                for (var i = 0; i < 2; i++) ...[
                  Skel(
                    height: 250,
                    radius: 24,
                    onPanel: true,
                    phase: 0.58 + i * 0.08,
                  ),
                  const SizedBox(height: 16),
                ],
                const SizedBox(height: 8),
                const Skel(width: 80, height: 20, onPanel: true, phase: 0.76),
                const SizedBox(height: 12),
                for (var i = 0; i < 4; i++) ...[
                  Skel(
                    height: 64,
                    radius: 16,
                    onPanel: true,
                    phase: 0.80 + i * 0.06,
                  ),
                  const SizedBox(height: 8),
                ],
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

/// หัวเรื่องแบบอยู่กับที่ — ใช้ตอนโหลด (ยังไม่มี scroll view จริงให้หัวแอปเกาะ)
class DashboardHeroTitle extends StatelessWidget {
  const DashboardHeroTitle({super.key});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
    child: Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'แดชบอร์ด',
                style: Dash.tech(size: 20, weight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                'สรุปข้อมูลการมาทำงานของคุณ',
                style: Dash.body(size: 12, color: Dash.muted),
              ),
            ],
          ),
        ),
        SizedBox(
          width: 18,
          height: 18,
          child: CircularProgressIndicator(strokeWidth: 2, color: Dash.accent),
        ),
      ],
    ),
  );
}

/// โครงร่างของการ์ด "การสแกนวันนี้" — สัดส่วนเท่าการ์ดจริง
class TodayCardSkeleton extends StatelessWidget {
  const TodayCardSkeleton({super.key});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Dash.card,
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: Dash.hairline),
    ),
    child: const Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Skel(width: 120, height: 14, phase: 0.0),
            Spacer(),
            Skel(width: 56, height: 24, radius: 100, phase: 0.10),
          ],
        ),
        SizedBox(height: 12),
        Skel(width: 150, height: 24, phase: 0.18),
        SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: Skel(height: 84, radius: 16, phase: 0.26)),
            SizedBox(width: 8),
            Expanded(child: Skel(height: 84, radius: 16, phase: 0.34)),
          ],
        ),
      ],
    ),
  );
}
