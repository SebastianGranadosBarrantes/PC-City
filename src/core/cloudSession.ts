import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDb, isFirebaseConfigured } from './firebase';
import type { LeaderboardEntry } from './leaderboard';

export interface SessionDoc {
  code: string;
  title: string;
  teacherPin: string;
  active: boolean;
  createdAt: number;
}

export interface ScoreSubmission {
  nombre: string;
  puntos: number;
  aciertos: number;
  totalPreguntas: number;
  tiempoTotal: number;
}

const LOCAL_SESSIONS_KEY = 'pc_city_simulated_sessions';
const LOCAL_SCORES_KEY_PREFIX = 'pc_city_simulated_scores_';

export class CloudSessionService {
  /**
   * Crea una nueva sesión identificada por código y protegida por un PIN de docente.
   */
  static async createSession(
    code: string,
    pin: string,
    title = 'Sesión de Clase',
  ): Promise<{ ok: boolean; mensaje?: string }> {
    const cleanCode = code.trim().toUpperCase();
    const cleanPin = pin.trim();

    if (!cleanCode || cleanCode.length < 3) {
      return { ok: false, mensaje: 'El código de sesión debe tener al menos 3 caracteres.' };
    }
    if (!cleanPin || cleanPin.length < 3) {
      return { ok: false, mensaje: 'El PIN de docente debe tener al menos 3 dígitos.' };
    }

    const db = getDb();
    if (db && isFirebaseConfigured()) {
      try {
        const sessionRef = doc(db, 'sessions', cleanCode);
        const existing = await getDoc(sessionRef);
        if (existing.exists() && existing.data().active) {
          // Si ya existe y el PIN coincide, se reutiliza
          if (existing.data().teacherPin === cleanPin) {
            return { ok: true };
          }
          return { ok: false, mensaje: 'Ya existe una sesión activa con ese código y diferente PIN.' };
        }

        const data: SessionDoc = {
          code: cleanCode,
          title: title.trim() || 'Sesión de Clase',
          teacherPin: cleanPin,
          active: true,
          createdAt: Date.now(),
        };
        await setDoc(sessionRef, data);
        return { ok: true };
      } catch (e: any) {
        console.error('Error al crear sesión en Firestore:', e);
        return { ok: false, mensaje: `Error de conexión: ${e?.message || 'revisa tu conexión'}` };
      }
    }

    // Modo simulado local (cuando Firebase aún no tiene API Keys)
    return this.createSimulatedSession(cleanCode, cleanPin, title);
  }

  /**
   * Valida si un código de sesión existe y está activo.
   */
  static async validateSession(
    code: string,
  ): Promise<{ ok: boolean; title?: string; mensaje?: string }> {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return { ok: false, mensaje: 'Escribe un código de sesión.' };

    const db = getDb();
    if (db && isFirebaseConfigured()) {
      try {
        const sessionRef = doc(db, 'sessions', cleanCode);
        const snap = await getDoc(sessionRef);
        if (!snap.exists()) {
          return { ok: false, mensaje: `La sesión "${cleanCode}" no existe. Consulta con tu profesor.` };
        }
        const data = snap.data() as SessionDoc;
        if (!data.active) {
          return { ok: false, mensaje: `La sesión "${cleanCode}" ya fue finalizada por el profesor.` };
        }
        return { ok: true, title: data.title };
      } catch (e: any) {
        console.warn('Error al validar sesión en Firestore:', e);
        return { ok: false, mensaje: 'No se pudo conectar con el servidor. Revisa tu conexión a internet.' };
      }
    }

    // Modo simulado local
    return this.validateSimulatedSession(cleanCode);
  }

  /**
   * Registra la puntuación del estudiante en la sesión.
   */
  static async submitScore(
    code: string,
    sub: ScoreSubmission,
  ): Promise<{ entry: LeaderboardEntry; rank: number; isLeader: boolean }> {
    const cleanCode = code.trim().toUpperCase();
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const entry: LeaderboardEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nombre: sub.nombre.trim(),
      puntos: sub.puntos,
      aciertos: sub.aciertos,
      totalPreguntas: sub.totalPreguntas,
      tiempoTotal: Math.round(sub.tiempoTotal),
      fecha,
    };

    const db = getDb();
    if (db && isFirebaseConfigured()) {
      try {
        const scoresCol = collection(db, 'sessions', cleanCode, 'scores');
        await addDoc(scoresCol, entry);
        const all = await this.getScores(cleanCode);
        const rank = all.findIndex((x) => x.id === entry.id || (x.nombre === entry.nombre && x.puntos === entry.puntos)) + 1;
        return { entry, rank: Math.max(1, rank), isLeader: rank === 1 };
      } catch (e) {
        console.error('Error al guardar puntaje en Firestore:', e);
      }
    }

    // Modo simulado local
    return this.submitSimulatedScore(cleanCode, entry);
  }

  /**
   * Obtiene la lista ordenada de puntuaciones de la sesión.
   */
  static async getScores(code: string): Promise<LeaderboardEntry[]> {
    const cleanCode = code.trim().toUpperCase();
    const db = getDb();

    if (db && isFirebaseConfigured()) {
      try {
        const scoresCol = collection(db, 'sessions', cleanCode, 'scores');
        const q = query(scoresCol, orderBy('puntos', 'desc'), orderBy('tiempoTotal', 'asc'));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ ...d.data(), id: d.id } as LeaderboardEntry));
      } catch (e) {
        console.error('Error al consultar puntajes en Firestore:', e);
        return [];
      }
    }

    return this.getSimulatedScores(cleanCode);
  }

  /**
   * Escucha puntuaciones en tiempo real para el proyector de la clase.
   */
  static subscribeScores(
    code: string,
    callback: (scores: LeaderboardEntry[]) => void,
  ): Unsubscribe {
    const cleanCode = code.trim().toUpperCase();
    const db = getDb();

    if (db && isFirebaseConfigured()) {
      const scoresCol = collection(db, 'sessions', cleanCode, 'scores');
      const q = query(scoresCol, orderBy('puntos', 'desc'), orderBy('tiempoTotal', 'asc'));
      return onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({ ...d.data(), id: d.id } as LeaderboardEntry));
        callback(list);
      });
    }

    // Modo simulado: escucha cambios locales y eventos de storage
    const interval = window.setInterval(() => {
      callback(this.getSimulatedScores(cleanCode));
    }, 1500);

    const onStorage = (e: StorageEvent) => {
      if (e.key === `${LOCAL_SCORES_KEY_PREFIX}${cleanCode}`) {
        callback(this.getSimulatedScores(cleanCode));
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }

  /**
   * Borra todas las puntuaciones de una sesión (acción de docente).
   */
  static async clearSessionScores(
    code: string,
    pin: string,
  ): Promise<{ ok: boolean; mensaje?: string }> {
    const cleanCode = code.trim().toUpperCase();
    const db = getDb();

    if (db && isFirebaseConfigured()) {
      try {
        const sessionRef = doc(db, 'sessions', cleanCode);
        const snap = await getDoc(sessionRef);
        if (!snap.exists()) return { ok: false, mensaje: 'Sesión no encontrada.' };
        if (snap.data().teacherPin !== pin.trim()) return { ok: false, mensaje: 'PIN de docente incorrecto.' };

        const scoresCol = collection(db, 'sessions', cleanCode, 'scores');
        const scoresSnap = await getDocs(scoresCol);
        const batch = writeBatch(db);
        scoresSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        return { ok: true };
      } catch (e: any) {
        return { ok: false, mensaje: e?.message || 'Error al limpiar' };
      }
    }

    localStorage.removeItem(`${LOCAL_SCORES_KEY_PREFIX}${cleanCode}`);
    return { ok: true };
  }

  // ========================================================
  // IMPLEMENTACIÓN SIMULADA LOCAL (FALLBACK SIN API KEYS)
  // ========================================================
  private static createSimulatedSession(code: string, pin: string, title: string) {
    try {
      const raw = localStorage.getItem(LOCAL_SESSIONS_KEY);
      const sessions: Record<string, SessionDoc> = raw ? JSON.parse(raw) : {};
      sessions[code] = {
        code,
        title: title || 'Sesión de Clase',
        teacherPin: pin,
        active: true,
        createdAt: Date.now(),
      };
      localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
      return { ok: true };
    } catch {
      return { ok: true };
    }
  }

  private static validateSimulatedSession(code: string) {
    try {
      const raw = localStorage.getItem(LOCAL_SESSIONS_KEY);
      const sessions: Record<string, SessionDoc> = raw ? JSON.parse(raw) : {};
      // Sesión predeterminada siempre disponible para pruebas
      if (code === 'DEMO' || code === 'DEFAULT' || code === 'CLASE-1') {
        return { ok: true, title: 'Sesión de Demostración' };
      }
      const s = sessions[code];
      if (!s) return { ok: false, mensaje: `La sesión "${code}" no existe. Pídele al docente crearla en el botón 🎓.` };
      if (!s.active) return { ok: false, mensaje: `La sesión "${code}" está inactiva.` };
      return { ok: true, title: s.title };
    } catch {
      return { ok: true, title: 'Sesión Local' };
    }
  }

  private static submitSimulatedScore(code: string, entry: LeaderboardEntry) {
    const list = this.getSimulatedScores(code);
    list.push(entry);
    list.sort((a, b) => b.puntos - a.puntos || a.tiempoTotal - b.tiempoTotal);
    localStorage.setItem(`${LOCAL_SCORES_KEY_PREFIX}${code}`, JSON.stringify(list));
    const rank = list.findIndex((x) => x.id === entry.id) + 1;
    return { entry, rank: Math.max(1, rank), isLeader: rank === 1 };
  }

  private static getSimulatedScores(code: string): LeaderboardEntry[] {
    try {
      const raw = localStorage.getItem(`${LOCAL_SCORES_KEY_PREFIX}${code}`);
      if (!raw) return [];
      const list: LeaderboardEntry[] = JSON.parse(raw);
      return list.sort((a, b) => b.puntos - a.puntos || a.tiempoTotal - b.tiempoTotal);
    } catch {
      return [];
    }
  }
}
