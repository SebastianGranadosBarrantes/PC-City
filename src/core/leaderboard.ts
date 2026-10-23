export interface LeaderboardEntry {
  id: string;
  nombre: string;
  puntos: number;
  aciertos: number;
  totalPreguntas: number;
  tiempoTotal: number; // en segundos
  fecha: string;
}

const STORAGE_KEY = 'pc_city_leaderboard_v1';

export class Leaderboard {
  static getEntries(): LeaderboardEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const list: LeaderboardEntry[] = JSON.parse(data);
      return list.sort((a, b) => b.puntos - a.puntos || a.tiempoTotal - b.tiempoTotal);
    } catch (e) {
      console.warn('Error al leer tabla de puntuaciones:', e);
      return [];
    }
  }

  static getLeader(): LeaderboardEntry | null {
    const list = this.getEntries();
    return list.length > 0 ? list[0] : null;
  }

  static addEntry(nuevo: {
    nombre: string;
    puntos: number;
    aciertos: number;
    totalPreguntas: number;
    tiempoTotal: number;
  }): { entry: LeaderboardEntry; rank: number; isLeader: boolean } {
    const list = this.getEntries();
    const ahora = new Date();
    const fecha = ahora.toLocaleDateString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const entry: LeaderboardEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      nombre: nuevo.nombre.trim(),
      puntos: nuevo.puntos,
      aciertos: nuevo.aciertos,
      totalPreguntas: nuevo.totalPreguntas,
      tiempoTotal: Math.round(nuevo.tiempoTotal),
      fecha,
    };

    list.push(entry);
    list.sort((a, b) => b.puntos - a.puntos || a.tiempoTotal - b.tiempoTotal);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Error al guardar tabla de puntuaciones:', e);
    }

    const rank = list.findIndex((item) => item.id === entry.id) + 1;
    const isLeader = rank === 1;

    return { entry, rank, isLeader };
  }

  static clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Error al borrar tabla de puntuaciones:', e);
    }
  }
}
