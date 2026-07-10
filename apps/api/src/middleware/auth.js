import {
  findUserById,
  getWalletByUserId,
  verifyToken,
  toAuthResponse,
} from '../services/authService.js';

export function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return req.cookies?.hegemonia_token ?? null;
}

export async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Kimlik doğrulama gerekli', code: 'UNAUTHORIZED' });
    }

    const payload = verifyToken(token);
    const user = await findUserById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: 'Geçersiz oturum', code: 'INVALID_SESSION' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token', code: 'INVALID_TOKEN' });
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    const token = extractToken(req);
    if (token) {
      const payload = verifyToken(token);
      const user = await findUserById(payload.sub);
      if (user) {
        req.user = user;
        req.userId = user.id;
      }
    }
  } catch {
    // optional — devam et
  }
  next();
}

export async function attachMeHandler(req, res) {
  const wallet = await getWalletByUserId(req.userId);
  return res.json(toAuthResponse({ user: req.user, wallet, token: null }));
}
