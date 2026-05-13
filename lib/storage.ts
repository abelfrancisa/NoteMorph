import AsyncStorage from "@react-native-async-storage/async-storage";

export interface StudyOutput {
  improved_notes?: string;
  flashcards?: Array<{ q: string; a: string }>;
  summary?: string;
}

export interface SavedSet {
  id: string;
  topic: string;
  notes: string;
  outputs: StudyOutput;
  timestamp: number;
}

const SAVED_SETS_KEY = "notemorph_saved_sets";
const CACHE_KEY = "notemorph_cache";

// Cache for identical inputs (exact-match)
interface CacheEntry {
  input: {
    action: string;
    topic: string;
    text: string;
  };
  output: StudyOutput;
  timestamp: number;
}

/**
 * Load all saved study sets from AsyncStorage
 */
export async function loadSavedSets(): Promise<SavedSet[]> {
  try {
    const data = await AsyncStorage.getItem(SAVED_SETS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading saved sets:", error);
    return [];
  }
}

/**
 * Save a new study set to AsyncStorage
 */
export async function saveSavedSet(set: SavedSet): Promise<void> {
  try {
    const sets = await loadSavedSets();
    sets.unshift(set); // Add to beginning
    await AsyncStorage.setItem(SAVED_SETS_KEY, JSON.stringify(sets));
  } catch (error) {
    console.error("Error saving set:", error);
    throw error;
  }
}

/**
 * Delete a saved study set by ID
 */
export async function deleteSavedSet(id: string): Promise<void> {
  try {
    const sets = await loadSavedSets();
    const filtered = sets.filter((s) => s.id !== id);
    await AsyncStorage.setItem(SAVED_SETS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error deleting set:", error);
    throw error;
  }
}

/**
 * Get cached output for identical input (exact-match cache)
 */
export async function getCachedOutput(
  action: string,
  topic: string,
  text: string
): Promise<StudyOutput | null> {
  try {
    const data = await AsyncStorage.getItem(CACHE_KEY);
    if (!data) return null;

    const cache: CacheEntry[] = JSON.parse(data);
    const entry = cache.find(
      (c) => c.input.action === action && c.input.topic === topic && c.input.text === text
    );

    return entry ? entry.output : null;
  } catch (error) {
    console.error("Error reading cache:", error);
    return null;
  }
}

/**
 * Cache output for a given input
 */
export async function cacheOutput(
  action: string,
  topic: string,
  text: string,
  output: StudyOutput
): Promise<void> {
  try {
    let cache: CacheEntry[] = [];
    const data = await AsyncStorage.getItem(CACHE_KEY);
    if (data) {
      cache = JSON.parse(data);
    }

    // Remove old entry if exists
    cache = cache.filter(
      (c) => !(c.input.action === action && c.input.topic === topic && c.input.text === text)
    );

    // Add new entry
    cache.push({
      input: { action, topic, text },
      output,
      timestamp: Date.now(),
    });

    // Keep only last 50 cache entries
    if (cache.length > 50) {
      cache = cache.slice(-50);
    }

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Error caching output:", error);
    // Don't throw - cache failure shouldn't break the app
  }
}

/**
 * Clear all cached data
 */
export async function clearCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
}

/**
 * Clear all data (saved sets and cache)
 */
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([SAVED_SETS_KEY, CACHE_KEY]);
  } catch (error) {
    console.error("Error clearing all data:", error);
  }
}
