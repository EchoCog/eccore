/**
 * Browser-compatible EventEmitter for the Autonomy System
 * 
 * This provides a simple event emitter that works in browser environments
 * without requiring the Node.js 'events' module.
 */

export interface EventListener {
  (...args: any[]): void;
}

export class BrowserEventEmitter {
  private events: Map<string, Set<EventListener>> = new Map();

  /**
   * Add a listener for an event
   */
  on(event: string, listener: EventListener): this {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(listener);
    return this;
  }

  /**
   * Add a one-time listener for an event
   */
  once(event: string, listener: EventListener): this {
    const onceListener = (...args: any[]) => {
      this.off(event, onceListener);
      listener(...args);
    };
    return this.on(event, onceListener);
  }

  /**
   * Remove a listener for an event
   */
  off(event: string, listener: EventListener): this {
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.events.delete(event);
      }
    }
    return this;
  }

  /**
   * Emit an event to all listeners
   */
  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events.get(event);
    if (listeners && listeners.size > 0) {
      // Convert Set to Array for better browser compatibility
      const listenerArray = Array.from(listeners);
      for (const listener of listenerArray) {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for '${event}':`, error);
        }
      }
      return true;
    }
    return false;
  }

  /**
   * Remove all listeners for an event or all events
   */
  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount(event: string): number {
    const listeners = this.events.get(event);
    return listeners ? listeners.size : 0;
  }

  /**
   * Get all event names that have listeners
   */
  eventNames(): string[] {
    return Array.from(this.events.keys());
  }
}

// Export as default for easy replacement of Node.js EventEmitter
export default BrowserEventEmitter;