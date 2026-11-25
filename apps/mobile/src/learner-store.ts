import { LearnerLocalStore } from "./learner-local-store";
import { ExpoSqliteLearnerDriver } from "./expo-sqlite-learner-driver";

/** Shared device-local learner store for the mobile application. */
export const learnerLocalStore = new LearnerLocalStore(new ExpoSqliteLearnerDriver());
