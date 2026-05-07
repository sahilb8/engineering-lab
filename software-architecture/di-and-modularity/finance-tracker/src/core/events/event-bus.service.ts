import { Injectable, Logger } from '@nestjs/common';
import { DomainEvent } from './domain-event.interface';
import { FeatureFlagService } from '../feature-flags/feature-flag.service';

type EventHandler = (event: DomainEvent) => void | Promise<void>;

interface EventSubscription {
  moduleName?: string;
  handler: EventHandler;
}

@Injectable()
export class EventBus {
  private readonly logger = new Logger(EventBus.name);
  private subscriptions = new Map<string, EventSubscription[]>();

  constructor(private readonly featureFlagService: FeatureFlagService) {}

  subscribe(eventName: string, subscription: EventSubscription | EventHandler) {
    const entry: EventSubscription =
      typeof subscription === 'function'
        ? { handler: subscription }
        : subscription;

    const existing = this.subscriptions.get(eventName) ?? [];
    existing.push(entry);
    this.subscriptions.set(eventName, existing);

    const label = entry.moduleName ?? 'core';
    this.logger.log(
      `Subscriber registered for "${eventName}" (module: ${label})`,
    );
  }

  async publish(event: DomainEvent) {
    const subscribers = this.subscriptions.get(event.name) ?? [];
    this.logger.log(
      `Publishing "${event.name}" to ${subscribers.length} subscriber(s)`,
    );

    for (const subscriber of subscribers) {
      if (subscriber.moduleName) {
        const enabled = await this.featureFlagService.isModuleEnabled(
          event.payload.householdId,
          subscriber.moduleName,
        );
        if (!enabled) {
          this.logger.log(
            `Skipping "${event.name}" handler — module "${subscriber.moduleName}" ` +
              `is disabled for household ${String(event.payload.householdId)}`,
          );
          continue;
        }
      }

      try {
        await subscriber.handler(event);
      } catch (error) {
        this.logger.error(`Handler failed for "${event.name}": ${error}`);
      }
    }
  }
}
