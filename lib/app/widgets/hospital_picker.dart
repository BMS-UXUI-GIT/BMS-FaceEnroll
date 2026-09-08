import 'dart:async';

import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../services/api_service.dart';
import '../theme/nexus.dart';

/// Bottom sheet เลือกโรงพยาบาลแบบ "ค้นหาได้" — แต่ละแถวแสดง [เลข] ชื่อโรงพยาบาล
/// ดึง/ค้นรายการจาก backend (attendance /hospitals?q=) แบบ debounce กันยิงรัว
///
/// sheet สูงคงที่ (ไม่ pad ด้วย viewInsets) → list ไม่ reflow ตอนคีย์บอร์ดยุบ
class HospitalPicker extends StatefulWidget {
  const HospitalPicker({
    super.key,
    required this.search,
    required this.onSelected,
  });

  /// ค้นจาก backend (q ว่าง = รายการแรกๆ)
  final Future<List<Hospital>> Function(String q) search;

  /// เลือกแล้ว -> ส่ง รพ. ที่เลือกกลับ (ผู้เรียกปิด sheet เอง)
  final void Function(Hospital) onSelected;

  @override
  State<HospitalPicker> createState() => _HospitalPickerState();
}

class _HospitalPickerState extends State<HospitalPicker> {
  final _q = TextEditingController();
  List<Hospital> _items = [];
  bool _loading = true;
  bool _error = false;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _load('');
  }

  Future<void> _load(String q) async {
    setState(() {
      _loading = true;
      _error = false;
    });
    List<Hospital> r;
    try {
      r = await widget.search(q);
    } catch (_) {
      r = [];
      _error = true; // เน็ตล่ม/timeout — โชว์ข้อความแทนหมุนค้าง
    }
    if (!mounted) return;
    setState(() {
      _items = r;
      _loading = false;
    });
  }

  void _onChanged(String q) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () => _load(q.trim()));
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _q.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // สูงคงที่ 88% ของจอ — ไม่อ่าน viewInsets เลย → คีย์บอร์ดขึ้น/ลง กล่องไม่ reflow
    // (search อยู่บน, list อยู่กลาง เห็นเสมอ; คีย์บอร์ดแค่บังส่วนล่างของ list ซึ่งเลื่อนได้)
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.88,
      child: Container(
        decoration: BoxDecoration(
          color: Nexus.pSheet,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          border: Border(top: BorderSide(color: Nexus.pLine2)),
        ),
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 42,
                height: 4,
                decoration: BoxDecoration(
                  color: Nexus.pLine,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'เลือกโรงพยาบาล',
              style: Nexus.tech(size: 17, weight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _q,
              autofocus: true,
              onChanged: _onChanged,
              style: Nexus.body(size: 14.5, color: Nexus.pInk),
              decoration: InputDecoration(
                prefixIcon: Icon(
                  PhosphorIconsRegular.magnifyingGlass,
                  size: 19,
                  color: Nexus.pDim,
                ),
                hintText: 'ค้นหาด้วยเลข หรือ ชื่อโรงพยาบาล',
              ),
            ),
            const SizedBox(height: 10),
            Expanded(
              child: _loading
                  ? Center(
                      child: CircularProgressIndicator(color: Nexus.pAccent),
                    )
                  : _items.isEmpty
                  ? Center(
                      child: Text(
                        _error
                            ? 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ — พิมพ์อีกครั้งเพื่อลองใหม่'
                            : 'ไม่พบโรงพยาบาล',
                        style: Nexus.body(size: 13, color: Nexus.pMuted),
                      ),
                    )
                  : ListView.separated(
                      // drag = ปิดคีย์บอร์ด · tap แถว = เลือกได้เลย (ไม่โดน reflow)
                      keyboardDismissBehavior:
                          ScrollViewKeyboardDismissBehavior.onDrag,
                      padding: const EdgeInsets.only(bottom: 12),
                      itemCount: _items.length,
                      separatorBuilder: (_, __) =>
                          Divider(height: 1, color: Nexus.pDivider),
                      itemBuilder: (_, i) {
                        final h = _items[i];
                        return InkWell(
                          onTap: () => widget.onSelected(h),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              vertical: 12,
                              horizontal: 2,
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 9,
                                    vertical: 5,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Nexus.pPanel,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Nexus.pLine2),
                                  ),
                                  child: Text(
                                    h.hcode,
                                    style: Nexus.tech(
                                      size: 12.5,
                                      weight: FontWeight.w700,
                                      color: Nexus.pAccent,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Text(
                                    h.name.isEmpty ? '(ไม่มีชื่อ)' : h.name,
                                    style: Nexus.body(
                                      size: 14,
                                      color: Nexus.pInk,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
