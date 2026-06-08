import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth_store.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Single screen handling sign-in, sign-up, and the optional TOTP step.
/// On success the auth gate in app.dart swaps to the home shell automatically.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

enum _Mode { login, signup }

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _code = TextEditingController();
  _Mode _mode = _Mode.login;
  bool _busy = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final auth = context.read<AuthStore>();
    setState(() {
      _busy = true;
      _error = null;
    });
    final email = _email.text.trim();
    final pwd = _password.text;
    final err = _mode == _Mode.login
        ? await auth.login(email, pwd)
        : await auth.signup(email, pwd);
    if (!mounted) return;
    setState(() {
      _busy = false;
      _error = err;
    });
  }

  Future<void> _verify() async {
    final auth = context.read<AuthStore>();
    setState(() {
      _busy = true;
      _error = null;
    });
    final err = await auth.verifyTfa(_code.text.trim());
    if (!mounted) return;
    setState(() {
      _busy = false;
      _error = err;
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthStore>();
    final tfa = auth.pendingTfa != null;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 8),
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Palette.primary,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.health_and_safety,
                        color: Colors.white, size: 30),
                  ),
                  const SizedBox(height: 16),
                  const Text('Telemedecine',
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 4),
                  Text(
                    tfa
                        ? 'Enter the 6-digit code from your authenticator app.'
                        : _mode == _Mode.login
                            ? 'Sign in to your patient account.'
                            : 'Create your patient account.',
                    style: const TextStyle(color: Palette.muted),
                  ),
                  const SizedBox(height: 24),
                  if (tfa) ...[
                    TextField(
                      controller: _code,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      decoration: const InputDecoration(
                        labelText: 'Authentication code',
                        counterText: '',
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (_error != null) _errorBox(_error!),
                    FilledButton(
                      onPressed: _busy ? null : _verify,
                      child: _busy
                          ? const _Spinner()
                          : const Text('Verify'),
                    ),
                  ] else ...[
                    TextField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      decoration: const InputDecoration(labelText: 'Email'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _password,
                      obscureText: _obscure,
                      decoration: InputDecoration(
                        labelText: 'Password',
                        suffixIcon: IconButton(
                          icon: Icon(_obscure
                              ? Icons.visibility_off
                              : Icons.visibility),
                          onPressed: () => setState(() => _obscure = !_obscure),
                        ),
                      ),
                    ),
                    if (_mode == _Mode.signup)
                      const Padding(
                        padding: EdgeInsets.only(top: 8),
                        child: Text(
                          'At least 12 characters, with an upper, lower and digit.',
                          style: TextStyle(color: Palette.muted, fontSize: 12),
                        ),
                      ),
                    const SizedBox(height: 16),
                    if (_error != null) _errorBox(_error!),
                    FilledButton(
                      onPressed: _busy ? null : _submit,
                      child: _busy
                          ? const _Spinner()
                          : Text(_mode == _Mode.login ? 'Sign in' : 'Create account'),
                    ),
                    const SizedBox(height: 8),
                    TextButton(
                      onPressed: _busy
                          ? null
                          : () => setState(() {
                                _mode = _mode == _Mode.login
                                    ? _Mode.signup
                                    : _Mode.login;
                                _error = null;
                              }),
                      child: Text(_mode == _Mode.login
                          ? "New here? Create an account"
                          : 'Already have an account? Sign in'),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _errorBox(String message) => Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFFDEAE7),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(message,
            style: const TextStyle(color: Palette.error, fontSize: 13)),
      );
}

class _Spinner extends StatelessWidget {
  const _Spinner();
  @override
  Widget build(BuildContext context) => const SizedBox(
        height: 20,
        width: 20,
        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
      );
}
