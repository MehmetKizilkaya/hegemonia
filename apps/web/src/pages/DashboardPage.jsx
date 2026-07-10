import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Coins, Loader2, LogOut, Map, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import TurkeyMap from '../components/TurkeyMap.jsx';

export default function DashboardPage() {
  const { user, wallet, loading, logout } = useAuth();
  const [regions, setRegions] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [regionsLoading, setRegionsLoading] = useState(true);

  useEffect(() => {
    api.regions()
      .then(setRegions)
      .catch(console.error)
      .finally(() => setRegionsLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-hegemony-gold" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const selected = regions.find((r) => r.slug === selectedSlug);

  return (
    <div className="min-h-screen">
      <header className="border-b border-hegemony-border bg-hegemony-panel/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-hegemony-gold" />
            <span className="font-semibold">Hegemonia</span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-slate-300">
              <Zap className="h-4 w-4 text-amber-400" />
              {user.energy}/20
            </span>
            <span className="flex items-center gap-1 text-hegemony-gold">
              <Coins className="h-4 w-4" />
              {wallet?.balance ?? 0} HA
            </span>
            <span className="hidden text-slate-400 sm:inline">{user.displayName}</span>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1 rounded-lg border border-hegemony-border px-3 py-1.5 text-slate-400 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Çıkış
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Türkiye Haritası</h1>
          <Link to="/login" className="text-xs text-slate-500 sm:hidden">
            {user.displayName}
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {regionsLoading ? (
              <div className="flex h-80 items-center justify-center rounded-xl border border-hegemony-border bg-hegemony-panel">
                <Loader2 className="h-6 w-6 animate-spin text-hegemony-gold" />
              </div>
            ) : (
              <TurkeyMap
                regions={regions}
                selectedSlug={selectedSlug}
                onSelect={setSelectedSlug}
              />
            )}
          </div>

          <div className="rounded-xl border border-hegemony-border bg-hegemony-panel p-5">
            {selected ? (
              <>
                <h2 className="text-xl font-bold">{selected.name}</h2>
                <p className="text-sm text-slate-400">Plaka: {selected.plateCode}</p>
                <div className="mt-4 space-y-2">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Verimlilik Bonusları
                  </h3>
                  {selected.bonuses.length === 0 ? (
                    <p className="text-sm text-slate-400">Bonus yok</p>
                  ) : (
                    selected.bonuses.map((b) => (
                      <div
                        key={b.sector}
                        className="flex items-center justify-between rounded-lg bg-hegemony-dark px-3 py-2 text-sm"
                      >
                        <span className="capitalize">{b.sector}</span>
                        <span className="font-medium text-hegemony-gold">
                          +{Math.round((Number(b.multiplier) - 1) * 100)}%
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">
                Haritadan bir il seçerek bölgesel bonusları görüntüleyin.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
