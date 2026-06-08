import 'dart:async';

import 'package:flutter/material.dart';
// `hide ChatMessage` — livekit_client exports its own ChatMessage type which
// would otherwise clash with our domain model of the same name.
import 'package:livekit_client/livekit_client.dart' hide ChatMessage;
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';

import '../../core/config.dart';
import '../../core/platform.dart';
import '../../core/models.dart';
import '../../services/consultation_service.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Live consultation: LiveKit audio/video + a REST-polled chat side sheet.
///
/// Video and chat are intentionally decoupled — if the camera or WebRTC
/// connection fails, chat still works, mirroring the web client's behaviour.
class ConsultationScreen extends StatefulWidget {
  const ConsultationScreen({super.key, required this.appointment});
  final Appointment appointment;

  @override
  State<ConsultationScreen> createState() => _ConsultationScreenState();
}

enum _Phase { connecting, live, error }

class _ConsultationScreenState extends State<ConsultationScreen> {
  _Phase _phase = _Phase.connecting;
  String _statusMessage = 'Connecting…';
  String? _fatalError;
  String? _videoError;

  JoinInfo? _join;
  Room? _room;

  bool _micOn = true;
  bool _camOn = true;

  final _messages = <ChatMessage>[];
  final _chatInput = TextEditingController();
  final _chatScroll = ScrollController();
  Timer? _chatTimer;
  bool _sending = false;

  ConsultationService get _svc => context.read<ConsultationService>();

  @override
  void initState() {
    super.initState();
    _camOn = widget.appointment.mode == 'VIDEO';
    _start();
  }

  @override
  void dispose() {
    _chatTimer?.cancel();
    _chatInput.dispose();
    _chatScroll.dispose();
    _room?.removeListener(_onRoomChange);
    _room?.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    // 1) Mint the join token + open the consultation. Chat depends only on this.
    try {
      final info = await _svc.join(widget.appointment.id);
      if (!mounted) return;
      setState(() {
        _join = info;
        _phase = _Phase.live;
      });
      _startChatPolling(info.consultationId);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _phase = _Phase.error;
        _fatalError = 'Could not open the consultation.\n$e';
      });
      return;
    }

    // 2) Best-effort video. Failure here degrades to chat-only, not a dead end.
    await _connectVideo();
  }

  Future<void> _connectVideo() async {
    final info = _join!;
    try {
      // permission_handler only exists on Android/iOS. On Linux/macOS/Windows
      // desktop and web, flutter_webrtc / the browser handle device access
      // directly, and calling permission_handler there throws
      // MissingPluginException — so request only on mobile.
      if (isMobilePlatform) {
        await Permission.microphone.request();
        if (info.isVideo) await Permission.camera.request();
      }

      final room = Room(
        roomOptions: RoomOptions(adaptiveStream: true, dynacast: true),
      );
      room.addListener(_onRoomChange);

      final url = AppConfig.livekitUrlFor(info.livekitUrl);
      await room.connect(url, info.token);

      await room.localParticipant?.setMicrophoneEnabled(true);
      if (info.isVideo) {
        await room.localParticipant?.setCameraEnabled(true);
      }
      if (!mounted) {
        await room.disconnect();
        return;
      }
      setState(() {
        _room = room;
        _videoError = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _videoError = 'Video unavailable — chat still works.');
    }
  }

  void _onRoomChange() {
    if (mounted) setState(() {});
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  void _startChatPolling(String consultationId) {
    _pollChat(consultationId);
    _chatTimer = Timer.periodic(
        const Duration(seconds: 3), (_) => _pollChat(consultationId));
  }

  Future<void> _pollChat(String consultationId) async {
    try {
      final list = await _svc.messages(consultationId);
      if (!mounted) return;
      final grew = list.length != _messages.length;
      setState(() {
        _messages
          ..clear()
          ..addAll(list);
      });
      if (grew) _scrollChatToEnd();
    } catch (_) {/* transient — next tick retries */}
  }

  Future<void> _sendChat() async {
    final body = _chatInput.text.trim();
    final id = _join?.consultationId;
    if (body.isEmpty || id == null || _sending) return;
    setState(() => _sending = true);
    try {
      final msg = await _svc.send(id, body);
      _chatInput.clear();
      if (!mounted) return;
      setState(() {
        if (!_messages.any((m) => m.id == msg.id)) _messages.add(msg);
        _sending = false;
      });
      _scrollChatToEnd();
    } catch (_) {
      if (!mounted) return;
      setState(() => _sending = false);
      toast(context, 'Message failed to send.', error: true);
    }
  }

  void _scrollChatToEnd() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_chatScroll.hasClients) {
        _chatScroll.animateTo(_chatScroll.position.maxScrollExtent,
            duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
      }
    });
  }

  // ── Controls ────────────────────────────────────────────────────────────

  Future<void> _toggleMic() async {
    final lp = _room?.localParticipant;
    if (lp == null) return;
    final next = !_micOn;
    await lp.setMicrophoneEnabled(next);
    setState(() => _micOn = next);
  }

  Future<void> _toggleCam() async {
    final lp = _room?.localParticipant;
    if (lp == null) return;
    final next = !_camOn;
    await lp.setCameraEnabled(next);
    setState(() => _camOn = next);
  }

  Future<void> _leave() async {
    final id = _join?.consultationId;
    _chatTimer?.cancel();
    await _room?.disconnect();
    if (id != null) {
      try {
        await _svc.end(id);
      } catch (_) {/* doctor may have ended it already */}
    }
    if (mounted) Navigator.of(context).pop();
  }

  // ── Track helpers ────────────────────────────────────────────────────────

  VideoTrack? _videoOf(Participant? p) {
    if (p == null) return null;
    for (final pub in p.videoTrackPublications) {
      final t = pub.track;
      if (t is VideoTrack) return t;
    }
    return null;
  }

  VideoTrack? get _remoteVideo {
    final room = _room;
    if (room == null) return null;
    for (final p in room.remoteParticipants.values) {
      final v = _videoOf(p);
      if (v != null) return v;
    }
    return null;
  }

  bool get _remotePresent =>
      (_room?.remoteParticipants.isNotEmpty ?? false);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0E1428),
      body: SafeArea(
        child: switch (_phase) {
          _Phase.connecting => _connecting(),
          _Phase.error => _errorView(),
          _Phase.live => _live(),
        },
      ),
    );
  }

  Widget _connecting() => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(color: Colors.white),
            const SizedBox(height: 16),
            Text(_statusMessage,
                style: const TextStyle(color: Colors.white70)),
          ],
        ),
      );

  Widget _errorView() => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Colors.white54, size: 48),
              const SizedBox(height: 12),
              Text(_fatalError ?? 'Something went wrong.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white70)),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Back'),
              ),
            ],
          ),
        ),
      );

  Widget _live() {
    final info = _join!;
    return Column(
      children: [
        _header(info),
        Expanded(child: _stage(info)),
        _chatPanel(),
        _controls(info),
      ],
    );
  }

  Widget _header(JoinInfo info) {
    final live = _room != null && _videoError == null;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              color: live ? Palette.success : Palette.warning,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(info.counterpartName.isEmpty ? 'Consultation' : info.counterpartName,
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w700)),
                Text(
                  info.isVideo ? 'Live · video' : 'Live · audio only',
                  style: const TextStyle(color: Colors.white54, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _stage(JoinInfo info) {
    final remote = _remoteVideo;
    final localVideo = _videoOf(_room?.localParticipant);
    return Padding(
      padding: const EdgeInsets.all(12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          fit: StackFit.expand,
          children: [
            Container(
              color: const Color(0xFF1A2240),
              child: remote != null
                  ? VideoTrackRenderer(remote)
                  : _placeholder(info),
            ),
            // Local camera picture-in-picture.
            if (info.isVideo && localVideo != null && _camOn)
              Positioned(
                right: 12,
                bottom: 12,
                width: 110,
                height: 150,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: VideoTrackRenderer(localVideo),
                ),
              ),
            if (_videoError != null)
              Positioned(
                left: 12,
                top: 12,
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(_videoError!,
                      style: const TextStyle(
                          color: Colors.white, fontSize: 12)),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _placeholder(JoinInfo info) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(info.isVideo ? Icons.videocam_off : Icons.call,
                color: Colors.white38, size: 44),
            const SizedBox(height: 10),
            Text(
              _videoError != null
                  ? 'Chat with ${info.counterpartName}'
                  : _remotePresent
                      ? '${info.counterpartName} has no camera on'
                      : 'Waiting for ${info.counterpartName} to join…',
              style: const TextStyle(color: Colors.white54),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );

  Widget _chatPanel() {
    return Container(
      height: 200,
      margin: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Expanded(
            child: _messages.isEmpty
                ? const Center(
                    child: Text('No messages yet.',
                        style: TextStyle(color: Palette.muted, fontSize: 13)),
                  )
                : ListView.builder(
                    controller: _chatScroll,
                    padding: const EdgeInsets.all(10),
                    itemCount: _messages.length,
                    itemBuilder: (_, i) => _bubble(_messages[i]),
                  ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 6, 6, 6),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _chatInput,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendChat(),
                    decoration: const InputDecoration(
                      hintText: 'Message…',
                      isDense: true,
                      border: InputBorder.none,
                    ),
                  ),
                ),
                IconButton(
                  onPressed: _sending ? null : _sendChat,
                  icon: const Icon(Icons.send, color: Palette.primary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _bubble(ChatMessage m) {
    final mine = m.senderRole == _join?.role;
    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 3),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        constraints: const BoxConstraints(maxWidth: 260),
        decoration: BoxDecoration(
          color: mine ? Palette.primary : const Color(0xFFEEF1F6),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          m.body,
          style: TextStyle(
              color: mine ? Colors.white : Palette.ink, fontSize: 13),
        ),
      ),
    );
  }

  Widget _controls(JoinInfo info) {
    final hasVideo = _room != null;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 14),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _circleBtn(
            icon: _micOn ? Icons.mic : Icons.mic_off,
            active: _micOn,
            onTap: hasVideo ? _toggleMic : null,
          ),
          const SizedBox(width: 18),
          _circleBtn(
            icon: Icons.call_end,
            bg: Palette.error,
            iconColor: Colors.white,
            onTap: _leave,
          ),
          const SizedBox(width: 18),
          if (info.isVideo)
            _circleBtn(
              icon: _camOn ? Icons.videocam : Icons.videocam_off,
              active: _camOn,
              onTap: hasVideo ? _toggleCam : null,
            )
          else
            const SizedBox(width: 56),
        ],
      ),
    );
  }

  Widget _circleBtn({
    required IconData icon,
    bool active = true,
    Color? bg,
    Color? iconColor,
    VoidCallback? onTap,
  }) {
    return InkResponse(
      onTap: onTap,
      child: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          color: bg ?? (active ? Colors.white24 : Colors.white10),
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          color: iconColor ?? (onTap == null ? Colors.white30 : Colors.white),
        ),
      ),
    );
  }
}
