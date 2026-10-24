export const VEHICLE_CRASH_DAMAGE = 25;

export interface PlayerHealthOptions {
  maxHealth?: number;
  onHealthChanged?: (current: number, max: number, pct: number) => void;
  onDamage?: (amount: number) => void;
  onDeath?: () => void;
}

/**
 * Gestiona los puntos de vida del vehículo del jugador, el enfriamiento
 * de invulnerabilidad tras colisiones y los eventos de avería/reparación.
 */
export class PlayerHealth {
  readonly maxHealth: number;
  private currentHealth: number;
  private invulnerableTimer = 0;
  private readonly invulnerableDuration = 0.85; // 850 ms de gracia tras chocar
  private readonly options: PlayerHealthOptions;

  constructor(options: PlayerHealthOptions = {}) {
    this.maxHealth = options.maxHealth ?? 100;
    this.currentHealth = this.maxHealth;
    this.options = options;
  }

  get health(): number {
    return this.currentHealth;
  }

  get isInvulnerable(): boolean {
    return this.invulnerableTimer > 0;
  }

  get percentage(): number {
    return Math.max(0, Math.min(100, Math.round((this.currentHealth / this.maxHealth) * 100)));
  }

  update(dt: number): void {
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }
  }

  /**
   * Aplica daño al vehículo si no está en tiempo de inmunidad.
   * Devuelve true si el daño se aplicó con éxito.
   */
  applyDamage(amount: number): boolean {
    if (this.invulnerableTimer > 0 || this.currentHealth <= 0) {
      return false;
    }

    this.invulnerableTimer = this.invulnerableDuration;
    this.currentHealth = Math.max(0, this.currentHealth - Math.round(amount));
    const pct = this.percentage;

    this.options.onHealthChanged?.(this.currentHealth, this.maxHealth, pct);
    this.options.onDamage?.(amount);

    if (this.currentHealth <= 0) {
      this.options.onDeath?.();
    }
    return true;
  }

  /**
   * Recarga una cantidad de salud al vehículo (por ejemplo, al inspeccionar componentes).
   * Devuelve true si la salud aumentó.
   */
  heal(amount: number): boolean {
    if (this.currentHealth >= this.maxHealth) {
      return false;
    }

    const previous = this.currentHealth;
    this.currentHealth = Math.min(this.maxHealth, this.currentHealth + Math.round(amount));
    const pct = this.percentage;

    this.options.onHealthChanged?.(this.currentHealth, this.maxHealth, pct);
    return this.currentHealth > previous;
  }

  /**
   * Restaura la salud completa (usado al reparar el auto o reiniciar).
   */
  healFull(): void {
    this.currentHealth = this.maxHealth;
    this.invulnerableTimer = 0.5; // breve inmunidad al reaparecer
    this.options.onHealthChanged?.(this.currentHealth, this.maxHealth, 100);
  }
}
