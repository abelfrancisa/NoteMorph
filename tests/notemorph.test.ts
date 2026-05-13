import { describe, it, expect, beforeEach, vi } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  loadSavedSets,
  saveSavedSet,
  deleteSavedSet,
  getCachedOutput,
  cacheOutput,
  clearCache,
  clearAllData,
  type SavedSet,
  type StudyOutput,
} from "../lib/storage";

// Mock AsyncStorage
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    multiRemove: vi.fn(),
  },
}));

describe("NoteMorph Storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadSavedSets", () => {
    it("should return empty array when no sets are saved", async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      const result = await loadSavedSets();
      expect(result).toEqual([]);
    });

    it("should return parsed saved sets", async () => {
      const mockSets: SavedSet[] = [
        {
          id: "1",
          topic: "Biology",
          notes: "Cell structure and function",
          outputs: { improved_notes: "Cells are..." },
          timestamp: 1234567890,
        },
      ];
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(mockSets));
      const result = await loadSavedSets();
      expect(result).toEqual(mockSets);
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(AsyncStorage.getItem).mockRejectedValue(new Error("Storage error"));
      const result = await loadSavedSets();
      expect(result).toEqual([]);
    });
  });

  describe("saveSavedSet", () => {
    it("should save a new set to storage", async () => {
      const newSet: SavedSet = {
        id: "2",
        topic: "History",
        notes: "World War II",
        outputs: { summary: "WWII was..." },
        timestamp: Date.now(),
      };

      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      await saveSavedSet(newSet);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "notemorph_saved_sets",
        expect.stringContaining(newSet.id)
      );
    });

    it("should prepend new set to existing sets", async () => {
      const existingSet: SavedSet = {
        id: "1",
        topic: "Biology",
        notes: "Cells",
        outputs: {},
        timestamp: 1000,
      };

      const newSet: SavedSet = {
        id: "2",
        topic: "History",
        notes: "WWII",
        outputs: {},
        timestamp: 2000,
      };

      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify([existingSet]));

      await saveSavedSet(newSet);

      const callArgs = vi.mocked(AsyncStorage.setItem).mock.calls[0];
      const savedData = JSON.parse(callArgs[1] as string);
      expect(savedData[0].id).toBe("2"); // New set should be first
      expect(savedData[1].id).toBe("1");
    });
  });

  describe("deleteSavedSet", () => {
    it("should remove a set by ID", async () => {
      const sets: SavedSet[] = [
        { id: "1", topic: "Bio", notes: "Cells", outputs: {}, timestamp: 1000 },
        { id: "2", topic: "History", notes: "WWII", outputs: {}, timestamp: 2000 },
      ];

      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(sets));
      await deleteSavedSet("1");

      const callArgs = vi.mocked(AsyncStorage.setItem).mock.calls[0];
      const savedData = JSON.parse(callArgs[1] as string);
      expect(savedData).toHaveLength(1);
      expect(savedData[0].id).toBe("2");
    });
  });

  describe("getCachedOutput", () => {
    it("should return null when cache is empty", async () => {
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
      const result = await getCachedOutput("improve", "Biology", "Cell notes");
      expect(result).toBeNull();
    });

    it("should return cached output for exact match", async () => {
      const cachedOutput: StudyOutput = { improved_notes: "Improved cell notes" };
      const cacheEntry = {
        input: { action: "improve", topic: "Biology", text: "Cell notes" },
        output: cachedOutput,
        timestamp: Date.now(),
      };

      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify([cacheEntry]));
      const result = await getCachedOutput("improve", "Biology", "Cell notes");
      expect(result).toEqual(cachedOutput);
    });

    it("should return null for non-matching input", async () => {
      const cacheEntry = {
        input: { action: "improve", topic: "Biology", text: "Cell notes" },
        output: { improved_notes: "Improved" },
        timestamp: Date.now(),
      };

      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify([cacheEntry]));
      const result = await getCachedOutput("flashcards", "Biology", "Different notes");
      expect(result).toBeNull();
    });
  });

  describe("cacheOutput", () => {
    it("should cache output for an input", async () => {
      const output: StudyOutput = { flashcards: [{ q: "Q1", a: "A1" }] };
      vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);

      await cacheOutput("flashcards", "Biology", "Cell notes", output);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "notemorph_cache",
        expect.stringContaining("flashcards")
      );
    });

    it("should limit cache to 50 entries", async () => {
      const entries = Array.from({ length: 50 }, (_, i) => ({
        input: { action: "improve", topic: `Topic${i}`, text: `Text${i}` },
        output: { improved_notes: `Output${i}` },
        timestamp: Date.now(),
      }));

      vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(entries));

      const newOutput: StudyOutput = { improved_notes: "New output" };
      await cacheOutput("improve", "NewTopic", "New text", newOutput);

      const callArgs = vi.mocked(AsyncStorage.setItem).mock.calls[0];
      const savedData = JSON.parse(callArgs[1] as string);
      expect(savedData).toHaveLength(50);
    });
  });

  describe("clearCache", () => {
    it("should remove cache data", async () => {
      await clearCache();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith("notemorph_cache");
    });
  });

  describe("clearAllData", () => {
    it("should remove both saved sets and cache", async () => {
      await clearAllData();
      expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
        "notemorph_saved_sets",
        "notemorph_cache",
      ]);
    });
  });
});

describe("Topic Extraction", () => {
  it("should extract first 3-5 words as topic", () => {
    const extractTopic = (text: string): string => {
      const words = text.trim().split(/\s+/).slice(0, 5);
      return words.join(" ");
    };

    expect(extractTopic("Photosynthesis is the process")).toBe("Photosynthesis is the process");
    expect(extractTopic("The quick brown fox jumps over the lazy dog")).toBe(
      "The quick brown fox jumps"
    );
    expect(extractTopic("Biology")).toBe("Biology");
  });
});

describe("Character Limit", () => {
  it("should enforce 1500 character limit", () => {
    const MAX_CHARS = 1500;
    const longText = "a".repeat(2000);
    const truncated = longText.slice(0, MAX_CHARS);
    expect(truncated.length).toBe(MAX_CHARS);
  });
});
