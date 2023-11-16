import { Service } from '@laminarjs/laminar';
import type { Kafka, AdminConfig, Admin, ITopicConfig } from 'kafkajs';

/**
 * Declaratively set some topics to be created on start and deleted on stop, used in testing
 */
export interface CreateTopics {
  /**
   * Create topics after start and delete on stop
   */
  topics: ITopicConfig[];
}

/**
 * Start a kafka admin instance
 * More documentation on [kafkajs admin](https://kafka.js.org/docs/admin)
 *
 * You can also declaratively set some topics to be created on start, and deleted on stop, used in testing
 */
export class KafkaAdminService implements Service {
  public client?: Admin;

  constructor(
    public kafka: Kafka,
    public config?: AdminConfig & CreateTopics,
  ) {}

  public async start(): Promise<this> {
    this.client = this.kafka.admin(this.config);
    await this.client.connect();
    if (this.config?.topics) {
      this.client.createTopics({ topics: this.config?.topics });
    }
    return this;
  }

  public async stop(): Promise<this> {
    if (this.config?.topics) {
      await this.client?.deleteTopics({ topics: this.config?.topics.map((item) => item.topic) });
    }
    await this.client?.disconnect();
    return this;
  }

  public describe(): string {
    return [
      '🎦 Kafka Admin',
      ...(this.config?.topics ? [`topics: ${this.config?.topics.map((item) => item.topic).join(', ')}`] : []),
    ].join(' ');
  }
}
