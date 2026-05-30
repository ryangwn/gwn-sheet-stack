// Content-addressed Layer ids per ADR 0002.
//
// `id = hashLayerId(kind, props)` is deterministic in (kind, props) — same
// inputs always produce the same id, regardless of object key order. The stack
// uses this id for snapshot keys, idempotent route hydration, and dedup. As a
// consequence, a Layer with the same (kind, props) cannot appear in the stack
// twice — push of a duplicate brings the existing Layer to the top instead.

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value !== 'object') return typeof value;
  return Object.prototype.toString.call(value).slice(8, -1);
}

export function validateSerializableProps(value: unknown, path = ''): void {
  if (value === undefined || value === null) return;
  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') return;
  if (valueType === 'function' || valueType === 'symbol' || valueType === 'bigint') {
    throw new Error(
      `[sheet-stack] Layer props must be JSON-serializable; found ${valueType} at ${path || '<root>'}.`,
    );
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => validateSerializableProps(item, `${path}[${i}]`));
    return;
  }
  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      validateSerializableProps(value[key], path ? `${path}.${key}` : key);
    }
    return;
  }
  throw new Error(
    `[sheet-stack] Layer props must be JSON-serializable; found ${describe(value)} at ${path || '<root>'}.`,
  );
}

export function stableStringify(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  const valueType = typeof value;
  if (valueType === 'string') return JSON.stringify(value);
  if (valueType === 'number' || valueType === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  // Unreachable if validateSerializableProps ran first.
  throw new Error(`[sheet-stack] cannot stableStringify ${describe(value)}`);
}

export function hashLayerId(kind: string, props: unknown): string {
  validateSerializableProps(props);
  return `${kind}:${stableStringify(props)}`;
}
