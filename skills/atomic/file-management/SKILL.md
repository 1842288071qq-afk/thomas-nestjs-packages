---
name: file-management
description: 文件上传用 LocalUploadService.saveLocalFile，自动落盘并写 sys_file 元数据；接口返回时用 FileService.translateIds 批量把文件 ID 翻译为带 fullUrl 的实体（带 Redis 缓存）。
type: atomic
tags: [file, upload]
when_to_use: 关键词 — file, upload, LocalUploadService, FileService, translateIds, sys_file
---


# 文件上传与管理

## 核心服务

| 服务 | 职责 |
| - | - |
| `FileService` (`@thomas/nestjs/core/nest/file-management`) | 元数据持久化（`sys_file`）、`translateIds` 批量 ID → 实体（Redis 缓存 `file:translate:map`）、审计 (`authorType`, `createdBy`) |
| `LocalUploadService` | 物理落盘（自动建子目录）、生成 `fullUrl`、调用 FileService 写元数据 |

## 上传流程

```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async upload(@UploadedFile() file: Express.Multer.File) {
  const identity = this.threadLocal.getStore()?.identity;
  const object = `avatars/${identity.id}/${Date.now()}_${file.originalname}`;
  const record = await this.localUploadService.saveLocalFile(
    file, object, identity.identityType, identity.id,
  );
  return ApiResBody.of(record);
}
```

## 详情接口翻译 ID

业务表中通常只存文件 ID（或逗号分隔字符串）。返回前批量翻译：

```typescript
async getDetail(id: string) {
  const entity = await this.repo.findOne(id);
  const fileIds = entity.attachments ? entity.attachments.split(',') : [];
  const files = await this.fileService.translateIds(fileIds);
  return { ...entity, files };
}
```

## 存储路径预设

- 账号头像：`/{username}/avatar/{timestamp}_{filename}`
- 医院 Logo：`/{uscCode}/logo/{timestamp}_{filename}`
- 业务附件：`/{uscCode}/attachments/{type}/{timestamp}_{filename}`

## 配置

- `file.local.storageRoot`：默认 `./uploads`
- `file.local.serveRoot`：默认 `/files`

## 相关 skill

- `auth-identity-public` — 上传前的身份获取
- `serialization-vo` — 接口返回 VO 时的 files 字段组装
