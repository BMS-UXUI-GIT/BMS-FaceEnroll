import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:get/get.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../../routes/app_pages.dart';
import '../../../widgets/tappable.dart';
import '../dash_theme.dart';

/// แบนเนอร์ "รายการแจ้งปรับปรุงเวลา" ปิดท้ายภาพรวม (Figma 619:16055)
///
/// ลงเวลาที่ระบบใช้ต่อไม่ได้ (ลืมออกเวร/นอกพื้นที่) = งานค้างที่ต้องเดินไปแจ้ง ไม่ใช่แค่สถิติ
/// ย่อเหลือหัวเรื่อง + จำนวน — รายละเอียดของแต่ละวันอยู่ในหน้ารายการอยู่แล้ว
class FixActionBanner extends StatelessWidget {
  const FixActionBanner({super.key, required this.rows});

  /// วันที่ต้องยื่นคำขอแก้ไข — ส่งต่อให้หน้ารายการทั้งชุด
  final List<Map<String, dynamic>> rows;

  /// ความกว้างของภาพประกอบมุมขวา — ใช้เว้นที่ให้ข้อความและจัดกึ่งกลางวงกลมพื้นหลัง
  static double get _artW => Dash.sp(104);

  @override
  Widget build(BuildContext context) => Tappable(
    // กดแล้วเปิดหน้ารายการที่ต้องขอแก้ไข (กด back กลับมาที่แดชบอร์ดตำแหน่งเดิม)
    onTap: () => Get.toNamed(Routes.fixRequest, arguments: {'rows': rows}),
    borderRadius: BorderRadius.circular(16),
    splash: Dash.accent,
    // แผ่นไล่สีน้ำเงินซ้อนอยู่ข้างหลัง โผล่พ้นขอบบนการ์ด 8
    child: Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF045FA9), Color(0xFF288AD1)],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      padding: const EdgeInsets.only(top: 8),
      child: Container(
        // ไม่มี padding ที่การ์ด — ลายพื้นต้องชนขอบจริง เนื้อหาเว้นขอบเองข้างใน
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: Dash.card,
          borderRadius: BorderRadius.circular(16),
        ),
        // เส้นขอบวาดทับลูก ไม่ใช่ border ใน decoration — ของเดิมโดน clip กินไปครึ่งเส้น
        foregroundDecoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Dash.hairline),
        ),
        child: Stack(
          children: [
            // ลายพื้น: วงกลมจมขอบล่างการ์ด เห็นแค่ครึ่งบน (การ์ด clip ที่เหลือทิ้ง)
            // กึ่งกลางตรงกับภาพประกอบ — ภาพกว้าง _artW ห่างขอบขวา 8
            Positioned(
              right: 8 + (_artW - Dash.sp(116)) / 2,
              bottom: -Dash.sp(58),
              child: Container(
                width: Dash.sp(116),
                height: Dash.sp(116),
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Dash.accent.withValues(alpha: 0.08),
                ),
              ),
            ),
            // บอกว่ากดแล้วออกไปหน้าอื่น — การ์ดนี้ไม่ได้แค่แจ้ง แต่กดต่อได้
            Positioned(
              right: 12,
              top: 12,
              child: Icon(
                PhosphorIconsBold.arrowUpRight,
                size: Dash.sp(16),
                color: Dash.accentActive.withValues(alpha: 0.55),
              ),
            ),
            // ภาพประกอบวางทับเป็นชั้นบนสุด ไม่ได้อยู่ในแถว — ความสูงการ์ดจึงมาจากข้อความล้วน
            // ชนขอบล่างการ์ด แล้วย่อ/ขยายตามความสูงที่ข้อความกำหนด
            Positioned(
              right: 8,
              top: 10,
              bottom: 0,
              child: Hero(
                tag: kFixTimeHeroTag,
                child: SizedBox(
                  width: _artW,
                  child: SvgPicture.asset(
                    'assets/images/fix_time_hero.svg',
                    fit: BoxFit.contain,
                    alignment: Alignment.bottomCenter,
                  ),
                ),
              ),
            ),
            Padding(
              // เว้นขวาให้พ้นภาพประกอบ — ข้อความต้องไม่ไปทับมือที่ถือมือถือ
              padding: EdgeInsets.fromLTRB(14, 12, _artW + 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'รายการแจ้งปรับปรุงเวลา',
                    style: Dash.body(
                      size: 12.5,
                      weight: FontWeight.w600,
                      color: Dash.sub,
                    ),
                  ),
                  const SizedBox(height: 2),
                  // จำนวนวันคือสิ่งที่ต้องเห็นก่อน — ตัวเลขใหญ่ คำอธิบายตัวเล็กต่อท้าย
                  Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: '${rows.length}',
                          style: Dash.num(
                            size: 26,
                            weight: FontWeight.w700,
                            color: Dash.accentActive,
                          ),
                        ),
                        TextSpan(
                          text: ' รายการ รอตรวจสอบ',
                          style: Dash.body(
                            size: 12.5,
                            weight: FontWeight.w600,
                            color: Dash.accentActive,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
