import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../data/models/resource.dart';

String formatCurrencyMinor(int amountMinor, String currency) {
  final formatter = NumberFormat.currency(
    symbol: '$currency ',
    decimalDigits: 2,
  );
  return formatter.format(amountMinor / 100);
}

String formatSlotRange(ResourceSlot slot) {
  final start = slot.startsAt.toLocal();
  final end = slot.endsAt.toLocal();
  final dateLabel = DateFormat('EEE, MMM d').format(start);
  final timeLabel =
      '${DateFormat('h:mm a').format(start)} – ${DateFormat('h:mm a').format(end)}';
  return '$dateLabel • $timeLabel';
}

String formatDayShort(DateTime day) => DateFormat('EEE').format(day);
String formatMonthDay(DateTime day) => DateFormat('MMM d').format(day);

String slotStatusLabel(ResourceSlot slot) {
  switch (slot.status) {
    case 'open':
      return 'Available';
    case 'held':
      return 'Temporarily held';
    case 'booked':
      return 'Booked';
    case 'blocked':
      return 'Unavailable';
    default:
      return slot.status;
  }
}

IconData resourceCategoryIcon(String category) {
  final normalized = category.toLowerCase();
  if (normalized.contains('court') || normalized.contains('sport')) {
    return Icons.sports_tennis_outlined;
  }
  if (normalized.contains('desk') || normalized.contains('workspace')) {
    return Icons.chair_alt_outlined;
  }
  if (normalized.contains('room') || normalized.contains('studio')) {
    return Icons.meeting_room_outlined;
  }
  if (normalized.contains('equipment')) {
    return Icons.devices_other_outlined;
  }
  if (normalized.contains('field')) {
    return Icons.grass_outlined;
  }
  return Icons.place_outlined;
}
