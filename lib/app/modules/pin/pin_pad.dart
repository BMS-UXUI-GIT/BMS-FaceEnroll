import 'package:flutter/material.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

import '../../theme/nexus.dart';

/// จุดแสดงจำนวนหลักที่กรอกแล้ว (ธีม NEXUS — cyan + glow)
class PinDots extends StatelessWidget {
  const PinDots({super.key, required this.length, required this.filled});
  final int length;
  final int filled;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(length, (i) {
        final on = i < filled;
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 7),
          width: 13,
          height: 13,
          padding: const EdgeInsets.all(1.5),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: on ? Nexus.pAccent : Nexus.pLine,
            boxShadow: on
                ? [
                    BoxShadow(
                      color: Nexus.pAccent.withValues(alpha: 0.6),
                      blurRadius: 12,
                    ),
                  ]
                : null,
          ),
          child: Container(
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: on ? Nexus.pAccent : Colors.transparent,
            ),
          ),
        );
      }),
    );
  }
}

/// แป้นตัวเลข 0-9 + ลบ (ธีม NEXUS)
class PinKeypad extends StatelessWidget {
  const PinKeypad({
    super.key,
    required this.onKey,
    required this.onDelete,
    this.disabled = false,
  });
  final void Function(String) onKey;
  final VoidCallback onDelete;
  final bool disabled;

  Widget _key(
    BuildContext context, {
    String? label,
    Widget? child,
    VoidCallback? onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.all(6),
      child: SizedBox(
        width: 74,
        height: 54,
        child: Material(
          color: (label == null && child == null)
              ? Colors.transparent
              : Nexus.pPanel,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(15),
            side: (label == null && child == null)
                ? BorderSide.none
                : BorderSide(color: Nexus.pLine),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(15),
            onTap: (disabled || onTap == null) ? null : onTap,
            child: Center(
              child:
                  child ??
                  Text(
                    label ?? '',
                    style: Nexus.tech(size: 21, weight: FontWeight.w600),
                  ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    Widget row(List<Widget> children) =>
        Row(mainAxisAlignment: MainAxisAlignment.center, children: children);
    Widget num(String n) => _key(context, label: n, onTap: () => onKey(n));

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        row([num('1'), num('2'), num('3')]),
        row([num('4'), num('5'), num('6')]),
        row([num('7'), num('8'), num('9')]),
        row([
          _key(context),
          num('0'),
          _key(
            context,
            child: Icon(
              PhosphorIconsRegular.backspace,
              size: 24,
              color: Nexus.pSub,
            ),
            onTap: onDelete,
          ),
        ]),
      ],
    );
  }
}
