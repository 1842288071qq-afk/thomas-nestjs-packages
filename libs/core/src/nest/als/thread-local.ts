import { AsyncLocalStorage } from 'async_hooks';
import { Injectable } from '@nestjs/common';
import './thread-local-store.types';

@Injectable()
export class ThreadLocal {
  constructor(private readonly als: AsyncLocalStorage<ThreadLocalStore>) {}

  /** 初始化 Store（框架层调用） */
  initStore(initialValue: ThreadLocalStore, next: () => void) {
    this.als.run(initialValue, next);
  }

  /** 获取当前 store */
  getStore(): ThreadLocalStore | undefined {
    return this.als.getStore();
  }

  /** 设置字段 */
  set<K extends keyof ThreadLocalStore>(key: K, value: ThreadLocalStore[K]) {
    const store = this.getStore();
    if (!store) return;
    store[key] = value;
  }

  /** 获取字段 */
  get<K extends keyof ThreadLocalStore>(key: K) {
    const store = this.getStore();

    return store?.[key];
  }
}
