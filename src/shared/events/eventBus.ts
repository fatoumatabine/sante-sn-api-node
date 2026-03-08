// Event Bus Implementation for DDD + Clean Architecture

// Event Types
export type EventHandler<T = any> = (data: T) => Promise<void> | void;

export interface Event {
  type: string;
  timestamp: Date;
  payload: any;
}

export interface DomainEvent extends Event {
  type: string; // e.g., 'user.registered', 'order.created'
}

// Event Handler Map
type EventHandlers = Map<string, Set<EventHandler>>;

// Event Bus Class
class EventBus {
  private handlers: EventHandlers = new Map();
  private eventHistory: DomainEvent[] = [];
  private maxHistorySize: number = 100;

  /**
   * Subscribe to an event
   * @param eventType The type of event to listen for (supports wildcards with *)
   * @param handler The handler function to execute when event is emitted
   */
  on(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
  }

  /**
   * Subscribe to an event once (handler is removed after first execution)
   */
  once(eventType: string, handler: EventHandler): void {
    const onceHandler: EventHandler = async (data) => {
      await handler(data);
      this.off(eventType, onceHandler);
    };
    this.on(eventType, onceHandler);
  }

  /**
   * Unsubscribe from an event
   */
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
      }
    }
  }

  /**
   * Emit an event to all registered handlers
   * Supports event patterns like 'user.*' to match 'user.registered', 'user.updated', etc.
   */
  async emit(eventType: string, payload: any): Promise<void> {
    const event: DomainEvent = {
      type: eventType,
      timestamp: new Date(),
      payload,
    };

    // Store in history
    this.addToHistory(event);

    // Get handlers for exact match
    const exactHandlers = this.handlers.get(eventType) || new Set();

    // Get handlers for wildcard patterns
    const wildcardHandlers = this.getWildcardHandlers(eventType);

    // Execute all handlers
    const allHandlers = [...exactHandlers, ...wildcardHandlers];

    // Execute handlers in parallel
    await Promise.all(
      allHandlers.map(async (handler) => {
        try {
          await handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${eventType}:`, error);
        }
      })
    );

    console.log(`📢 Event emitted: ${eventType} to ${allHandlers.length} handler(s)`);
  }

  /**
   * Get handlers that match wildcard patterns
   */
  private getWildcardHandlers(eventType: string): Set<EventHandler> {
    const wildcardHandlers = new Set<EventHandler>();

    for (const [pattern] of this.handlers) {
      if (pattern.endsWith('.*')) {
        const prefix = pattern.slice(0, -1); // Remove '*'
        if (eventType.startsWith(prefix)) {
          const handlers = this.handlers.get(pattern);
          if (handlers) {
            handlers.forEach((h) => wildcardHandlers.add(h));
          }
        }
      }
    }

    return wildcardHandlers;
  }

  /**
   * Add event to history
   */
  private addToHistory(event: DomainEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get event history
   */
  getHistory(): DomainEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Remove all handlers for an event type
   */
  removeAllListeners(eventType?: string): void {
    if (eventType) {
      this.handlers.delete(eventType);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Get the number of registered handlers
   */
  getHandlerCount(eventType?: string): number {
    if (eventType) {
      return (this.handlers.get(eventType)?.size || 0);
    }
    let total = 0;
    for (const handlers of this.handlers.values()) {
      total += handlers.size;
    }
    return total;
  }
}

// Export singleton instance
export const eventBus = new EventBus();

// Predefined event types for the application
export const AuthEvents = {
  USER_REGISTERED: 'auth.user.registered',
  USER_LOGGED_IN: 'auth.user.logged_in',
  USER_LOGGED_OUT: 'auth.user.logged_out',
  PASSWORD_RESET_REQUESTED: 'auth.password.reset_requested',
  PASSWORD_RESET_COMPLETED: 'auth.password.reset_completed',
  TOKEN_REFRESHED: 'auth.token.refreshed',
} as const;

export const PatientEvents = {
  PROFILE_CREATED: 'patient.profile.created',
  PROFILE_UPDATED: 'patient.profile.updated',
  PROFILE_DELETED: 'patient.profile.deleted',
} as const;

export const RendezVousEvents = {
  CREATED: 'rendez_vous.created',
  UPDATED: 'rendez_vous.updated',
  CANCELLED: 'rendez_vous.cancelled',
  COMPLETED: 'rendez_vous.completed',
  REMINDER_SENT: 'rendez_vous.reminder_sent',
} as const;

export const ConsultationEvents = {
  CREATED: 'consultation.created',
  UPDATED: 'consultation.updated',
  COMPLETED: 'consultation.completed',
} as const;

export const PaiementEvents = {
  INITIATED: 'paiement.initiated',
  COMPLETED: 'paiement.completed',
  FAILED: 'paiement.failed',
  REFUNDED: 'paiement.refunded',
} as const;

export const MedecinEvents = {
  PROFILE_CREATED: 'medecin.profile.created',
  PROFILE_UPDATED: 'medecin.profile.updated',
  AVAILABILITY_UPDATED: 'medecin.availability.updated',
} as const;

export const NotificationEvents = {
  SENT: 'notification.sent',
  READ: 'notification.read',
  DELETED: 'notification.deleted',
} as const;

export default eventBus;
