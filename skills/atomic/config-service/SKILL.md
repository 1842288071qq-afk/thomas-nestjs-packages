---
name: config-service
description: 通过 NestJS 原生 ConfigService 读取 yaml 配置，支持点路径取嵌套字段和默认值。
type: atomic
tags: [config, yaml, env]
---

# 配置获取

工程使用 NestJS 原生 `ConfigService` 读取 yaml 配置，禁止自造配置加载器。

```typescript
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MyService {
  constructor(private readonly config: ConfigService) {}

  init() {
    const dbHost = this.config.get<string>('database.host', 'localhost'); // 带默认值
    const port = this.config.get<number>('PORT');
    const jwtWhite = this.config.get<string[]>('jwt.whiteList', []);
  }
}
```

注意：

- 使用点路径读嵌套字段
- 提供默认值避免 `undefined` 流入业务逻辑
- 类型不可信，必要时显式校验后再使用

## 相关 skill

- `config-namespaces` — `AllConfig` 类型体系、`ConfigService<AllConfig>` 类型安全访问、扩展自定义命名空间