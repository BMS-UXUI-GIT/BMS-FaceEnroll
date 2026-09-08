import 'package:flutter/material.dart';

import '../dash_theme.dart';
import '../attendance_row.dart';
import '../widgets/scan_tiles.dart';
import '../widgets/shift_scene.dart';
import '../widgets/shift_hero_frame.dart';
import '../widgets/shift_pill.dart';

/// การ์ดสถานะวันนี้ — ปัดซ้าย/ขวาดูเวรอื่นของวันเดียวกัน มี dot บอกว่ามีกี่เวรและอยู่เวรไหน
class TodayCard extends StatefulWidget {
  const TodayCard({super.key, required this.shifts});

  final List<Map<String, dynamic>> shifts;

  @override
  State<TodayCard> createState() => _TodayCardState();
}

class _TodayCardState extends State<TodayCard>
    with SingleTickerProviderStateMixin {
  /// ไล่สีมุมขวาบนค่อย ๆ ขึ้นตอนการ์ดโผล่ — ครั้งเดียว ไม่วน
  late final AnimationController _intro = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 700),
  )..forward();

  /// PageView ต้องการความสูงคงที่ — หัวเรื่อง ~28 + ระยะ 16 + แผ่นขาว (12 + การ์ดสแกน 84 + 12) + เผื่อ 8
  /// (ตัวเนื้อหาห่อ scroll ไว้อีกชั้น เผื่อฟอนต์/ตัวอักษรใหญ่กว่าที่เผื่อไว้ จะได้เลื่อนแทนที่จะล้น)
  /// สูงพอดีเนื้อหา: หัวเรื่อง + ช่องไฟ + แผ่นการ์ดสแกน (รวม padding 12 บน-ล่างของแผ่น)
  /// (เผื่อไว้เกินจะกลายเป็นช่องว่างขาวใต้แผ่น เพราะแผ่นชนขอบล่างการ์ดพอดี)
  /// เวรนี้มีป้ายบอกความผิดปกติต่อท้ายสถานะไหม — ป้ายอาจตกบรรทัดใหม่ ต้องเผื่อความสูง
  static bool _hasBadge(Map<String, dynamic>? r) =>
      r != null && _todayBadges(r).isNotEmpty;

  /// ป้ายของวันนั้น เรียงตามลำดับที่ต้องรู้ก่อน: ข้อมูลขาด → มาสาย/ออกก่อน
  static List<Widget> _todayBadges(Map<String, dynamic>? r) => r == null
      ? const []
      : problemBadgesOf(r, blur: true, withLateEarly: true);

  static double _pageHOf({required bool badge}) =>
      Dash.box(28) + (badge ? Dash.box(34) : 0) + 16 + ScanTiles.tileH + 24;

  /// สูงเพิ่มตอนมีหลายเวร — จุดบอกหน้าอยู่ในแผ่นขาวด้วย
  static double get _dotsH => Dash.box(16);

  final _pc = PageController();
  int _page = 0;

  @override
  void didUpdateWidget(covariant TodayCard old) {
    super.didUpdateWidget(old);
    // จำนวนเวรลดลง (เปลี่ยนเดือน/รีเฟรช) — กันหน้าค้างเกินขอบ
    final maxPage = (widget.shifts.isEmpty ? 1 : widget.shifts.length) - 1;
    if (_page > maxPage && _pc.hasClients) {
      _page = maxPage;
      _pc.jumpToPage(maxPage);
    }
  }

  @override
  void dispose() {
    _intro.dispose();
    _pc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // ยังไม่ลงเวลาเลย = หน้าว่างหนึ่งหน้า
    final pages = widget.shifts.isEmpty
        ? <Map<String, dynamic>?>[null]
        : widget.shifts;
    // เวรของหน้าที่กำลังดู — คุมทั้งฉากและชิปเวรที่อยู่แถวบนสุดของการ์ด
    final current = pages[_page.clamp(0, pages.length - 1)];
    final currentIn = '${current?['in'] ?? ''}';
    final tint = shiftTint(
      currentIn,
    ).withValues(alpha: Dash.dark ? 0.22 : 0.95);
    // วาดเองแทน PNG — ดวงอาทิตย์ต้องเคลื่อนข้ามโดม เมฆต้องค่อยประกอบร่าง
    // ภาพ raster แยกชิ้นไม่ได้ ต้องเป็นรูปทรงที่วาดเองถึงขยับทีละชิ้นได้
    final scene = ShiftScene(
      hhmm: currentIn,
      width: Dash.sp(150),
      height: Dash.sp(86),
    );
    return AnimatedBuilder(
      animation: _intro,
      // ตัวการ์ดไม่ต้องสร้างใหม่ทุกเฟรม ส่งเป็น child ให้ AnimatedBuilder ถือไว้
      child: _cardBody(currentIn, pages),
      builder: (context, child) {
        // ไล่สีมุมขวาบนค่อย ๆ ขึ้นตอนการ์ดโผล่ — ครั้งเดียว ไม่วน
        final v = Curves.easeOutCubic.transform(_intro.value);
        return ShiftHeroFrame(
          tint: Color.lerp(Dash.card, tint, v)!,
          scene: scene,
          child: child!,
        );
      },
    );
  }

  Widget _cardBody(
    String currentIn,
    List<Map<String, dynamic>?> pages,
  ) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    // สูงเท่าเนื้อหา — กรอบการ์ดอาจถูกวางในกล่องที่สูงกว่า ถ้ายืดจะเหลือที่ว่างใต้ช่องสแกน
    mainAxisSize: MainAxisSize.min,
    children: [
      HeroCardHeader(
        title: 'การสแกนของวันนี้',
        trailing: currentIn.isNotEmpty ? ShiftPill(currentIn) : null,
      ),
      SizedBox(
        // หน้าไหนมีป้ายบอกความผิดปกติ ช่องสแกนจะสูงขึ้น — ใช้ความสูงสูงสุดของทุกหน้า
        // ไม่งั้นสลับหน้าแล้วการ์ดกระโดด
        height:
            _pageHOf(badge: pages.any(_hasBadge)) +
            (pages.length > 1 ? _dotsH : 0),
        child: PageView.builder(
          controller: _pc,
          itemCount: pages.length,
          onPageChanged: (i) => setState(() => _page = i),
          itemBuilder: (context, i) => SingleChildScrollView(
            physics: const ClampingScrollPhysics(),
            child: _shiftPage(pages[i], i, pages.length),
          ),
        ),
      ),
    ],
  );

  Widget _shiftPage(Map<String, dynamic>? r, int index, int pageCount) {
    final inT = '${r?['in'] ?? ''}';
    final outT = '${r?['out'] ?? ''}';
    final hasIn = inT.isNotEmpty;
    final hasOut = outT.isNotEmpty;

    final (String headline, Color headColor) = switch (r) {
      null => ('ยังไม่ลงเวลา', Dash.muted),
      _ when r['no_out'] == true => ('ลืมออกเวร', Dash.bad),
      _ when r['late'] == true => ('เข้างานสาย', Dash.warn),
      _ when r['early'] == true => ('ออกก่อนเวลา', Dash.info),
      _ when !hasOut => ('กำลังเข้าเวร', Dash.accent),
      _ => ('เข้างานปกติ', Dash.ok),
    };

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // ไม่ต้องเว้นระยะเอง — สองบรรทัดนี้มีช่องว่างจาก line-height ของฟอนต์อยู่แล้ว
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
              Text(
                headline,
                style: Dash.tech(
                  size: 20,
                  weight: FontWeight.w600,
                  color: headColor,
                ),
              ),
              // ป้ายบอกว่าวันนี้ผิดตรงไหน — ต่อท้ายสถานะในแถวเดียวกัน
              ..._todayBadges(r),
            ],
          ),
        ),
        const SizedBox(height: 16),
        ScanSheet(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ScanTiles(
                inTime: inT,
                outTime: outT,
                inColor: hasIn
                    ? (r?['late'] == true ? Dash.warn : Dash.ok)
                    : Dash.muted,
                outColor: hasOut
                    ? (r?['early'] == true ? Dash.info : Dash.ok)
                    : Dash.muted,
              ),
              // จุดบอกหน้าอยู่ในแผ่นขาวเดียวกับการ์ดสแกน ไม่ลอยอยู่บนพื้นการ์ด
              if (pageCount > 1) ...[
                const SizedBox(height: 10),
                _dots(pageCount),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _dots(int count) => Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      for (var i = 0; i < count; i++)
        AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOut,
          margin: const EdgeInsets.symmetric(horizontal: 2),
          width: i == _page ? 18 : 6,
          height: 6,
          decoration: BoxDecoration(
            color: i == _page ? Dash.accent : Dash.hairline,
            borderRadius: BorderRadius.circular(100),
          ),
        ),
    ],
  );
}

/// การ์ดสแกนเข้า/ออก วางคู่กัน (Figma 584:14302)
