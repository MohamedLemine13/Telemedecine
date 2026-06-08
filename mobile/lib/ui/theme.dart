import 'package:flutter/material.dart';

/// Mirrors the web app's design tokens (DESIGN.md): navy primary, teal accent,
/// the standard status palette.
class Palette {
  static const primary = Color(0xFF0A3B7F);
  static const primaryHover = Color(0xFF1B4FA8);
  static const primaryTint = Color(0xFFE8EFFA);
  static const cyan = Color(0xFF00BCD4);
  static const success = Color(0xFF2CC68D);
  static const warning = Color(0xFFFFA726);
  static const error = Color(0xFFE74C3C);
  static const info = Color(0xFF3498DB);
  static const surface = Color(0xFFF6F8FB);
  static const ink = Color(0xFF1F2937);
  static const muted = Color(0xFF6B7280);
}

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: Palette.primary,
    primary: Palette.primary,
  ).copyWith(surface: Colors.white);

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: Palette.surface,
    appBarTheme: const AppBarTheme(
      backgroundColor: Colors.white,
      foregroundColor: Palette.ink,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: Palette.ink,
        fontSize: 18,
        fontWeight: FontWeight.w700,
      ),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFE5E7EB)),
      ),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Color(0xFFD1D5DB)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: Palette.primary, width: 1.6),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: Palette.primary,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
    ),
  );
}
