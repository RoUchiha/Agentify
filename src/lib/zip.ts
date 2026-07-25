export type ZipArtifact = {
  files: Array<{ path: string; content: string }>;
  manifest: { files: string[] };
};

export function createZip(artifact: ZipArtifact): Uint8Array {
  const paths = artifact.files.map((file) => file.path);
  if (
    paths.length !== artifact.manifest.files.length ||
    paths.some((path, index) => path !== artifact.manifest.files[index])
  ) {
    throw new Error("Artifact files do not match the verified manifest.");
  }

  const encoder = new TextEncoder();
  const files = artifact.files.map((file) => ({
    name: encoder.encode(file.path),
    body: encoder.encode(file.content),
  }));
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const crc = crc32(file.body);
    const local = joinBytes([
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(crc),
      uint32(file.body.length),
      uint32(file.body.length),
      uint16(file.name.length),
      uint16(0),
      file.name,
      file.body,
    ]);
    localParts.push(local);
    centralParts.push(
      joinBytes([
        uint32(0x02014b50),
        uint16(20),
        uint16(20),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(crc),
        uint32(file.body.length),
        uint32(file.body.length),
        uint16(file.name.length),
        uint16(0),
        uint16(0),
        uint16(0),
        uint16(0),
        uint32(0),
        uint32(offset),
        file.name,
      ]),
    );
    offset += local.length;
  }

  const central = joinBytes(centralParts);
  return joinBytes([
    ...localParts,
    central,
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(central.length),
    uint32(offset),
    uint16(0),
  ]);
}

export function listZipEntries(zip: Uint8Array): string[] {
  const decoder = new TextDecoder();
  const entries: string[] = [];
  let offset = 0;
  while (offset + 30 <= zip.length && readUint32(zip, offset) === 0x04034b50) {
    const compressedSize = readUint32(zip, offset + 18);
    const nameLength = readUint16(zip, offset + 26);
    const extraLength = readUint16(zip, offset + 28);
    const nameStart = offset + 30;
    entries.push(decoder.decode(zip.slice(nameStart, nameStart + nameLength)));
    offset = nameStart + nameLength + extraLength + compressedSize;
  }
  return entries;
}

function uint16(value: number): Uint8Array {
  return new Uint8Array([value & 0xff, (value >>> 8) & 0xff]);
}

function uint32(value: number): Uint8Array {
  return new Uint8Array([
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  ]);
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

function joinBytes(parts: Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
