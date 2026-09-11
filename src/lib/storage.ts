import type { EyevolveState } from "./types";
import { initialPolicy } from "./learning";
import { modeFromAutonomy } from "./autonomy";

export const STORAGE_KEY = "eyevolve.state.v1";
export const STATE_VERSION = 1;

export const createInitialState = (): EyevolveState => {
  const policy = initialPolicy();
  return {
    version: STATE_VERSION,
    policy,
    currentSceneId: "road-obstruction",
    seenSceneIds: [],
    interactionHistory: [],
    evolutionHistory: [],
    currentMode: modeFromAutonomy(policy.autonomy),
  };
};

export const loadState = () => {
  if (typeof window === "undefined") {
    return createInitialState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createInitialState();
    }
    const parsed = JSON.parse(raw) as EyevolveState;
    if (parsed.version !== STATE_VERSION || !parsed.policy) {
      return createInitialState();
    }
    return parsed;
  } catch {
    return createInitialState();
  }
};

export const saveState = (state: EyevolveState) => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const clearState = () => {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
};
