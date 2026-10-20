/**
 * Tiny typed event emitter. Kept internal-ish but exported for renderers and
 * wrappers that want the same semantics.
 */

/** A function that removes a listener when called. */
export type Unsubscribe = () => void;

/** Generic typed event emitter keyed by event name. */
export class Emitter<Events extends { [K in keyof Events]: unknown }> {
  private listeners = new Map<keyof Events, Set<(payload: never) => void>>();

  /**
   * Subscribe to an event.
   * @returns A function that unsubscribes the listener.
   */
  on<K extends keyof Events>(type: K, listener: (payload: Events[K]) => void): Unsubscribe {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener as (payload: never) => void);
    return () => this.off(type, listener);
  }

  /** Subscribe to an event for a single emission. */
  once<K extends keyof Events>(type: K, listener: (payload: Events[K]) => void): Unsubscribe {
    const off = this.on(type, (payload) => {
      off();
      listener(payload);
    });
    return off;
  }

  /** Remove a previously registered listener. */
  off<K extends keyof Events>(type: K, listener: (payload: Events[K]) => void): void {
    this.listeners.get(type)?.delete(listener as (payload: never) => void);
  }

  /** Emit an event synchronously to all listeners. */
  emit<K extends keyof Events>(type: K, payload: Events[K]): void {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const listener of [...set]) {
      (listener as (payload: Events[K]) => void)(payload);
    }
  }

  /** Remove every listener. */
  clear(): void {
    this.listeners.clear();
  }
}
