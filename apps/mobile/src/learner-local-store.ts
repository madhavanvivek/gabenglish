/**
 * Account-scoped local persistence boundary.
 *
 * This module deliberately has no network dependency. A platform SQLite driver
 * will implement LocalKeyValueDriver in the next storage milestone.
 */
export interface LocalKeyValueDriver {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export interface LocalRecord<T> {
  schemaVersion: 1;
  accountId: string;
  collection: string;
  recordId: string;
  revision: number;
  updatedAt: string;
  data: T;
}

const KEY_PREFIX = "gabenglish:learner:v1";

function assertSegment(value: string, label: string): void {
  if (!value || value.trim() !== value || value.length > 160) {
    throw new Error(`Invalid ${label}`);
  }
}

function storageKey(accountId: string, collection: string, recordId: string): string {
  assertSegment(accountId, "account id");
  assertSegment(collection, "collection");
  assertSegment(recordId, "record id");
  return [KEY_PREFIX, accountId, collection, recordId].map(encodeURIComponent).join(":");
}

function decodeRecord<T>(
  raw: string,
  expected: { accountId: string; collection: string; recordId: string }
): LocalRecord<T> {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object") throw new Error("Invalid local record");
  const record = value as Partial<LocalRecord<T>>;
  if (
    record.schemaVersion !== 1 ||
    record.accountId !== expected.accountId ||
    record.collection !== expected.collection ||
    record.recordId !== expected.recordId ||
    !Number.isInteger(record.revision) ||
    (record.revision ?? 0) < 1 ||
    typeof record.updatedAt !== "string" ||
    !("data" in record)
  ) {
    throw new Error("Local record failed validation");
  }
  return record as LocalRecord<T>;
}

export class LearnerLocalStore {
  private readonly writes = new Map<string, Promise<void>>();

  constructor(private readonly driver: LocalKeyValueDriver) {}

  async read<T>(accountId: string, collection: string, recordId: string): Promise<LocalRecord<T> | null> {
    const key = storageKey(accountId, collection, recordId);
    const pending = this.writes.get(key);
    if (pending) await pending;
    const raw = await this.driver.get(key);
    return raw === null ? null : decodeRecord<T>(raw, { accountId, collection, recordId });
  }

  async write<T>(
    accountId: string,
    collection: string,
    recordId: string,
    data: T
  ): Promise<LocalRecord<T>> {
    const key = storageKey(accountId, collection, recordId);
    const previous = this.writes.get(key) ?? Promise.resolve();
    let result!: LocalRecord<T>;
    const operation = previous.catch(() => undefined).then(async () => {
      const raw = await this.driver.get(key);
      const current = raw === null
        ? null
        : decodeRecord<T>(raw, { accountId, collection, recordId });
      result = {
        schemaVersion: 1,
        accountId,
        collection,
        recordId,
        revision: (current?.revision ?? 0) + 1,
        updatedAt: new Date().toISOString(),
        data,
      };
      await this.driver.set(key, JSON.stringify(result));
    });
    this.writes.set(key, operation);
    try {
      await operation;
      return result;
    } finally {
      if (this.writes.get(key) === operation) this.writes.delete(key);
    }
  }

  async remove(accountId: string, collection: string, recordId: string): Promise<void> {
    const key = storageKey(accountId, collection, recordId);
    const previous = this.writes.get(key) ?? Promise.resolve();
    const operation = previous.catch(() => undefined).then(() => this.driver.remove(key));
    this.writes.set(key, operation);
    try {
      await operation;
    } finally {
      if (this.writes.get(key) === operation) this.writes.delete(key);
    }
  }
}
