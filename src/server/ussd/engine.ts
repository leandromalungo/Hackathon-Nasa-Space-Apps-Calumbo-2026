import type { LanguageCode, UssdSimResponse } from '../../types/mbongo';

export interface UssdSessionState {
  sessionId: string;
  phoneNumber: string;
  language: LanguageCode | null;
  menu: string;
  stepData: Record<string, string>;
  lastActivityAt: number;
}

export interface UssdEventRecord {
  id: string;
  sessionId: string;
  phoneNumberMasked: string;
  input: string;
  menu: string;
  output: string;
  language: LanguageCode;
  timestamp: string;
}

export interface UssdActivityLog {
  id: string;
  phoneNumberMasked: string;
  activityType: string;
  note: string;
  timestamp: string;
}

const SESSION_TIMEOUT_MS = 180_000; // 3 minutes USSD timeout
const sessions = new Map<string, UssdSessionState>();
const phoneLanguages = new Map<string, LanguageCode>();
const ussdEvents: UssdEventRecord[] = [];
const ussdActivities: UssdActivityLog[] = [];

function maskPhone(phone: string): string {
  const clean = phone.replace(/\s+/g, '');
  if (clean.length <= 6) return '***';
  return `${clean.slice(0, 5)}****${clean.slice(-3)}`;
}

const USSD_STRINGS: Record<
  LanguageCode,
  {
    mainMenu: string;
    weather: string;
    alerts: string;
    recs: string;
    logMenu: string;
    langMenu: string;
    help: string;
    invalid: string;
    logged: string;
    bye: string;
    timeout: string;
  }
> = {
  'pt-AO': {
    mainMenu:
      'MBONGO\n1. Meteorologia\n2. Alertas\n3. Recomendacoes\n4. Registar actividade\n5. Idioma\n6. Ajuda\n0. Sair',
    weather:
      'Clima (Demo): Tmax 26C, Tmin 16C. Chuva prevista 7d: 18mm. Fonte: Previsao Demo.\n0. Voltar',
    alerts:
      'Alertas (1): Atencao - janela seca de 4 dias prevista. Verificar humidade.\n0. Voltar',
    recs:
      'Recomendacao: Manter cobertura morta e adiar adubacao ate chuva.\n0. Voltar',
    logMenu:
      'Registar actividade:\n1. Sementeira\n2. Rega\n3. Inspecao\n4. Colheita\n0. Voltar',
    langMenu:
      'Idioma:\n1. Portugues (pt-AO)\n2. English\n3. Kikongo (em revisao)\n0. Voltar',
    help:
      'MBONGO USSD: Apoio agricola sem Internet. Marque 0 para voltar ao menu.\n0. Voltar',
    invalid: 'Opcao invalida. Tente novamente.\n0. Menu',
    logged: 'Actividade registada com sucesso no MBONGO. Obrigado!',
    bye: 'Obrigado por usar o MBONGO. Boa campanha agricola.',
    timeout: 'Sessao USSD expirada por inactividade. Marque novamente para iniciar.',
  },
  en: {
    mainMenu:
      'MBONGO\n1. Weather\n2. Alerts\n3. Advisories\n4. Log activity\n5. Language\n6. Help\n0. Exit',
    weather:
      'Weather (Demo): Max 26C, Min 16C. 7d forecast rain: 18mm.\n0. Back',
    alerts:
      'Alerts (1): Attention - 4-day dry window expected. Check soil moisture.\n0. Back',
    recs:
      'Advisory: Keep mulch cover and delay top-dress fertilizer until rain.\n0. Back',
    logMenu:
      'Log activity:\n1. Sowing\n2. Irrigation\n3. Inspection\n4. Harvest\n0. Back',
    langMenu:
      'Language:\n1. Portugues\n2. English\n3. Kikongo (in review)\n0. Back',
    help:
      'MBONGO USSD: Offline farm guidance. Press 0 to return to menu.\n0. Back',
    invalid: 'Invalid option. Please try again.\n0. Menu',
    logged: 'Activity logged in MBONGO. Thank you!',
    bye: 'Thank you for using MBONGO.',
    timeout: 'USSD session timed out. Dial again to restart.',
  },
  kg: {
    mainMenu:
      'MBONGO (Kikongo - revisao)\n1. Mvula\n2. Nsangu\n3. Malongi\n4. Soneka kisalu\n5. Ndinga\n6. Lusadisu\n0. Vaika',
    weather:
      'Mvula (Tesa): Tmax 26C, Tmin 16C. Mvula 7d: 18mm.\n0. Vutuka',
    alerts:
      'Nsangu (1): Tala - lumbu 4 kondwa mvula. Tala maza ma ntoto.\n0. Vutuka',
    recs:
      'Malongi: Lunda matiti ma yuma va ntoto, vingila mvula.\n0. Vutuka',
    logMenu:
      'Soneka kisalu:\n1. Kuna\n2. Maza\n3. Tala lupangu\n4. Nkutakani\n0. Vutuka',
    langMenu:
      'Sola ndinga:\n1. Portugues\n2. English\n3. Kikongo (em revisao)\n0. Vutuka',
    help:
      'MBONGO USSD: Lusadisu kondwa Internet. Finika 0 mu vutuka.\n0. Vutuka',
    invalid: 'Nsiku wambi. Finika diaka.\n0. Menu',
    logged: 'Kisalu kisonamene mu MBONGO. Matondo!',
    bye: 'Matondo mu sadila MBONGO.',
    timeout: 'Ntangu ya USSD yimene. Vutuka mu yantika.',
  },
};

export function processUssdRequest(params: {
  sessionId: string;
  phoneNumber: string;
  text: string;
  preferredLanguage?: LanguageCode;
}): UssdSimResponse {
  const { sessionId, phoneNumber, text, preferredLanguage } = params;
  const now = Date.now();
  let session = sessions.get(sessionId);

  if (session && now - session.lastActivityAt > SESSION_TIMEOUT_MS) {
    const lang = session.language || 'pt-AO';
    sessions.delete(sessionId);
    return {
      sessionId,
      mode: 'END',
      message: USSD_STRINGS[lang].timeout,
      charCount: USSD_STRINGS[lang].timeout.length,
      language: lang,
      menu: 'timeout',
      isSimulated: !process.env.USSD_GATEWAY_URL,
    };
  }

  const trimmed = (text || '').trim();
  // Gateway sends full cumulative path (e.g. "1*0") OR single step input in simulator
  const tokens = trimmed === '' ? [] : trimmed.split('*');
  const lastInput = tokens.length > 0 ? tokens[tokens.length - 1] : '';

  if (!session) {
    const rememberedLang = preferredLanguage || phoneLanguages.get(phoneNumber) || null;
    session = {
      sessionId,
      phoneNumber,
      language: rememberedLang,
      menu: rememberedLang ? 'main' : 'select_language_first',
      stepData: {},
      lastActivityAt: now,
    };
    sessions.set(sessionId, session);
  } else {
    session.lastActivityAt = now;
  }

  let mode: 'CON' | 'END' = 'CON';
  let message = '';

  if (session.menu === 'select_language_first') {
    if (lastInput === '') {
      message =
        'Bem-vindo ao MBONGO\nEscolha idioma / Language:\n1. Portugues\n2. English\n3. Kikongo (em revisao)';
    } else if (lastInput === '1' || lastInput === '2' || lastInput === '3') {
      const chosen: LanguageCode = lastInput === '1' ? 'pt-AO' : lastInput === '2' ? 'en' : 'kg';
      session.language = chosen;
      phoneLanguages.set(phoneNumber, chosen);
      session.menu = 'main';
      message = USSD_STRINGS[chosen].mainMenu;
    } else {
      message = '1. Portugues\n2. English\n3. Kikongo (em revisao)';
    }
  } else {
    const lang = session.language || 'pt-AO';
    const copy = USSD_STRINGS[lang];

    if (session.menu === 'main') {
      if (lastInput === '') {
        message = copy.mainMenu;
      } else if (lastInput === '1') {
        session.menu = 'sub_weather';
        message = copy.weather;
      } else if (lastInput === '2') {
        session.menu = 'sub_alerts';
        message = copy.alerts;
      } else if (lastInput === '3') {
        session.menu = 'sub_recs';
        message = copy.recs;
      } else if (lastInput === '4') {
        session.menu = 'log_activity';
        message = copy.logMenu;
      } else if (lastInput === '5') {
        session.menu = 'change_lang';
        message = copy.langMenu;
      } else if (lastInput === '6') {
        session.menu = 'sub_help';
        message = copy.help;
      } else if (lastInput === '0') {
        mode = 'END';
        message = copy.bye;
        sessions.delete(sessionId);
      } else {
        message = copy.invalid;
      }
    } else if (session.menu === 'log_activity') {
      if (lastInput === '0') {
        session.menu = 'main';
        message = copy.mainMenu;
      } else if (['1', '2', '3', '4'].includes(lastInput)) {
        const types: Record<string, string> = {
          '1': 'sowing',
          '2': 'irrigation',
          '3': 'inspection',
          '4': 'harvest',
        };
        ussdActivities.unshift({
          id: `uact_${Date.now()}`,
          phoneNumberMasked: maskPhone(phoneNumber),
          activityType: types[lastInput],
          note: `Registado via USSD (${lang})`,
          timestamp: new Date().toISOString(),
        });
        mode = 'END';
        message = copy.logged;
        sessions.delete(sessionId);
      } else {
        message = copy.logMenu;
      }
    } else if (session.menu === 'change_lang') {
      if (lastInput === '0') {
        session.menu = 'main';
        message = copy.mainMenu;
      } else if (lastInput === '1' || lastInput === '2' || lastInput === '3') {
        const chosen: LanguageCode = lastInput === '1' ? 'pt-AO' : lastInput === '2' ? 'en' : 'kg';
        session.language = chosen;
        phoneLanguages.set(phoneNumber, chosen);
        session.menu = 'main';
        message = USSD_STRINGS[chosen].mainMenu;
      } else {
        message = copy.langMenu;
      }
    } else {
      // Submenus: 0 returns to main menu
      if (lastInput === '0' || lastInput === '') {
        session.menu = 'main';
        message = copy.mainMenu;
      } else {
        message = copy.invalid;
      }
    }
  }

  const finalLang = session.language || 'pt-AO';
  const event: UssdEventRecord = {
    id: `uevt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sessionId,
    phoneNumberMasked: maskPhone(phoneNumber),
    input: lastInput || '(DIAL)',
    menu: session.menu,
    output: message,
    language: finalLang,
    timestamp: new Date().toISOString(),
  };
  ussdEvents.unshift(event);
  if (ussdEvents.length > 80) ussdEvents.length = 80;

  return {
    sessionId,
    mode,
    message,
    charCount: message.length,
    language: finalLang,
    menu: session.menu,
    isSimulated: !process.env.USSD_GATEWAY_URL,
    loggedEvent: {
      timestamp: event.timestamp,
      input: event.input,
      menu: event.menu,
    },
  };
}

export function getUssdAuditData() {
  return {
    events: ussdEvents,
    activities: ussdActivities,
    activeSessionCount: sessions.size,
    gatewayConnected: Boolean(process.env.USSD_GATEWAY_URL && process.env.USSD_WEBHOOK_SECRET),
    webhookSpec: {
      endpoint: '/api/webhooks/ussd',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ussd-signature': 'Optional HMAC / webhook secret when USSD_WEBHOOK_SECRET is configured',
      },
      requestBody: {
        sessionId: 'string (unique operator session id)',
        phoneNumber: 'string (E.164 e.g. +244923000111)',
        text: 'string (empty on dial, or cumulative star-delimited input like "1*0")',
        serviceCode: 'string (e.g. *384*12#)',
      },
      responseBody: {
        mode: '"CON" (continue session) | "END" (terminate session)',
        message: 'string (<= 160 chars recommended for GSM USSD compatibility)',
        formattedGatewayText: '"CON <message>" or "END <message>"',
      },
    },
  };
}
