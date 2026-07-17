import { createContentMd5, createFileContentFingerprint } from './md5';

describe('OSS Web SDK MD5', () => {
  it.each([
    ['', '1B2M2Y8AsgTpgAmY7PhCfg=='],
    ['abc', 'kAFQmDzST7DWlj99KOF/cg=='],
    ['message digest', '+WtpfXy3k41SWi8xqvFh0A=='],
  ])('计算 %p 的 Content-MD5', async (content, expected) => {
    await expect(createContentMd5(new Blob([content]))).resolves.toBe(expected);
  });

  it('按块计算大文件时保持 MD5 一致', async () => {
    const content = new Uint8Array(5 * 1024 * 1024).fill(97);
    await expect(createContentMd5(new Blob([content]))).resolves.toBe(
      'ebKBBg0ze5srhMzzkK3PdA==',
    );
  });

  it('相同元信息但内容不同的文件会得到不同续传指纹', async () => {
    const options = {
      type: 'video/mp4',
      lastModified: 1_700_000_000_000,
    };
    const first = new File(['first-content'], 'same.mp4', options);
    const second = new File(['other-content'], 'same.mp4', options);

    const firstFingerprint = await createFileContentFingerprint(
      first,
      new AbortController().signal,
    );
    const secondFingerprint = await createFileContentFingerprint(
      second,
      new AbortController().signal,
    );

    expect(firstFingerprint).not.toBe(secondFingerprint);
  });
});
