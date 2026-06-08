import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth_store.dart';
import '../theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

enum _Mode { login, signup }

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _code = TextEditingController();
  _Mode _mode = _Mode.login;
  bool _busy = false;
  bool _obscure = true;
  String? _error;
  late AnimationController _anim;
  late Animation<double> _fade;

  @override
  void initState() {
    super.initState();
    _anim = AnimationController(vsync: this, duration: const Duration(milliseconds: 400));
    _fade = CurvedAnimation(parent: _anim, curve: Curves.easeOut);
    _anim.forward();
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _code.dispose();
    _anim.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final auth = context.read<AuthStore>();
    setState(() { _busy = true; _error = null; });
    final err = _mode == _Mode.login
        ? await auth.login(_email.text.trim(), _password.text)
        : await auth.signup(_email.text.trim(), _password.text);
    if (!mounted) return;
    setState(() { _busy = false; _error = err; });
  }

  Future<void> _verify() async {
    final auth = context.read<AuthStore>();
    setState(() { _busy = true; _error = null; });
    final err = await auth.verifyTfa(_code.text.trim());
    if (!mounted) return;
    setState(() { _busy = false; _error = err; });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthStore>();
    final tfa = auth.pendingTfa != null;
    return Scaffold(
      backgroundColor: Palette.surface,
      body: Column(
        children: [
          // Gradient header
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(24, 64, 24, 32),
            decoration: const BoxDecoration(
              gradient: Palette.primaryGradient,
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(32),
                bottomRight: Radius.circular(32),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Icon(Icons.health_and_safety,
                      color: Colors.white, size: 28),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Telemedecine',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 28,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  tfa
                      ? 'Two-factor authentication'
                      : _mode == _Mode.login
                          ? 'Welcome back'
                          : 'Create your account',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.75),
                    fontSize: 15,
                  ),
                ),
              ],
            ),
          ),

          // Form
          Expanded(
            child: FadeTransition(
              opacity: _fade,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 8),
                      if (tfa) ...[
                        _sectionLabel('Authentication code'),
                        TextField(
                          controller: _code,
                          keyboardType: TextInputType.number,
                          maxLength: 6,
                          autofocus: true,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                              fontSize: 24, letterSpacing: 8, fontWeight: FontWeight.w700),
                          decoration: const InputDecoration(
                            hintText: '• • • • • •',
                            counterText: '',
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Enter the 6-digit code from your authenticator app.',
                          style: TextStyle(color: Palette.muted, fontSize: 13),
                        ),
                        const SizedBox(height: 20),
                        if (_error != null) _errorBox(_error!),
                        FilledButton(
                          onPressed: _busy ? null : _verify,
                          child: _busy ? const _Spinner() : const Text('Verify'),
                        ),
                      ] else ...[
                        _sectionLabel('Email address'),
                        TextField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          autocorrect: false,
                          autofocus: true,
                          decoration: const InputDecoration(
                            hintText: 'you@example.com',
                            prefixIcon: Icon(Icons.email_outlined, size: 20),
                          ),
                        ),
                        const SizedBox(height: 16),
                        _sectionLabel('Password'),
                        TextField(
                          controller: _password,
                          obscureText: _obscure,
                          onSubmitted: (_) => _busy ? null : _submit(),
                          decoration: InputDecoration(
                            hintText: '••••••••••••',
                            prefixIcon: const Icon(Icons.lock_outline, size: 20),
                            suffixIcon: IconButton(
                              icon: Icon(_obscure
                                  ? Icons.visibility_off_outlined
                                  : Icons.visibility_outlined),
                              onPressed: () =>
                                  setState(() => _obscure = !_obscure),
                            ),
                          ),
                        ),
                        if (_mode == _Mode.signup) ...[
                          const SizedBox(height: 8),
                          _hint('At least 12 characters, with uppercase, lowercase and a digit.'),
                        ],
                        const SizedBox(height: 24),
                        if (_error != null) _errorBox(_error!),
                        FilledButton(
                          onPressed: _busy ? null : _submit,
                          child: _busy
                              ? const _Spinner()
                              : Text(_mode == _Mode.login
                                  ? 'Sign in'
                                  : 'Create account'),
                        ),
                        const SizedBox(height: 12),
                        Center(
                          child: TextButton(
                            onPressed: _busy
                                ? null
                                : () => setState(() {
                                      _mode = _mode == _Mode.login
                                          ? _Mode.signup
                                          : _Mode.login;
                                      _error = null;
                                    }),
                            child: Text(
                              _mode == _Mode.login
                                  ? "Don't have an account? Sign up"
                                  : 'Already have an account? Sign in',
                              style: const TextStyle(
                                  color: Palette.primary, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionLabel(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(text,
            style: const TextStyle(
                fontSize: 13, fontWeight: FontWeight.w600, color: Palette.ink)),
      );

  Widget _hint(String text) => Padding(
        padding: const EdgeInsets.only(top: 6),
        child: Row(
          children: [
            const Icon(Icons.info_outline, size: 14, color: Palette.muted),
            const SizedBox(width: 4),
            Expanded(
              child: Text(text,
                  style: const TextStyle(color: Palette.muted, fontSize: 12)),
            ),
          ],
        ),
      );

  Widget _errorBox(String message) => Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
        decoration: BoxDecoration(
          color: const Color(0xFFFDEAE7),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFFFCDD2)),
        ),
        child: Row(
          children: [
            const Icon(Icons.error_outline, color: Palette.error, size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: Text(message,
                  style: const TextStyle(color: Palette.error, fontSize: 13)),
            ),
          ],
        ),
      );
}

class _Spinner extends StatelessWidget {
  const _Spinner();
  @override
  Widget build(BuildContext context) => const SizedBox(
        height: 20,
        width: 20,
        child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
      );
}
