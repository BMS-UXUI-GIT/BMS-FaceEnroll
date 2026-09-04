import 'package:flutter/material.dart';

/// ครอบหน้าที่มีช่องกรอก — แตะที่ว่างนอกช่อง = ปิดคีย์บอร์ด (unfocus ทุก input)
/// ใช้ครอบ Scaffold ของหน้าที่มี TextField (login / settings / หน้าใหม่ๆ)
class DismissKeyboard extends StatelessWidget {
  const DismissKeyboard({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      // opaque = จับการแตะบนพื้นที่ว่างด้วย
      behavior: HitTestBehavior.opaque,
      onTap: () => FocusManager.instance.primaryFocus?.unfocus(),
      child: child,
    );
  }
}
