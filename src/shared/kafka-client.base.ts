import { OnModuleInit } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';

export abstract class KafkaClientBase implements OnModuleInit {
  abstract getKafkaClient(): ClientKafka;
  abstract getTopics(): string[];

  async onModuleInit() {
    const client = this.getKafkaClient();
    for (const topic of this.getTopics()) {
      client.subscribeToResponseOf(topic);
    }
    await client.connect();
  }
}
