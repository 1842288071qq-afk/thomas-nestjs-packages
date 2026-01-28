export interface DomainEvent<T = unknown> {
  // 事件名称，对应kafka的topic, rabbitmq的queue
  name: string;
  // 事件负载
  payload: T;
  // 事件key，对应kafka的key
  key?: string;
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}

export interface KafkaConfig {
  clientId: string;
  brokers: string[];
  groupId: string;
  consumer?: {
    sessionTimeout?: number;
    heartbeatInterval?: number;
    rebalanceTimeout?: number;
    [key: string]: unknown;
  };
}

export interface RabbitConfig {
  urls: string[];
  queue: string;
  queueOptions?: {
    durable: boolean;
    [key: string]: unknown;
  };
}

export interface MqConfig {
  kafka?: KafkaConfig;
  rabbit?: RabbitConfig;
}
