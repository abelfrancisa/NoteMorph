import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";

// LLM System template (cached client-side)
const SYSTEM_PROMPT = `You are an expert study assistant that transforms raw notes into organized study materials. 
Your responses must be valid JSON only, with no additional text or markdown wrappers.
Always output compact, well-structured JSON matching the requested format.`;

// Action-specific prompts
const ACTION_PROMPTS = {
  improve: `Clean and organize the provided notes into 2-4 short, clear paragraphs. Focus on clarity and structure.
Return JSON: {"improved_notes": "..."}`,
  
  flashcards: `Create exactly 6 flashcard Q&A pairs from the provided notes. Each pair should test key concepts.
Return JSON: {"flashcards": [{"q": "...", "a": "..."}, ...]}`,
  
  summary: `Create a 100-150 word exam-style summary of the provided notes. Make it concise and comprehensive.
Return JSON: {"summary": "..."}`,
};

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Study content generation
  study: router({
    generate: publicProcedure
      .input(
        z.object({
          action: z.enum(["improve", "flashcards", "summary"]),
          topic: z.string().max(100),
          text: z.string().min(10).max(1500),
        })
      )
      .mutation(async ({ input }) => {
        const { action, topic, text } = input;

        // Build the user prompt
        const userPrompt = `Topic: ${topic}\n\nNotes:\n${text}\n\n${ACTION_PROMPTS[action]}`;

        try {
          // Call LLM with structured response
          const response = await invokeLLM({
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
          });

          // Extract the response text
          let responseText =
            typeof response.choices[0].message.content === "string"
              ? response.choices[0].message.content
              : "";

          // Remove markdown code blocks if present (```json ... ```)
          responseText = responseText
            .replace(/^```json\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

          // Parse JSON response
          let result;
          try {
            result = JSON.parse(responseText);
          } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            console.error("Response text:", responseText);
            throw new Error(`Failed to parse LLM response: ${parseError instanceof Error ? parseError.message : "Unknown error"}`);
          }

          // Validate response structure based on action
          if (action === "improve" && !result.improved_notes) {
            throw new Error("Invalid response format: missing improved_notes");
          }
          if (action === "flashcards" && !Array.isArray(result.flashcards)) {
            throw new Error("Invalid response format: missing flashcards array");
          }
          if (action === "summary" && !result.summary) {
            throw new Error("Invalid response format: missing summary");
          }

          return result;
        } catch (error) {
          console.error("LLM Error:", error);
          throw new Error("Failed to generate content. Please try again.");
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
