import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType, testFirestoreConnection } from '../lib/firebase';
import { createDemoSeedData, offlineStore } from '../lib/offlineStore';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useI18n } from '../i18n/I18nContext';
import type {
  AlertItem,
  CalendarEvent,
  CalendarStatus,
  Farm,
  HarvestRecord,
  Plot,
  Recommendation,
  SatelliteBundle,
  SyncQueueItem,
  UserProfile,
  WeatherBundle,
} from '../types/mbongo';

interface MbongoContextValue {
  firebaseUser: User | null;
  authReady: boolean;
  profile: UserProfile | null;
  farms: Farm[];
  plots: Plot[];
  calendarEvents: CalendarEvent[];
  harvestRecords: HarvestRecord[];
  selectedPlotId: string;
  setSelectedPlotId: (id: string) => void;
  weather: WeatherBundle | null;
  satellite: SatelliteBundle | null;
  recommendations: Recommendation[];
  alerts: AlertItem[];
  loadingAgro: boolean;
  isOnline: boolean;
  simulatedOffline: boolean;
  setSimulatedOffline: (val: boolean) => void;
  pendingQueue: SyncQueueItem[];
  lastSyncAt: string | null;
  syncError: string | null;
  signInGoogle: () => Promise<void>;
  registerDemoProfile: (input: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>) => void;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
  createFarm: (farm: Omit<Farm, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<Farm>;
  createPlot: (plot: Omit<Plot, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<Plot>;
  deletePlot: (plotId: string) => Promise<void>;
  createCalendarEvent: (evt: Omit<CalendarEvent, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCalendarStatus: (eventId: string, status: CalendarStatus) => Promise<void>;
  createHarvestRecord: (rec: Omit<HarvestRecord, 'id' | 'ownerId' | 'createdAt'>) => Promise<void>;
  syncNow: () => Promise<void>;
  refreshAgroData: () => Promise<void>;
}

const MbongoContext = createContext<MbongoContextValue | null>(null);

export const MbongoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, setLanguage } = useI18n();
  const { isOnline, simulatedOffline, setSimulatedOffline } = useOnlineStatus();

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [profile, setProfile] = useState<UserProfile | null>(() => offlineStore.getProfile());
  const [farms, setFarms] = useState<Farm[]>(() => offlineStore.getFarms());
  const [plots, setPlots] = useState<Plot[]>(() => offlineStore.getPlots());
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => offlineStore.getCalendar());
  const [harvestRecords, setHarvestRecords] = useState<HarvestRecord[]>(() => offlineStore.getHarvests());

  const [selectedPlotId, setSelectedPlotId] = useState<string>(() => {
    const existingPlots = offlineStore.getPlots();
    return existingPlots[0]?.id || '';
  });

  const [weather, setWeather] = useState<WeatherBundle | null>(null);
  const [satellite, setSatellite] = useState<SatelliteBundle | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loadingAgro, setLoadingAgro] = useState(false);

  const [pendingQueue, setPendingQueue] = useState<SyncQueueItem[]>(() => offlineStore.getQueue());
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(() => offlineStore.getLastSync());
  const [syncError, setSyncError] = useState<string | null>(null);

  // Test Firestore connection once on mount
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Load cloud data for authenticated Firebase user
  const loadCloudDataForUser = useCallback(async (uid: string, userEmail?: string | null, displayName?: string | null) => {
    try {
      const profileRef = doc(db, 'users', uid);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        const cloudProfile = profileSnap.data() as UserProfile;
        setProfile(cloudProfile);
        offlineStore.setProfile(cloudProfile);
        if (cloudProfile.preferredLanguage) {
          setLanguage(cloudProfile.preferredLanguage);
        }
      } else {
        const now = new Date().toISOString();
        const isDefaultAdmin = userEmail === 'plamaap1@gmail.com';
        const initialProfile: UserProfile = {
          uid,
          fullName: displayName || userEmail?.split('@')[0] || 'Agricultor MBONGO',
          phoneNumber: '+244923000100',
          phoneVerified: false,
          role: isDefaultAdmin ? 'admin' : 'farmer',
          province: 'Huambo',
          municipality: 'Caála',
          locality: 'Calenga',
          preferredLanguage: language,
          kikongoVariant: 'kg_san_salvador',
          consentNotifications: true,
          consentDataProcessing: true,
          onboardingCompleted: false,
          createdAt: now,
          updatedAt: now,
        };
        await setDoc(profileRef, initialProfile);
        setProfile(initialProfile);
        offlineStore.setProfile(initialProfile);
      }

      const [farmsSnap, plotsSnap, calSnap, harvSnap] = await Promise.all([
        getDocs(query(collection(db, 'farms'), where('ownerId', '==', uid))),
        getDocs(query(collection(db, 'plots'), where('ownerId', '==', uid))),
        getDocs(query(collection(db, 'calendar_events'), where('ownerId', '==', uid))),
        getDocs(query(collection(db, 'harvest_records'), where('ownerId', '==', uid))),
      ]);

      const loadedFarms = farmsSnap.docs.map((d) => d.data() as Farm);
      const loadedPlots = plotsSnap.docs.map((d) => d.data() as Plot);
      const loadedCal = calSnap.docs.map((d) => d.data() as CalendarEvent);
      const loadedHarv = harvSnap.docs.map((d) => d.data() as HarvestRecord);

      if (loadedFarms.length === 0) {
        // Seed initial sample farm & plots into Firestore for immediate utility
        const seed = createDemoSeedData(uid);
        for (const f of seed.farms) {
          await setDoc(doc(db, 'farms', f.id), f);
        }
        for (const p of seed.plots) {
          await setDoc(doc(db, 'plots', p.id), p);
        }
        for (const c of seed.calendar) {
          await setDoc(doc(db, 'calendar_events', c.id), c);
        }
        for (const h of seed.harvests) {
          await setDoc(doc(db, 'harvest_records', h.id), h);
        }
        setFarms(seed.farms);
        setPlots(seed.plots);
        setCalendarEvents(seed.calendar);
        setHarvestRecords(seed.harvests);
        offlineStore.setFarms(seed.farms);
        offlineStore.setPlots(seed.plots);
        offlineStore.setCalendar(seed.calendar);
        offlineStore.setHarvests(seed.harvests);
        setSelectedPlotId(seed.plots[0]?.id || '');
      } else {
        const singleFarm =
          loadedFarms.find((f) => f.id === 'farm_boa_esperanca') || loadedFarms[0];
        const singlePlotRaw =
          loadedPlots.find((p) => p.id === 'plot_tomate_principal') ||
          loadedPlots.find((p) => p.currentCrop === 'Tomate') ||
          loadedPlots[0];
        const normalizedFarms = singleFarm ? [singleFarm] : [];
        const normalizedPlots: Plot[] = singlePlotRaw
          ? [
              {
                ...singlePlotRaw,
                farmId: singleFarm?.id || singlePlotRaw.farmId,
                currentCrop: 'Tomate',
              },
            ]
          : [];
        const normalizedCal = singlePlotRaw
          ? loadedCal.filter((c) => c.plotId === singlePlotRaw.id)
          : loadedCal;
        const normalizedHarv = loadedHarv
          .filter((h) => !singlePlotRaw || h.plotId === singlePlotRaw.id || h.crop === 'Tomate')
          .map((h) => ({ ...h, crop: 'Tomate' }));

        setFarms(normalizedFarms);
        setPlots(normalizedPlots);
        setCalendarEvents(normalizedCal);
        setHarvestRecords(normalizedHarv);
        offlineStore.setFarms(normalizedFarms);
        offlineStore.setPlots(normalizedPlots);
        offlineStore.setCalendar(normalizedCal);
        offlineStore.setHarvests(normalizedHarv);
        setSelectedPlotId(normalizedPlots[0]?.id || '');
      }

      const syncIso = new Date().toISOString();
      setLastSyncAt(syncIso);
      offlineStore.setLastSync(syncIso);
      setSyncError(null);
    } catch (error) {
      setSyncError('Erro ao sincronizar com a nuvem; a usar cópia local.');
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        handleFirestoreError(error, OperationType.GET, 'users/farms/plots');
      }
    }
  }, [language, setLanguage]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (user && isOnline) {
        await loadCloudDataForUser(user.uid, user.email, user.displayName);
      }
    });
    return () => unsub();
  }, [isOnline, loadCloudDataForUser]);

  const signInGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      await loadCloudDataForUser(result.user.uid, result.user.email, result.user.displayName);
    }
  };

  const registerDemoProfile = (input: Omit<UserProfile, 'uid' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const uid = `demo_${Date.now()}`;
    const newProfile: UserProfile = {
      ...input,
      uid,
      isDemoSession: true,
      createdAt: now,
      updatedAt: now,
    };
    const seed = createDemoSeedData(uid);
    setProfile(newProfile);
    setFarms(seed.farms);
    setPlots(seed.plots);
    setCalendarEvents(seed.calendar);
    setHarvestRecords(seed.harvests);
    setSelectedPlotId(seed.plots[0]?.id || '');

    offlineStore.setProfile(newProfile);
    offlineStore.setFarms(seed.farms);
    offlineStore.setPlots(seed.plots);
    offlineStore.setCalendar(seed.calendar);
    offlineStore.setHarvests(seed.harvests);
    const syncIso = new Date().toISOString();
    setLastSyncAt(syncIso);
    offlineStore.setLastSync(syncIso);
  };

  const updateProfile = async (patch: Partial<UserProfile>) => {
    if (!profile) return;
    const updated: UserProfile = {
      ...profile,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    setProfile(updated);
    offlineStore.setProfile(updated);

    if (firebaseUser && !profile.isDemoSession && isOnline) {
      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), updated, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
      }
    }
  };

  const logout = async () => {
    if (firebaseUser) {
      await signOut(auth);
    }
    setProfile(null);
    setFarms([]);
    setPlots([]);
    setCalendarEvents([]);
    setHarvestRecords([]);
    offlineStore.setProfile(null);
  };

  const flushQueue = useCallback(async () => {
    if (!isOnline || !firebaseUser || profile?.isDemoSession) return;
    const queue = offlineStore.getQueue();
    if (queue.length === 0) return;

    const remaining: SyncQueueItem[] = [];
    for (const item of queue) {
      try {
        const colName =
          item.entity === 'farm'
            ? 'farms'
            : item.entity === 'plot'
            ? 'plots'
            : item.entity === 'calendar'
            ? 'calendar_events'
            : 'harvest_records';
        const docId = String(item.payload.id || '');
        if (!docId) continue;

        if (item.action === 'delete') {
          await deleteDoc(doc(db, colName, docId));
        } else {
          await setDoc(doc(db, colName, docId), item.payload, { merge: true });
        }
      } catch {
        remaining.push({ ...item, attempts: item.attempts + 1 });
      }
    }
    offlineStore.setQueue(remaining);
    setPendingQueue(remaining);
    if (remaining.length === 0) {
      const syncIso = new Date().toISOString();
      setLastSyncAt(syncIso);
      offlineStore.setLastSync(syncIso);
    }
  }, [firebaseUser, isOnline, profile?.isDemoSession]);

  useEffect(() => {
    if (isOnline) {
      flushQueue();
    }
  }, [isOnline, flushQueue]);

  const syncNow = async () => {
    await flushQueue();
    if (firebaseUser && !profile?.isDemoSession && isOnline) {
      await loadCloudDataForUser(firebaseUser.uid, firebaseUser.email, firebaseUser.displayName);
    } else if (isOnline) {
      const syncIso = new Date().toISOString();
      setLastSyncAt(syncIso);
      offlineStore.setLastSync(syncIso);
    }
  };

  const persistOrQueue = async (
    entity: SyncQueueItem['entity'],
    action: SyncQueueItem['action'],
    payload: Record<string, unknown>
  ) => {
    if (firebaseUser && !profile?.isDemoSession && isOnline) {
      const colName =
        entity === 'farm'
          ? 'farms'
          : entity === 'plot'
          ? 'plots'
          : entity === 'calendar'
          ? 'calendar_events'
          : 'harvest_records';
      const docId = String(payload.id);
      try {
        if (action === 'delete') {
          await deleteDoc(doc(db, colName, docId));
        } else {
          await setDoc(doc(db, colName, docId), payload, { merge: true });
        }
        const syncIso = new Date().toISOString();
        setLastSyncAt(syncIso);
        offlineStore.setLastSync(syncIso);
      } catch (err) {
        handleFirestoreError(err, action === 'delete' ? OperationType.DELETE : OperationType.WRITE, `${colName}/${docId}`);
      }
    } else if (firebaseUser && !profile?.isDemoSession && !isOnline) {
      const next = offlineStore.enqueue({ entity, action, payload });
      setPendingQueue(next);
    } else if (!isOnline) {
      const next = offlineStore.enqueue({ entity, action, payload });
      setPendingQueue(next);
    }
  };

  const createFarm = async (input: Omit<Farm, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<Farm> => {
    const now = new Date().toISOString();
    const ownerId = firebaseUser?.uid || profile?.uid || 'demo_user';
    const farm: Farm = {
      ...input,
      id: `farm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ownerId,
      createdAt: now,
      updatedAt: now,
    };
    const nextFarms = [...farms, farm];
    setFarms(nextFarms);
    offlineStore.setFarms(nextFarms);
    await persistOrQueue('farm', 'create', farm as unknown as Record<string, unknown>);
    return farm;
  };

  const createPlot = async (input: Omit<Plot, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>): Promise<Plot> => {
    const now = new Date().toISOString();
    const ownerId = firebaseUser?.uid || profile?.uid || 'demo_user';
    const plot: Plot = {
      ...input,
      id: `plot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ownerId,
      createdAt: now,
      updatedAt: now,
    };
    const nextPlots = [...plots, plot];
    setPlots(nextPlots);
    offlineStore.setPlots(nextPlots);
    setSelectedPlotId(plot.id);
    await persistOrQueue('plot', 'create', plot as unknown as Record<string, unknown>);
    return plot;
  };

  const deletePlot = async (plotId: string) => {
    const nextPlots = plots.filter((p) => p.id !== plotId);
    setPlots(nextPlots);
    offlineStore.setPlots(nextPlots);
    if (selectedPlotId === plotId) {
      setSelectedPlotId(nextPlots[0]?.id || '');
    }
    await persistOrQueue('plot', 'delete', { id: plotId });
  };

  const createCalendarEvent = async (input: Omit<CalendarEvent, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const ownerId = firebaseUser?.uid || profile?.uid || 'demo_user';
    const evt: CalendarEvent = {
      ...input,
      id: `cal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ownerId,
      createdAt: now,
      updatedAt: now,
    };
    const next = [evt, ...calendarEvents];
    setCalendarEvents(next);
    offlineStore.setCalendar(next);
    await persistOrQueue('calendar', 'create', evt as unknown as Record<string, unknown>);
  };

  const updateCalendarStatus = async (eventId: string, status: CalendarStatus) => {
    const now = new Date().toISOString();
    const next = calendarEvents.map((e) => (e.id === eventId ? { ...e, status, updatedAt: now } : e));
    setCalendarEvents(next);
    offlineStore.setCalendar(next);
    const updated = next.find((e) => e.id === eventId);
    if (updated) {
      await persistOrQueue('calendar', 'update', updated as unknown as Record<string, unknown>);
    }
  };

  const createHarvestRecord = async (input: Omit<HarvestRecord, 'id' | 'ownerId' | 'createdAt'>) => {
    const now = new Date().toISOString();
    const ownerId = firebaseUser?.uid || profile?.uid || 'demo_user';
    const rec: HarvestRecord = {
      ...input,
      id: `harv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ownerId,
      createdAt: now,
    };
    const next = [rec, ...harvestRecords];
    setHarvestRecords(next);
    offlineStore.setHarvests(next);
    await persistOrQueue('harvest', 'create', rec as unknown as Record<string, unknown>);
  };

  const refreshAgroData = useCallback(async () => {
    const activePlot = plots.find((p) => p.id === selectedPlotId) || plots[0];
    if (!activePlot) return;

    if (!isOnline) {
      const cachedW = offlineStore.getCachedWeather(activePlot.id);
      const cachedS = offlineStore.getCachedSatellite(activePlot.id);
      if (cachedW) setWeather(cachedW);
      if (cachedS) setSatellite(cachedS);
      return;
    }

    setLoadingAgro(true);
    try {
      const [wRes, sRes, aRes] = await Promise.all([
        fetch(`/api/weather?lat=${activePlot.centerLat}&lng=${activePlot.centerLng}&name=${encodeURIComponent(activePlot.name)}`),
        fetch(`/api/satellite?plotId=${encodeURIComponent(activePlot.id)}&lat=${activePlot.centerLat}&lng=${activePlot.centerLng}`),
        fetch('/api/analysis/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plot: activePlot, language }),
        }),
      ]);

      if (wRes.ok) {
        const wData = (await wRes.json()) as WeatherBundle;
        setWeather(wData);
        offlineStore.setCachedWeather(activePlot.id, wData);
      }
      if (sRes.ok) {
        const sData = (await sRes.json()) as SatelliteBundle;
        setSatellite(sData);
        offlineStore.setCachedSatellite(activePlot.id, sData);
      }
      if (aRes.ok) {
        const aData = (await aRes.json()) as { recommendations: Recommendation[]; alerts: AlertItem[] };
        setRecommendations(aData.recommendations || []);
        setAlerts(aData.alerts || []);
      }
    } catch {
      const cachedW = offlineStore.getCachedWeather(activePlot.id);
      const cachedS = offlineStore.getCachedSatellite(activePlot.id);
      if (cachedW) setWeather(cachedW);
      if (cachedS) setSatellite(cachedS);
    } finally {
      setLoadingAgro(false);
    }
  }, [isOnline, language, plots, selectedPlotId]);

  useEffect(() => {
    refreshAgroData();
  }, [refreshAgroData]);

  return (
    <MbongoContext.Provider
      value={{
        firebaseUser,
        authReady,
        profile,
        farms,
        plots,
        calendarEvents,
        harvestRecords,
        selectedPlotId,
        setSelectedPlotId,
        weather,
        satellite,
        recommendations,
        alerts,
        loadingAgro,
        isOnline,
        simulatedOffline,
        setSimulatedOffline,
        pendingQueue,
        lastSyncAt,
        syncError,
        signInGoogle,
        registerDemoProfile,
        updateProfile,
        logout,
        createFarm,
        createPlot,
        deletePlot,
        createCalendarEvent,
        updateCalendarStatus,
        createHarvestRecord,
        syncNow,
        refreshAgroData,
      }}
    >
      {children}
    </MbongoContext.Provider>
  );
};

export function useMbongo(): MbongoContextValue {
  const ctx = useContext(MbongoContext);
  if (!ctx) throw new Error('useMbongo must be used inside MbongoProvider');
  return ctx;
}
