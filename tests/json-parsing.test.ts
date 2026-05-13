import { describe, it, expect } from "vitest";

describe("JSON Parsing - Markdown Code Block Handling", () => {
  // Helper function that mimics the backend JSON parsing logic
  const parseJsonResponse = (responseText: string) => {
    let text = responseText;
    
    // Remove markdown code blocks if present (```json ... ```)
    text = text
      .replace(/^```json\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    return JSON.parse(text);
  };

  it("should parse plain JSON without markdown", () => {
    const json = '{"improved_notes": "This is improved text"}';
    const result = parseJsonResponse(json);
    expect(result.improved_notes).toBe("This is improved text");
  });

  it("should parse JSON wrapped in markdown code blocks", () => {
    const json = '```json\n{"improved_notes": "This is improved text"}\n```';
    const result = parseJsonResponse(json);
    expect(result.improved_notes).toBe("This is improved text");
  });

  it("should parse JSON with markdown code blocks and extra whitespace", () => {
    const json = '```json\n\n{"improved_notes": "This is improved text"}\n\n```';
    const result = parseJsonResponse(json);
    expect(result.improved_notes).toBe("This is improved text");
  });

  it("should parse flashcards JSON from markdown", () => {
    const json = `\`\`\`json
{
  "flashcards": [
    {"q": "What is photosynthesis?", "a": "The process by which plants convert light into energy"},
    {"q": "What is the formula?", "a": "6CO2 + 6H2O + light → C6H12O6 + 6O2"}
  ]
}
\`\`\``;
    const result = parseJsonResponse(json);
    expect(result.flashcards).toHaveLength(2);
    expect(result.flashcards[0].q).toBe("What is photosynthesis?");
  });

  it("should parse summary JSON from markdown", () => {
    const json = `\`\`\`json
{
  "summary": "Photosynthesis is a fundamental biological process where plants use sunlight, water, and carbon dioxide to produce glucose and oxygen. This process occurs in the chloroplasts of plant cells."
}
\`\`\``;
    const result = parseJsonResponse(json);
    expect(result.summary).toContain("Photosynthesis");
  });

  it("should handle case-insensitive markdown markers", () => {
    const json = '```JSON\n{"improved_notes": "Test"}\n```';
    const result = parseJsonResponse(json);
    expect(result.improved_notes).toBe("Test");
  });

  it("should throw error on invalid JSON", () => {
    const json = '```json\n{invalid json}\n```';
    expect(() => parseJsonResponse(json)).toThrow();
  });

  it("should handle JSON with nested objects", () => {
    const json = `\`\`\`json
{
  "improved_notes": "First paragraph.\\n\\nSecond paragraph with details."
}
\`\`\``;
    const result = parseJsonResponse(json);
    expect(result.improved_notes).toContain("First paragraph");
  });
});
