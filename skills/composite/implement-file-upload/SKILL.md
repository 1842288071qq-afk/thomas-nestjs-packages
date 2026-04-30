---
name: implement-file-upload
description: 实现文件上传接口 — FileInterceptor 接收 multipart，组合存储路径，调用 LocalUploadService.saveLocalFile 持久化；详情接口 FileService.translateIds 翻译 ID。
when_to_use: 关键词 — file, upload, multer, FileInterceptor, LocalUploadService
---


# 实现文件上传 / 文件展示

## 1. 上传接口

```typescript
@Post('upload')
@IdentityRequired('hospital_admin')
@UseInterceptors(FileInterceptor('file'))
async upload(@UploadedFile() file: Express.Multer.File) {
  const identity = this.threadLocal.getStore()?.identity as AccountIdentity;
  const object = `${identity.hospitalAdmin.uscCode}/attachments/avatar/${Date.now()}_${file.originalname}`;
  const record = await this.localUploadService.saveLocalFile(
    file, object, identity.identityType, identity.id,
  );
  return ApiResBody.of(record);
}
```

要点：

- Object 路径携带业务前缀 + 时间戳，避免冲突；遵循 `file-management` 的预设路径
- 校验 mime/大小：在 Controller 用 `ParseFilePipeBuilder` 或自定义校验

## 2. 业务表存储

业务表通常只存 `fileId` 或逗号分隔的多 ID 字符串。**禁止冗余存 fullUrl**（路径会随域名/前缀变化）。

## 3. 详情接口翻译

```typescript
async getDetail(id: string): Promise<DetailVO> {
  const entity = await this.repo.findOne({ where: { id } });
  const fileIds = entity.attachments?.split(',').filter(Boolean) ?? [];
  const files = await this.fileService.translateIds(fileIds);
  return toDetailVO(entity, files);
}
```

`translateIds` 内部走 Redis 缓存（`file:translate:map`），适合高频读。

## 相关 skill

- `file-management` — 服务能力与配置
- `auth-identity-public` — identity 来源
- `serialization-vo` — VO 字段组装
