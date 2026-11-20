import { clampGabrooSpeechRate } from "./learner-settings";
import { learnerLocalStore } from "./learner-store";

const COLLECTION = "learner-preferences";
const RECORD_ID = "gabroo-speech-rate";

interface CachedSpeechRate { value: number }

export async function cacheGabrooSpeechRate(accountId: string, value: number): Promise<void> {
  await learnerLocalStore.write<CachedSpeechRate>(accountId, COLLECTION, RECORD_ID, {
    value: clampGabrooSpeechRate(value),
  });
}

export async function readCachedGabrooSpeechRate(accountId: string): Promise<number | null> {
  const record = await learnerLocalStore.read<CachedSpeechRate>(accountId, COLLECTION, RECORD_ID);
  if (!record || !record.data || typeof record.data.value !== "number" || !Number.isFinite(record.data.value)) {
    return null;
  }
  return clampGabrooSpeechRate(record.data.value);
}
