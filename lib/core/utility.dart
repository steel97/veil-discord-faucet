String toTimeString(int totalSeconds) {
  final totalMs = totalSeconds * 1000;
  final duration = Duration(milliseconds: totalMs);
  return duration.toString().split('.').first.padLeft(8, '0');
}

int getUnixTimestamp() {
  return (DateTime.now().millisecondsSinceEpoch / 1000).round();
}

Future<void> sleep(int ms) {
  return Future.delayed(Duration(milliseconds: ms));
}
