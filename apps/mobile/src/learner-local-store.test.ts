import { describe, expect, it } from "vitest";
import { LearnerLocalStore, type LocalKeyValueDriver } from "./learner-local-store";

class MemoryDriver implements LocalKeyValueDriver {
  readonly values = new Map<string, string>();
  async get(key: string) { return this.values.get(key) ?? null; }
  async set(key: string, value: string) { this.values.set(key, value); }
  async remove(key: string) { this.values.delete(key); }
}

describe("LearnerLocalStore", () => {
  it("persists versioned records and increments revisions", async () => {
    const store = new LearnerLocalStore(new MemoryDriver());
    const first = await store.write("account-a", "preferences", "main", { speechRate: 1.1 });
    const second = await store.write("account-a", "preferences", "main", { speechRate: 1.2 });
    expect(first.revision).toBe(1);
    expect(second.revision).toBe(2);
    await expect(store.read("account-a", "preferences", "main")).resolves.toMatchObject({
      schemaVersion: 1,
      revision: 2,
      data: { speechRate: 1.2 },
    });
  });

  it("isolates records by account", async () => {
    const store = new LearnerLocalStore(new MemoryDriver());
    await store.write("account-a", "progress", "lesson-1", { completed: true });
    await store.write("account-b", "progress", "lesson-1", { completed: false });
    await expect(store.read("account-a", "progress", "lesson-1")).resolves.toMatchObject({
      data: { completed: true },
    });
    await expect(store.read("account-b", "progress", "lesson-1")).resolves.toMatchObject({
      data: { completed: false },
    });
  });

  it("serializes concurrent writes to the same record", async () => {
    const store = new LearnerLocalStore(new MemoryDriver());
    const writes = await Promise.all([
      store.write("account-a", "progress", "lesson-1", { attempt: 1 }),
      store.write("account-a", "progress", "lesson-1", { attempt: 2 }),
      store.write("account-a", "progress", "lesson-1", { attempt: 3 }),
    ]);
    expect(writes.map((record) => record.revision)).toEqual([1, 2, 3]);
    await expect(store.read("account-a", "progress", "lesson-1")).resolves.toMatchObject({
      revision: 3,
      data: { attempt: 3 },
    });
  });

  it("removes only the selected account record", async () => {
    const store = new LearnerLocalStore(new MemoryDriver());
    await store.write("account-a", "history", "thread-1", { title: "A" });
    await store.write("account-b", "history", "thread-1", { title: "B" });
    await store.remove("account-a", "history", "thread-1");
    await expect(store.read("account-a", "history", "thread-1")).resolves.toBeNull();
    await expect(store.read("account-b", "history", "thread-1")).resolves.toMatchObject({
      data: { title: "B" },
    });
  });

  it("rejects malformed account and collection identifiers", async () => {
    const store = new LearnerLocalStore(new MemoryDriver());
    await expect(store.write("", "progress", "lesson-1", {})).rejects.toThrow("Invalid account id");
    await expect(store.write("account-a", " ", "lesson-1", {})).rejects.toThrow("Invalid collection");
  });

  it("fails closed when stored records have mismatched ownership metadata", async () => {
    const driver = new MemoryDriver();
    const store = new LearnerLocalStore(driver);
    await store.write("account-a", "progress", "lesson-1", { completed: true });
    const key = [...driver.values.keys()][0];
    const raw = JSON.parse(driver.values.get(key)!);
    raw.accountId = "account-b";
    driver.values.set(key, JSON.stringify(raw));
    await expect(store.read("account-a", "progress", "lesson-1")).rejects.toThrow(
      "Local record failed validation"
    );
  });
});
