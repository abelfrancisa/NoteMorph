import { ScrollView, Text, View, TextInput, Pressable, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import * as Haptics from "expo-haptics";
import { cn } from "@/lib/utils";
import {
  loadSavedSets,
  saveSavedSet,
  deleteSavedSet,
  getCachedOutput,
  cacheOutput,
  type SavedSet,
  type StudyOutput,
} from "@/lib/storage";

const MAX_CHARS = 1500;

export default function HomeScreen() {
  const colors = useColors();
  const [notes, setNotes] = useState("");
  const [topic, setTopic] = useState("");
  const [outputs, setOutputs] = useState<StudyOutput>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"notes" | "flashcards" | "summary" | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [savedSets, setSavedSets] = useState<SavedSet[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState("");
  const [appReady, setAppReady] = useState(false);

  // tRPC mutation for study generation
  const generateMutation = trpc.study.generate.useMutation();

  // Load saved sets on app start
  useEffect(() => {
    const initApp = async () => {
      try {
        const sets = await loadSavedSets();
        setSavedSets(sets);
      } catch (err) {
        console.error("Error loading saved sets:", err);
      } finally {
        setAppReady(true);
      }
    };

    initApp();
  }, []);

  // Extract topic from notes (first 3-5 words)
  const extractTopic = (text: string): string => {
    const words = text.trim().split(/\s+/).slice(0, 5);
    return words.join(" ");
  };

  // Handle action button press
  const handleAction = async (action: "improve" | "flashcards" | "summary") => {
    if (!notes.trim()) {
      setError("Please enter some notes first");
      return;
    }

    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoading(true);
    setActiveTab(action === "improve" ? "notes" : action === "flashcards" ? "flashcards" : "summary");

    try {
      const extractedTopic = extractTopic(notes);
      const truncatedText = notes.slice(0, MAX_CHARS);
      setTopic(extractedTopic);

      // Check cache first
      const cached = await getCachedOutput(action, extractedTopic, truncatedText);
      if (cached) {
        setOutputs(cached);
        setLoading(false);
        return;
      }

      // Call tRPC mutation
      const data = await generateMutation.mutateAsync({
        action,
        topic: extractedTopic,
        text: truncatedText,
      });

      setOutputs(data);

      // Cache the result
      await cacheOutput(action, extractedTopic, truncatedText, data);
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to generate content. Please try again.");
      setActiveTab(null);
    } finally {
      setLoading(false);
    }
  };

  // Save current set
  const handleSave = async () => {
    if (!notes.trim() || Object.keys(outputs).length === 0) {
      setError("Please generate some content before saving");
      return;
    }

    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const newSet: SavedSet = {
        id: Date.now().toString(),
        topic: topic || "Untitled",
        notes,
        outputs,
        timestamp: Date.now(),
      };

      await saveSavedSet(newSet);
      setSavedSets([newSet, ...savedSets]);
    } catch (err) {
      console.error("Error saving set:", err);
      setError("Failed to save study set");
    }
  };

  // Load saved set
  const handleLoad = (set: SavedSet) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotes(set.notes);
    setTopic(set.topic);
    setOutputs(set.outputs);
    setShowSaved(false);
    setActiveTab("notes");
    setError("");
  };

  // Delete saved set
  const handleDelete = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await deleteSavedSet(id);
      setSavedSets(savedSets.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Error deleting set:", err);
      setError("Failed to delete study set");
    }
  };

  // Toggle flashcard flip
  const toggleFlip = (index: number) => {
    const newFlipped = new Set(flippedCards);
    if (newFlipped.has(index)) {
      newFlipped.delete(index);
    } else {
      newFlipped.add(index);
    }
    setFlippedCards(newFlipped);
  };

  // Clear input
  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotes("");
    setOutputs({});
    setTopic("");
    setActiveTab(null);
    setFlippedCards(new Set());
    setError("");
  };

  if (!appReady) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  const charCount = notes.length;
  const charPercentage = (charCount / MAX_CHARS) * 100;

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1">
        <View className="flex-1 gap-6 p-4">
          {/* Header */}
          <View className="gap-1">
            <Text className="text-3xl font-bold text-foreground">NoteMorph</Text>
            <Text className="text-sm text-muted">Transform notes into study materials</Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View className="bg-error/10 border border-error rounded-lg px-3 py-2">
              <Text className="text-sm text-error">{error}</Text>
            </View>
          ) : null}

          {/* Input Section */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">Your Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Paste or type your study notes here..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={8}
              maxLength={MAX_CHARS}
              className="bg-surface border border-border rounded-lg p-4 text-foreground"
              style={{ color: colors.foreground }}
            />

            {/* Character Counter */}
            <View className="flex-row justify-between items-center">
              <Text className="text-xs text-muted">
                {charCount} / {MAX_CHARS} characters
              </Text>
              {charCount > MAX_CHARS * 0.9 ? (
                <Text className="text-xs text-warning">Approaching limit</Text>
              ) : null}
            </View>

            {/* Character Progress Bar */}
            <View className="h-1 bg-border rounded-full overflow-hidden">
              <View
                className="h-full bg-primary"
                style={{ width: `${Math.min(charPercentage, 100)}%` }}
              />
            </View>

            {/* Clear Button */}
            <Pressable
              onPress={handleClear}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="self-end"
            >
              <Text className="text-sm font-semibold text-primary">Clear</Text>
            </Pressable>
          </View>

          {/* Action Buttons Grid */}
          <View className="gap-3">
            <Text className="text-sm font-semibold text-foreground">Generate</Text>
            <View className="flex-row gap-3">
              <ActionButton
                label="Improve"
                onPress={() => handleAction("improve")}
                loading={loading && activeTab === "notes"}
              />
              <ActionButton
                label="Flashcards"
                onPress={() => handleAction("flashcards")}
                loading={loading && activeTab === "flashcards"}
              />
            </View>
            <View className="flex-row gap-3">
              <ActionButton
                label="Summary"
                onPress={() => handleAction("summary")}
                loading={loading && activeTab === "summary"}
              />
              <ActionButton
                label="Save Set"
                onPress={handleSave}
                variant="secondary"
              />
            </View>
          </View>

          {/* Topic Tag */}
          {topic ? (
            <View className="bg-primary/10 rounded-lg px-3 py-2">
              <Text className="text-xs font-semibold text-primary">Topic: {topic}</Text>
            </View>
          ) : null}

          {/* Output Section */}
          {loading ? (
            <View className="items-center justify-center py-8">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="text-sm text-muted mt-3">Generating...</Text>
            </View>
          ) : activeTab === "notes" && outputs.improved_notes ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Improved Notes</Text>
              <View className="bg-surface rounded-lg p-4 border border-border">
                <Text className="text-sm leading-relaxed text-foreground">
                  {outputs.improved_notes}
                </Text>
              </View>
            </View>
          ) : activeTab === "flashcards" && outputs.flashcards ? (
            <View className="gap-3">
              <Text className="text-sm font-semibold text-foreground">Flashcards</Text>
              {outputs.flashcards.map((card, index) => (
                <Pressable
                  key={index}
                  onPress={() => toggleFlip(index)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                  className="bg-surface border border-border rounded-lg p-4 min-h-[120px] justify-center items-center"
                >
                  <Text className="text-xs text-muted mb-2">
                    {flippedCards.has(index) ? "Answer" : "Question"}
                  </Text>
                  <Text className="text-sm font-semibold text-foreground text-center">
                    {flippedCards.has(index) ? card.a : card.q}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : activeTab === "summary" && outputs.summary ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Exam Summary</Text>
              <View className="bg-surface rounded-lg p-4 border border-border">
                <Text className="text-sm leading-relaxed text-foreground">
                  {outputs.summary}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Saved Sets Button */}
          {savedSets.length > 0 ? (
            <Pressable
              onPress={() => setShowSaved(!showSaved)}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
              className="bg-surface border border-border rounded-lg p-3"
            >
              <Text className="text-sm font-semibold text-primary">
                📚 Saved Sets ({savedSets.length})
              </Text>
            </Pressable>
          ) : null}

          {/* Saved Sets List */}
          {showSaved && savedSets.length > 0 ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Your Study Sets</Text>
              {savedSets.map((set) => (
                <View key={set.id} className="bg-surface border border-border rounded-lg p-3 gap-2">
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-foreground">{set.topic}</Text>
                      <Text className="text-xs text-muted">
                        {new Date(set.timestamp).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => handleLoad(set)}
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      className="flex-1 bg-primary rounded px-3 py-2"
                    >
                      <Text className="text-xs font-semibold text-background text-center">Load</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(set.id)}
                      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                      className="flex-1 bg-error/20 rounded px-3 py-2"
                    >
                      <Text className="text-xs font-semibold text-error text-center">Delete</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Empty State */}
          {!activeTab && !showSaved ? (
            <View className="items-center justify-center py-8 gap-2">
              <Text className="text-sm text-muted text-center">
                Enter your notes and tap a button to get started
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// Action Button Component
function ActionButton({
  label,
  onPress,
  loading = false,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary";
}) {
  const colors = useColors();
  const isPrimary = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        { opacity: loading ? 0.6 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}
      className={cn(
        "flex-1 rounded-lg py-3 px-4 items-center justify-center",
        isPrimary ? "bg-primary" : "bg-surface border border-border"
      )}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary ? "#fff" : colors.primary} />
      ) : (
        <Text className={cn("font-semibold text-sm", isPrimary ? "text-background" : "text-foreground")}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
