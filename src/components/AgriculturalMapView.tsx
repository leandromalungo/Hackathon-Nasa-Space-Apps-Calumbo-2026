import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { useMbongo } from '../context/MbongoContext';

export const AgriculturalMapView: React.FC = () => {
  const { t, formatNumber, language } = useI18n();
  const { farms, plots, selectedPlotId, setSelectedPlotId, weather, satellite } = useMbongo();

  const [layerBoundaries, setLayerBoundaries] = useState(true);
  const [layerRain, setLayerRain] = useState(false);
  const [layerNdvi, setLayerNdvi] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayLayerRef = useRef<L.LayerGroup | null>(null);

  const activeFarm = farms[0];
  const filteredPlots = plots.slice(0, 1);

  const latestUsableNdvi = satellite?.observations
    .filter((o) => o.usable && o.ndviMean !== null)
    .slice(-1)[0];

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const firstPlot = filteredPlots[0] || plots[0];
    const center: [number, number] = firstPlot
      ? [firstPlot.centerLat, firstPlot.centerLng]
      : [-12.7761, 15.7392];

    const map = L.map(mapContainerRef.current).setView(center, 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    const group = L.layerGroup().addTo(map);
    mapRef.current = map;
    overlayLayerRef.current = group;

    return () => {
      map.remove();
      mapRef.current = null;
      overlayLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = overlayLayerRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const bounds: [number, number][] = [];

    farms.slice(0, 1).forEach((f) => {
      bounds.push([f.lat, f.lng]);
      L.circleMarker([f.lat, f.lng], {
        radius: 7,
        color: '#0F172A',
        fillColor: '#FFFFFF',
        fillOpacity: 1,
        weight: 2,
      })
        .bindPopup(`<strong>${f.name}</strong><br/>${f.province} · ${f.municipality}`)
        .addTo(group);
    });

    filteredPlots.forEach((plot) => {
      bounds.push([plot.centerLat, plot.centerLng]);
      const isSelected = plot.id === selectedPlotId;

      if (layerBoundaries) {
        try {
          const parsed = JSON.parse(plot.geometryGeoJson) as {
            geometry?: { coordinates?: number[][][] };
          };
          const ring = parsed?.geometry?.coordinates?.[0];
          if (ring && ring.length >= 3) {
            const latLngs: [number, number][] = ring.map(([lng, lat]) => [lat, lng]);
            const poly = L.polygon(latLngs, {
              color: layerNdvi ? '#7C3AED' : isSelected ? '#65A30D' : '#334155',
              fillColor: layerNdvi ? '#8B5CF6' : '#84CC16',
              fillOpacity: layerNdvi ? 0.45 : isSelected ? 0.32 : 0.16,
              weight: isSelected ? 3 : 2,
            });
            poly.bindPopup(
              `<strong>${plot.name}</strong><br/>${plot.currentCrop} · ${plot.areaHa} ha`
            );
            poly.on('click', () => setSelectedPlotId(plot.id));
            poly.addTo(group);
          }
        } catch {
          // ignore malformed geojson
        }
      }

      if (layerRain) {
        const fc7d = weather ? weather.forecast.daily.reduce((s, d) => s + d.precipMm, 0) : 18;
        L.circle([plot.centerLat, plot.centerLng], {
          radius: 1800,
          color: '#0284C7',
          fillColor: '#38BDF8',
          fillOpacity: 0.18,
          weight: 1,
        })
          .bindTooltip(`Chuva prev. 7d: ${fc7d.toFixed(1)} mm`)
          .addTo(group);
      }
    });

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [farms, filteredPlots, selectedPlotId, layerBoundaries, layerRain, layerNdvi, weather, setSelectedPlotId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-900">{t('nav.map')}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {language === 'en'
              ? 'Toggleable layers for plot boundaries, rainfall forecast, and satellite NDVI.'
              : 'Limites das parcelas e camadas activáveis de precipitação e NDVI satelital.'}
          </p>
        </div>

        <div className="text-xs font-medium text-slate-600">
          {activeFarm?.name || 'Fazenda Boa Esperança'} · Tomate ({formatNumber(filteredPlots[0]?.areaHa || 2.5, 1)} ha)
        </div>
      </div>

      {/* Layer Controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Layers className="h-4 w-4 text-slate-500" />
          <span>Camadas:</span>
        </div>
        <button
          type="button"
          onClick={() => setLayerBoundaries((v) => !v)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
            layerBoundaries ? 'bg-lime-600 text-white' : 'border border-slate-300 bg-white text-slate-700'
          }`}
        >
          Limites das Parcelas
        </button>
        <button
          type="button"
          onClick={() => setLayerRain((v) => !v)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
            layerRain ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700'
          }`}
        >
          Precipitação Prevista (mm)
        </button>
        <button
          type="button"
          onClick={() => setLayerNdvi((v) => !v)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
            layerNdvi ? 'bg-violet-600 text-white' : 'border border-slate-300 bg-white text-slate-700'
          }`}
        >
          Camada NDVI (Sentinel-2)
        </button>
      </div>

      <div ref={mapContainerRef} className="h-[460px] w-full rounded-2xl border border-slate-200" />

      {/* Explicit Legend, Units, Date & Source */}
      <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600 sm:grid-cols-3">
        <div>
          <strong className="text-slate-900">Limites das Parcelas</strong>
          <p className="mt-0.5">
            Polígonos GeoJSON · {filteredPlots.length} parcelas visíveis (hectares calculados).
          </p>
        </div>
        <div>
          <strong className="text-slate-900">Precipitação</strong>
          <p className="mt-0.5">
            {weather
              ? `Unidade: mm · Fonte: ${weather.forecast.source} (${weather.forecast.updatedAt.slice(0, 10)})`
              : 'A aguardar dados meteorológicos'}
          </p>
        </div>
        <div>
          <strong className="text-slate-900">NDVI (Satélite)</strong>
          <p className="mt-0.5">
            {latestUsableNdvi
              ? `Última imagem limpa: ${latestUsableNdvi.acquisitionDate} · NDVI ${formatNumber(latestUsableNdvi.ndviMean || 0, 2)} · Nuvens ${latestUsableNdvi.cloudCoverPct}% (${latestUsableNdvi.isDemo ? 'Demo' : 'Real'})`
              : 'Sem imagem sem nuvens recente.'}
          </p>
        </div>
      </div>
    </div>
  );
};
