import { useCallback, useEffect, useState } from 'react';

const SECTOR_COLORS = {
  tarim: '#4ade80',
  gida: '#fbbf24',
  maden: '#94a3b8',
  petrol: '#1e1e1e',
  metal: '#60a5fa',
  savunma: '#f87171',
  enerji: '#a78bfa',
};

function getRegionFill(region, selectedSlug) {
  if (region.slug === selectedSlug) return '#c9a227';
  const topBonus = region.bonuses?.reduce(
    (best, b) => (Number(b.multiplier) > Number(best?.multiplier ?? 0) ? b : best),
    null,
  );
  if (topBonus) {
    const base = SECTOR_COLORS[topBonus.sector] ?? '#334155';
    return region.slug === selectedSlug ? base : `${base}99`;
  }
  return '#334155';
}

export default function TurkeyMap({ regions, selectedSlug, onSelect }) {
  const [svgContent, setSvgContent] = useState('');
  const regionBySvgId = Object.fromEntries(regions.map((r) => [r.svgPathId, r]));

  useEffect(() => {
    fetch('/turkey.svg')
      .then((res) => res.text())
      .then(setSvgContent)
      .catch(console.error);
  }, []);

  const handleClick = useCallback(
    (e) => {
      const path = e.target.closest('path[id]');
      if (!path) return;
      const region = regionBySvgId[path.id];
      if (region) onSelect(region.slug);
    },
    [regionBySvgId, onSelect],
  );

  if (!svgContent) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-hegemony-border bg-hegemony-panel text-sm text-slate-400">
        Harita yükleniyor...
      </div>
    );
  }

  const styledSvg = svgContent.replace(
    /<path([^>]*id="TR-[^"]+")[^>]*>/g,
    (match, attrs) => {
      const idMatch = attrs.match(/id="(TR-[^"]+)"/);
      const id = idMatch?.[1];
      const region = regionBySvgId[id];
      const fill = region ? getRegionFill(region, selectedSlug) : '#334155';
      const stroke = region?.slug === selectedSlug ? '#fbbf24' : '#1e293b';
      const sw = region?.slug === selectedSlug ? '2' : '0.5';
      return `<path${attrs} fill="${fill}" stroke="${stroke}" stroke-width="${sw}" style="cursor:pointer;transition:fill 0.2s" />`;
    },
  );

  return (
    <div
      className="overflow-hidden rounded-xl border border-hegemony-border bg-slate-900 p-2"
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick(e)}
      role="application"
      aria-label="Türkiye haritası — il seçmek için tıklayın"
      dangerouslySetInnerHTML={{ __html: styledSvg }}
    />
  );
}
