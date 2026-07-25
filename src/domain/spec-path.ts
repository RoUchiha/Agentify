import { AgentSpecSchema, type AgentSpec, type AgentSpecParseResult } from "@/domain/agent-spec";

export type SpecPatch = {
  path: string;
  value: unknown;
};

const FORBIDDEN_SEGMENTS = new Set(["__proto__", "prototype", "constructor"]);

export function getSpecValue(spec: AgentSpec, path: string): unknown {
  const segments = parsePath(path);
  let current: unknown = spec;
  for (const segment of segments) {
    current = readSegment(current, segment);
  }
  return current;
}

export function applySpecPatches(spec: AgentSpec, patches: SpecPatch[]): AgentSpecParseResult {
  const draft = structuredClone(spec) as unknown;
  try {
    for (const patch of patches) {
      setExistingValue(draft, parsePath(patch.path), structuredClone(patch.value));
    }
  } catch {
    return invalidPathResult();
  }
  return AgentSpecSchema.safeParse(draft);
}

function parsePath(path: string): string[] {
  if (!path || path.startsWith(".") || path.endsWith(".") || path.includes("..")) {
    throw new Error("Invalid spec path.");
  }
  const segments = path.split(".");
  if (
    segments.some((segment) => !segment || FORBIDDEN_SEGMENTS.has(segment) || /\s/.test(segment))
  ) {
    throw new Error("Invalid spec path.");
  }
  return segments;
}

function readSegment(current: unknown, segment: string): unknown {
  if (Array.isArray(current)) {
    const index = arrayIndex(segment, current.length);
    return current[index];
  }
  if (!isRecord(current) || !Object.hasOwn(current, segment)) {
    throw new Error("Invalid spec path.");
  }
  return current[segment];
}

function setExistingValue(current: unknown, segments: string[], value: unknown): void {
  if (segments.length === 0) throw new Error("Invalid spec path.");
  let parent = current;
  for (const segment of segments.slice(0, -1)) {
    parent = readSegment(parent, segment);
  }
  const key = segments.at(-1)!;
  if (Array.isArray(parent)) {
    parent[arrayIndex(key, parent.length)] = value;
    return;
  }
  if (!isRecord(parent) || !Object.hasOwn(parent, key)) {
    throw new Error("Invalid spec path.");
  }
  parent[key] = value;
}

function arrayIndex(segment: string, length: number): number {
  if (!/^(0|[1-9]\d*)$/.test(segment)) throw new Error("Invalid array index.");
  const index = Number(segment);
  if (!Number.isSafeInteger(index) || index < 0 || index >= length) {
    throw new Error("Invalid array index.");
  }
  return index;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function invalidPathResult(): AgentSpecParseResult {
  return AgentSpecSchema.safeParse({ invalidSpecPath: true });
}
