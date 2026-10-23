/**
 * Cheap, dependency-free duration probes for uploaded media that is already
 * in memory (≤ 25 MB). Supports ISO-BMFF (MP4/MOV/M4V/M4A, via mvhd), WAV
 * (RIFF byte rate) and MP3 (frame scan). Returns undefined for anything else
 * or for malformed input; never throws.
 */
export function mediaDurationSeconds(
  buffer: Buffer,
  contentType = "",
): number | undefined {
  try {
    const seconds =
      isoBmffDuration(buffer) ??
      wavDuration(buffer) ??
      (/mpeg|mp3/i.test(contentType) || hasId3(buffer)
        ? mp3Duration(buffer)
        : undefined);
    return seconds !== undefined && Number.isFinite(seconds) && seconds > 0
      ? Math.round(seconds * 1000) / 1000
      : undefined;
  } catch {
    return undefined;
  }
}

function boxes(buffer: Buffer, start: number, end: number) {
  const found: Array<{ type: string; start: number; end: number }> = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = buffer.readUInt32BE(offset);
    const type = buffer.toString("latin1", offset + 4, offset + 8);
    let header = 8;
    if (size === 1) {
      if (offset + 16 > end) break;
      size = Number(buffer.readBigUInt64BE(offset + 8));
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header || offset + size > end) break;
    found.push({ type, start: offset + header, end: offset + size });
    offset += size;
  }
  return found;
}

function isoBmffDuration(buffer: Buffer): number | undefined {
  if (buffer.length < 16) return undefined;
  const top = boxes(buffer, 0, buffer.length);
  if (!top.length || !["ftyp", "moov", "wide", "mdat", "free"].includes(top[0].type))
    return undefined;
  const moov = top.find((box) => box.type === "moov");
  if (!moov) return undefined;
  const mvhd = boxes(buffer, moov.start, moov.end).find(
    (box) => box.type === "mvhd",
  );
  if (!mvhd) return undefined;
  const version = buffer.readUInt8(mvhd.start);
  if (version === 1) {
    const timescale = buffer.readUInt32BE(mvhd.start + 20);
    const duration = Number(buffer.readBigUInt64BE(mvhd.start + 24));
    return timescale ? duration / timescale : undefined;
  }
  const timescale = buffer.readUInt32BE(mvhd.start + 12);
  const duration = buffer.readUInt32BE(mvhd.start + 16);
  return timescale ? duration / timescale : undefined;
}

function wavDuration(buffer: Buffer): number | undefined {
  if (
    buffer.length < 12 ||
    buffer.toString("latin1", 0, 4) !== "RIFF" ||
    buffer.toString("latin1", 8, 12) !== "WAVE"
  )
    return undefined;
  let byteRate = 0;
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("latin1", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === "fmt " && offset + 16 <= buffer.length)
      byteRate = buffer.readUInt32LE(offset + 16);
    if (id === "data") {
      // Streams may write a 0/0xFFFFFFFF placeholder size; use what's present.
      const available = buffer.length - (offset + 8);
      const bytes = size === 0 || size > available ? available : size;
      return byteRate ? bytes / byteRate : undefined;
    }
    offset += 8 + size + (size % 2);
  }
  return undefined;
}

function hasId3(buffer: Buffer) {
  return buffer.length > 10 && buffer.toString("latin1", 0, 3) === "ID3";
}

const MP3_BITRATES: Record<string, number[]> = {
  // [version][layer] kbps by index 1..14
  "1-1": [32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  "1-2": [32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  "1-3": [32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  "2-1": [32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  "2-2": [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  "2-3": [8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
const MP3_SAMPLE_RATES: Record<number, number[]> = {
  3: [44100, 48000, 32000], // MPEG-1
  2: [22050, 24000, 16000], // MPEG-2
  0: [11025, 12000, 8000], // MPEG-2.5
};

function mp3Duration(buffer: Buffer): number | undefined {
  let offset = 0;
  if (hasId3(buffer)) {
    const size =
      ((buffer[6] & 0x7f) << 21) |
      ((buffer[7] & 0x7f) << 14) |
      ((buffer[8] & 0x7f) << 7) |
      (buffer[9] & 0x7f);
    offset = 10 + size + (buffer[5] & 0x10 ? 10 : 0);
  }
  let seconds = 0;
  let frames = 0;
  while (offset + 4 <= buffer.length) {
    const header = buffer.readUInt32BE(offset);
    if ((header & 0xffe00000) >>> 0 !== 0xffe00000) {
      // Resync byte by byte (padding or junk between frames).
      offset += 1;
      continue;
    }
    const versionBits = (header >>> 19) & 3;
    const layerBits = (header >>> 17) & 3;
    const bitrateIndex = (header >>> 12) & 15;
    const sampleIndex = (header >>> 10) & 3;
    const padding = (header >>> 9) & 1;
    if (
      versionBits === 1 ||
      layerBits === 0 ||
      bitrateIndex === 0 ||
      bitrateIndex === 15 ||
      sampleIndex === 3
    ) {
      offset += 1;
      continue;
    }
    const layer = 4 - layerBits; // 1, 2 or 3
    const mpeg1 = versionBits === 3;
    const bitrate =
      MP3_BITRATES[`${mpeg1 ? 1 : 2}-${layer}`][bitrateIndex - 1] * 1000;
    const sampleRate = MP3_SAMPLE_RATES[versionBits][sampleIndex];
    const samples = layer === 1 ? 384 : layer === 3 && !mpeg1 ? 576 : 1152;
    const length =
      layer === 1
        ? Math.floor((12 * bitrate) / sampleRate + padding) * 4
        : Math.floor(((samples / 8) * bitrate) / sampleRate) + padding;
    if (length < 4) {
      offset += 1;
      continue;
    }
    if (frames === 0) {
      const vbr = xingDuration(buffer, offset, length, samples, sampleRate);
      if (vbr !== undefined) return vbr;
    }
    seconds += samples / sampleRate;
    frames += 1;
    offset += length;
  }
  return frames >= 2 ? seconds : undefined;
}

/**
 * Encoders (LAME, ffmpeg) put a Xing/Info header in the first frame holding
 * the exact frame count and, in the LAME tag, the encoder delay/padding.
 */
function xingDuration(
  buffer: Buffer,
  frameStart: number,
  frameLength: number,
  samplesPerFrame: number,
  sampleRate: number,
): number | undefined {
  const end = Math.min(buffer.length, frameStart + frameLength);
  const region = buffer.subarray(frameStart, end);
  let at = region.indexOf("Xing", 4, "latin1");
  if (at < 0) at = region.indexOf("Info", 4, "latin1");
  if (at < 0 || at + 16 > region.length) return undefined;
  const flags = region.readUInt32BE(at + 4);
  if (!(flags & 1)) return undefined;
  const frames = region.readUInt32BE(at + 8);
  if (!frames) return undefined;
  let skipped = 0;
  // Optional fields: frames(4), bytes(4), TOC(100), quality(4), then LAME tag.
  let lame = at + 8 + (flags & 1 ? 4 : 0) + (flags & 2 ? 4 : 0) + (flags & 4 ? 100 : 0) + (flags & 8 ? 4 : 0);
  if (lame + 24 <= region.length && /^(LAME|Lavc|Lavf)/.test(region.toString("latin1", lame, lame + 4))) {
    const packed = region.readUIntBE(lame + 21, 3);
    skipped = (packed >> 12) + (packed & 0xfff);
  }
  const samples = frames * samplesPerFrame - skipped;
  return samples > 0 ? samples / sampleRate : undefined;
}
