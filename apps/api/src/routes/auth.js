import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import {
  registerUser,
  loginUser,
  signToken,
  toAuthResponse,
} from '../services/authService.js';
import { requireAuth, attachMeHandler } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
  displayName: z.string().min(2).max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function setAuthCookie(res, token) {
  res.cookie('hegemonia_token', token, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function handleZodError(err, res) {
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Doğrulama hatası',
      code: 'VALIDATION_ERROR',
      details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
    });
  }
  return null;
}

router.post('/register', async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);
    const { user, wallet } = await registerUser(body);
    const token = signToken(user.id);
    setAuthCookie(res, token);
    return res.status(201).json(toAuthResponse({ user, wallet, token }));
  } catch (err) {
    const zodRes = handleZodError(err, res);
    if (zodRes) return zodRes;
    const status = err.status ?? 500;
    return res.status(status).json({
      error: err.message ?? 'Kayıt başarısız',
      code: err.code ?? 'REGISTER_FAILED',
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);
    const { user, wallet } = await loginUser(body);
    const token = signToken(user.id);
    setAuthCookie(res, token);
    return res.json(toAuthResponse({ user, wallet, token }));
  } catch (err) {
    const zodRes = handleZodError(err, res);
    if (zodRes) return zodRes;
    const status = err.status ?? 500;
    return res.status(status).json({
      error: err.message ?? 'Giriş başarısız',
      code: err.code ?? 'LOGIN_FAILED',
    });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('hegemonia_token', { path: '/' });
  return res.json({ ok: true });
});

router.get('/me', requireAuth, attachMeHandler);

export default router;
