import type { AlertItem, LanguageCode, Plot, Recommendation, SatelliteBundle, WeatherBundle } from '../../types/mbongo';

export interface RuleThresholds {
  drySpellDaysThreshold: number;
  heavyRain24hMm: number;
  highTempC: number;
  ndviDropThreshold: number;
}

export const DEFAULT_RULE_THRESHOLDS: RuleThresholds = {
  drySpellDaysThreshold: 5,
  heavyRain24hMm: 30,
  highTempC: 31,
  ndviDropThreshold: -0.08,
};

export function runAgroclimaticRuleEngine(params: {
  plot: Pick<Plot, 'id' | 'name' | 'currentCrop' | 'plantingDate' | 'irrigationType'>;
  weather: WeatherBundle;
  satellite: SatelliteBundle;
  language: LanguageCode;
  thresholds?: RuleThresholds;
}): { recommendations: Recommendation[]; alerts: AlertItem[] } {
  const { plot, weather, satellite, language, thresholds = DEFAULT_RULE_THRESHOLDS } = params;
  const recommendations: Recommendation[] = [];
  const alerts: AlertItem[] = [];

  const histRain7d = weather.observedHistory.days.slice(-7).reduce((sum, d) => sum + d.precipMm, 0);
  const fcRain7d = weather.forecast.daily.reduce((sum, d) => sum + d.precipMm, 0);
  const maxFcTemp = Math.max(...weather.forecast.daily.map((d) => d.tempMaxC));
  const maxFcDailyRain = Math.max(...weather.forecast.daily.map((d) => d.precipMm));
  const dryForecastDays = weather.forecast.daily.filter((d) => d.precipMm < 1.0).length;

  const isAnyDemo = weather.observedHistory.isDemo || weather.forecast.isDemo;
  const dataDate = weather.forecast.updatedAt.slice(0, 10);
  const cropName = plot.currentCrop || 'Tomate';

  // Rule 1: Dry spell / Water deficit risk
  if (histRain7d < 10 && dryForecastDays >= thresholds.drySpellDaysThreshold) {
    const title =
      language === 'en'
        ? `Low rainfall forecast for ${cropName}`
        : language === 'kg'
        ? `Mvula yakete mu lumbu yikwiza (${cropName})`
        : `Pouca chuva prevista para ${cropName}`;

    const explanation =
      language === 'en'
        ? `Last 7 days had ${histRain7d.toFixed(1)} mm of rain and ${dryForecastDays} upcoming days look dry.`
        : `Choveu ${histRain7d.toFixed(1)} mm nos últimos 7 dias e esperam-se ${dryForecastDays} dias secos seguidos.`;

    const action =
      plot.irrigationType === 'rainfed'
        ? language === 'en'
          ? 'Check soil moisture at root depth and keep straw mulch around the plants.'
          : 'Confirmar a humidade junto às raízes e manter cobertura vegetal seca na base das plantas.'
        : language === 'en'
        ? 'Irrigate at the root zone early morning without wetting tomato leaves.'
        : 'Regar por gotejamento ao início da manhã directamente na raiz, sem molhar as folhas.';

    alerts.push({
      id: `alt_dry_${plot.id}`,
      plotId: plot.id,
      plotName: plot.name,
      level: 'attention',
      category: 'rain_deficit',
      title,
      message: explanation,
      source: weather.observedHistory.isDemo ? 'Previsão Demonstração' : 'NASA POWER + Previsão',
      dataDate,
      isDemoData: isAnyDemo,
    });

    recommendations.push({
      id: `rec_dry_${plot.id}`,
      ruleId: 'Regra de Humidade do Solo',
      plotId: plot.id,
      plotName: plot.name,
      title: language === 'en' ? `Protect root moisture in ${cropName}` : `Proteger a humidade do solo no ${cropName}`,
      explanation,
      priority: 'high',
      justificationData: `Chuva recente: ${histRain7d.toFixed(1)} mm · Chuva prevista: ${fcRain7d.toFixed(1)} mm`,
      source: 'NASA POWER e Previsão Climática',
      dataDate,
      suggestedAction: action,
      confidenceNote: isAnyDemo
        ? 'Previsão em modo de demonstração; confirme a humidade da terra antes de regar.'
        : 'Orientação baseada na chuva observada e prevista.',
      isDemoData: isAnyDemo,
    });
  }

  // Rule 2: Heavy rainfall / waterlogging & fungal humidity risk
  if (maxFcDailyRain >= thresholds.heavyRain24hMm || fcRain7d >= 45) {
    const title =
      language === 'en'
        ? `Attention: high humidity and rain expected for ${cropName}`
        : `Atenção: chuva intensa prevista para o ${cropName}`;

    const explanation =
      language === 'en'
        ? `Forecast shows up to ${maxFcDailyRain.toFixed(1)} mm in a single day (${fcRain7d.toFixed(1)} mm in 7 days).`
        : `A previsão aponta até ${maxFcDailyRain.toFixed(1)} mm num só dia (${fcRain7d.toFixed(1)} mm na semana), aumentando o risco de encharcamento.`;

    alerts.push({
      id: `alt_heavy_${plot.id}`,
      plotId: plot.id,
      plotName: plot.name,
      level: 'warning',
      category: 'heavy_rain',
      title,
      message: explanation,
      source: weather.forecast.isDemo ? 'Previsão Demonstração' : 'Previsão Meteorológica',
      dataDate,
      isDemoData: weather.forecast.isDemo,
    });

    recommendations.push({
      id: `rec_heavy_${plot.id}`,
      ruleId: 'Regra de Drenagem e Humidade',
      plotId: plot.id,
      plotName: plot.name,
      title: language === 'en' ? 'Check field drainage and inspect lower leaves' : 'Limpar valas de escoamento e vigiar folhas baixas',
      explanation,
      priority: 'high',
      justificationData: `Pico previsto num dia: ${maxFcDailyRain.toFixed(1)} mm`,
      source: weather.forecast.isDemo ? 'Previsão Demonstração' : 'Previsão Meteorológica',
      dataDate,
      suggestedAction:
        language === 'en'
          ? 'Keep drainage furrows clear between tomato rows and check lower leaves after rain.'
          : 'Desobstruir os regos entre linhas de tomate para evitar água parada e observar folhas inferiores após a chuva.',
      confidenceNote: 'Medida preventiva simples; não substitui inspecção presencial.',
      isDemoData: weather.forecast.isDemo,
    });
  }

  // Rule 3: Heat stress check
  if (maxFcTemp >= thresholds.highTempC) {
    recommendations.push({
      id: `rec_heat_${plot.id}`,
      ruleId: 'Regra Térmica',
      plotId: plot.id,
      plotName: plot.name,
      title: language === 'en' ? `High daytime heat for ${cropName}` : `Calor elevado previsto para o ${cropName}`,
      explanation:
        language === 'en'
          ? `Maximum temperatures may reach ${maxFcTemp.toFixed(1)} °C, which can stress tomato flowers.`
          : `A temperatura pode chegar aos ${maxFcTemp.toFixed(1)} °C, podendo afectar a floração do tomateiro.`,
      priority: 'medium',
      justificationData: `Temperatura máxima prevista: ${maxFcTemp.toFixed(1)} °C`,
      source: weather.forecast.isDemo ? 'Previsão Demonstração' : 'Previsão Meteorológica',
      dataDate,
      suggestedAction:
        language === 'en'
          ? 'Water early morning and avoid field work or spraying during midday heat.'
          : 'Regar bem cedo de manhã e evitar trabalhos ou aplicações nas folhas entre as 11h e as 15h.',
      confidenceNote: 'Indicador de conforto térmico para a cultura.',
      isDemoData: weather.forecast.isDemo,
    });
  }

  // Rule 4: NDVI evolution monitoring
  const usableObs = satellite.observations.filter((o) => o.usable && o.ndviMean !== null);
  if (usableObs.length >= 2) {
    const prev = usableObs[usableObs.length - 2];
    const latest = usableObs[usableObs.length - 1];
    const delta = Number(((latest.ndviMean ?? 0) - (prev.ndviMean ?? 0)).toFixed(2));
    recommendations.push({
      id: `rec_ndvi_${plot.id}`,
      ruleId: 'Acompanhamento Foliar (NDVI)',
      plotId: plot.id,
      plotName: plot.name,
      title:
        language === 'en'
          ? 'Combine satellite vigor check with field walk'
          : 'Confirmar vigor das folhas no terreno',
      explanation:
        language === 'en'
          ? `Latest clear satellite scene (${latest.acquisitionDate}) indicates NDVI ${latest.ndviMean} (${delta >= 0 ? '+' : ''}${delta} vs. previous scene).`
          : `A última imagem limpa (${latest.acquisitionDate}) mostra índice foliar de ${latest.ndviMean}, indicando boa evolução da copa.`,
      priority: delta <= thresholds.ndviDropThreshold ? 'high' : 'low',
      justificationData: `Comparação entre ${prev.acquisitionDate} e ${latest.acquisitionDate}`,
      source: satellite.isDemo ? 'Sentinel-2 (Demonstração)' : 'Copernicus Sentinel-2',
      dataDate: latest.acquisitionDate,
      suggestedAction:
        language === 'en'
          ? 'Walk the tomato rows twice a week to check leaves, stakes, and fruit set.'
          : 'Percorrer as linhas de tomate duas vezes por semana para confirmar folhas saudáveis, estacas firmes e pegamento dos frutos.',
      confidenceNote: 'O índice de satélite mostra apenas o vigor verde; confirme sempre visualmente no campo.',
      isDemoData: satellite.isDemo,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: `alt_info_${plot.id}`,
      plotId: plot.id,
      plotName: plot.name,
      level: 'info',
      category: 'weather_update',
      title:
        language === 'en'
          ? `Stable weather outlook for ${cropName}`
          : `Condições favoráveis para o ${cropName}`,
      message:
        language === 'en'
          ? `Next 7 days show ${fcRain7d.toFixed(1)} mm of expected rain and max ${maxFcTemp.toFixed(1)} °C.`
          : `Previsão semanal equilibrada: ${fcRain7d.toFixed(1)} mm de chuva acumulada e máxima de ${maxFcTemp.toFixed(1)} °C.`,
      source: weather.forecast.isDemo ? 'Previsão Demonstração' : 'Previsão Meteorológica',
      dataDate,
      isDemoData: weather.forecast.isDemo,
    });
  }

  return { recommendations, alerts };
}
