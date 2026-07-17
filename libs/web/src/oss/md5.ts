import { UploadStoppedError } from './errors';

const SHIFT_AMOUNTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
  9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
  16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
  21,
];

const ROUND_CONSTANTS = Array.from(
  { length: 64 },
  (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32) >>> 0,
);

const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export async function createContentMd5(
  blob: Blob,
  signal?: AbortSignal,
): Promise<string> {
  const calculator = new Md5Calculator();
  const readChunkSize = 4 * 1024 * 1024;
  for (let offset = 0; offset < blob.size; offset += readChunkSize) {
    throwIfAborted(signal);
    const bytes = new Uint8Array(
      await blob.slice(offset, offset + readChunkSize).arrayBuffer(),
    );
    calculator.update(bytes);
  }
  throwIfAborted(signal);
  return toBase64(calculator.digest());
}

export async function createFileContentFingerprint(
  file: File,
  signal: AbortSignal,
): Promise<string> {
  const sampleSize = 64 * 1024;
  const offsets = new Set([
    0,
    Math.max(0, Math.floor((file.size - sampleSize) / 2)),
    Math.max(0, file.size - sampleSize),
  ]);
  const metadata = new TextEncoder().encode(
    [file.name, file.size, file.lastModified, file.type].join(':'),
  );
  const samples: BlobPart[] = [metadata];
  offsets.forEach((offset) => {
    samples.push(file.slice(offset, Math.min(offset + sampleSize, file.size)));
  });
  return `sample-md5:${await createContentMd5(new Blob(samples), signal)}`;
}

export function md5(input: Uint8Array): Uint8Array {
  return new Md5Calculator().update(input).digest();
}

class Md5Calculator {
  private a = 0x67452301;
  private b = 0xefcdab89;
  private c = 0x98badcfe;
  private d = 0x10325476;
  private byteLength = 0n;
  private remainder = new Uint8Array(0);
  private completed = false;

  update(input: Uint8Array): this {
    if (this.completed) throw new Error('MD5 已经完成计算');
    this.byteLength += BigInt(input.length);
    let offset = 0;

    if (this.remainder.length > 0) {
      const required = 64 - this.remainder.length;
      if (input.length < required) {
        const combined = new Uint8Array(this.remainder.length + input.length);
        combined.set(this.remainder);
        combined.set(input, this.remainder.length);
        this.remainder = combined;
        return this;
      }
      const block = new Uint8Array(64);
      block.set(this.remainder);
      block.set(input.subarray(0, required), this.remainder.length);
      this.processBlock(block, 0);
      this.remainder = new Uint8Array(0);
      offset = required;
    }

    while (offset + 64 <= input.length) {
      this.processBlock(input, offset);
      offset += 64;
    }
    if (offset < input.length) this.remainder = input.slice(offset);
    return this;
  }

  digest(): Uint8Array {
    if (this.completed) throw new Error('MD5 已经完成计算');
    this.completed = true;
    const finalLength = this.remainder.length < 56 ? 64 : 128;
    const finalBlocks = new Uint8Array(finalLength);
    finalBlocks.set(this.remainder);
    finalBlocks[this.remainder.length] = 0x80;
    const bitLength = this.byteLength * 8n;
    const view = new DataView(finalBlocks.buffer);
    view.setUint32(finalLength - 8, Number(bitLength & 0xffffffffn), true);
    view.setUint32(finalLength - 4, Number(bitLength >> 32n), true);
    for (let offset = 0; offset < finalBlocks.length; offset += 64) {
      this.processBlock(finalBlocks, offset);
    }

    const output = new Uint8Array(16);
    const outputView = new DataView(output.buffer);
    outputView.setUint32(0, this.a, true);
    outputView.setUint32(4, this.b, true);
    outputView.setUint32(8, this.c, true);
    outputView.setUint32(12, this.d, true);
    return output;
  }

  private processBlock(input: Uint8Array, offset: number): void {
    const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
    const words = Array.from({ length: 16 }, (_, index) =>
      view.getUint32(offset + index * 4, true),
    );
    let a = this.a;
    let b = this.b;
    let c = this.c;
    let d = this.d;

    for (let index = 0; index < 64; index += 1) {
      let value: number;
      let wordIndex: number;
      if (index < 16) {
        value = (b & c) | (~b & d);
        wordIndex = index;
      } else if (index < 32) {
        value = (d & b) | (~d & c);
        wordIndex = (5 * index + 1) % 16;
      } else if (index < 48) {
        value = b ^ c ^ d;
        wordIndex = (3 * index + 5) % 16;
      } else {
        value = c ^ (b | ~d);
        wordIndex = (7 * index) % 16;
      }

      const nextD = d;
      d = c;
      c = b;
      const sum = (a + value + ROUND_CONSTANTS[index] + words[wordIndex]) >>> 0;
      b = (b + rotateLeft(sum, SHIFT_AMOUNTS[index])) >>> 0;
      a = nextD;
    }

    this.a = (this.a + a) >>> 0;
    this.b = (this.b + b) >>> 0;
    this.c = (this.c + c) >>> 0;
    this.d = (this.d + d) >>> 0;
  }
}

function rotateLeft(value: number, amount: number): number {
  return ((value << amount) | (value >>> (32 - amount))) >>> 0;
}

function toBase64(bytes: Uint8Array): string {
  let output = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const combined = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);
    output += BASE64_ALPHABET[(combined >>> 18) & 63];
    output += BASE64_ALPHABET[(combined >>> 12) & 63];
    output += second == null ? '=' : BASE64_ALPHABET[(combined >>> 6) & 63];
    output += third == null ? '=' : BASE64_ALPHABET[combined & 63];
  }
  return output;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new UploadStoppedError(signal.reason);
}
