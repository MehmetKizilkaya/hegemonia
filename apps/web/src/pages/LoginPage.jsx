import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Crown, Loader2, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { user, loading, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-hegemony-gold" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password, displayName: displayName || undefined });
      }
    } catch (err) {
      setError(err.message ?? 'Bir hata oluştu');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-hegemony-border bg-hegemony-panel p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-hegemony-gold/10">
            <Crown className="h-8 w-8 text-hegemony-gold" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Hegemonia</h1>
          <p className="mt-2 text-sm text-slate-400">
            Türkiye senin. Ekonomi, siyaset, savaş.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">Görünen ad</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-hegemony-border bg-hegemony-dark px-3 py-2.5 text-sm outline-none focus:border-hegemony-gold"
                placeholder="Komutan adın"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">E-posta</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-hegemony-border bg-hegemony-dark px-3 py-2.5 text-sm outline-none focus:border-hegemony-gold"
              placeholder="ornek@email.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Şifre</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-hegemony-border bg-hegemony-dark px-3 py-2.5 text-sm outline-none focus:border-hegemony-gold"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-hegemony-gold px-4 py-2.5 text-sm font-semibold text-hegemony-dark transition hover:bg-hegemony-gold/90 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="h-4 w-4" />
                Giriş Yap
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Kayıt Ol
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {mode === 'login' ? 'Hesabın yok mu?' : 'Zaten hesabın var mı?'}{' '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            className="font-medium text-hegemony-gold hover:underline"
          >
            {mode === 'login' ? 'Kayıt ol' : 'Giriş yap'}
          </button>
        </p>
      </div>

      <Link to="/health" className="mt-6 text-xs text-slate-500 hover:text-slate-400">
        API durumu
      </Link>
    </div>
  );
}
