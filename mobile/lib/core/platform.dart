import 'package:flutter/foundation.dart';

/// True only on Android/iOS — the platforms where mobile-only plugins
/// (`permission_handler`, and the like) actually have an implementation.
///
/// On Linux/macOS/Windows desktop and on web, calling those plugins throws
/// `MissingPluginException`, so guard such calls with this. On desktop,
/// `flutter_webrtc` accesses the camera/mic directly without a permission
/// prompt, so skipping `permission_handler` is correct, not a regression.
bool get isMobilePlatform =>
    !kIsWeb &&
    (defaultTargetPlatform == TargetPlatform.android ||
        defaultTargetPlatform == TargetPlatform.iOS);
