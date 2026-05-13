# NoteMorph - Mobile App Design

## Overview
NoteMorph is a token-efficient study companion that transforms raw student notes into organized study materials. The app focuses on a clean, single-page flow optimized for mobile portrait orientation and one-handed usage.

## Screen List

### 1. Home Screen (Main)
The primary and only screen where all interactions occur. Designed as a vertical scroll flow with input at top and outputs below.

## Primary Content and Functionality

### Input Section
- **Free-text notes box**: Large textarea for pasting or typing raw notes
- **Character counter**: Display current character count (max 1,500 chars)
- **Clear button**: Quick reset of the input field

### Action Buttons
Four primary buttons arranged in a 2×2 grid:
- **Improve Notes**: Cleans and organizes raw notes into 2–4 short paragraphs
- **Make Flashcards**: Generates 6 Q&A flashcard pairs from the notes
- **Make Summary**: Creates a 100–150 word exam-style summary
- **Save Set**: Saves the current input + all outputs to local storage

### Output Section
Displays results from the selected action:
- **Improved Notes**: Clean, organized text paragraphs
- **Flashcards**: Scrollable list of Q&A cards with flip animation
- **Summary**: Exam-ready summary text
- **Topic Tag**: Auto-extracted 3–5 word topic label (displayed above outputs)

### Saved Sets Section
- **List of saved study sets**: Each set shows topic, date saved, and action buttons
- **Load button**: Restores a saved set to the input/output area
- **Delete button**: Removes a saved set from local storage

## Key User Flows

### Flow 1: Generate Study Materials
1. User opens app (Home Screen)
2. User pastes or types notes into the input box
3. User taps one of the four action buttons (Improve, Flashcards, Summary, or Save)
4. App extracts topic tag from notes
5. App calls backend LLM with action token, topic, and truncated text
6. Results display in the output section below
7. User can tap another button to generate different outputs from the same notes

### Flow 2: Save and Reuse Study Sets
1. User generates study materials (Flow 1)
2. User taps "Save Set" button
3. App saves input notes + all outputs to local storage with timestamp
4. Saved set appears in the "Saved Sets" section below
5. User can later tap "Load" on a saved set to restore it
6. User can tap "Delete" to remove a saved set

### Flow 3: View Flashcards
1. User taps "Make Flashcards" button
2. Flashcard list appears with 6 cards
3. User taps a card to flip between question and answer
4. User can scroll through all cards

## Color Choices

| Element | Color | Hex | Purpose |
|---------|-------|-----|---------|
| Primary Accent | Study Blue | #0a7ea4 | Action buttons, highlights, links |
| Background | Clean White | #ffffff (light) / #151718 (dark) | Main screen background |
| Surface | Light Gray | #f5f5f5 (light) / #1e2022 (dark) | Input box, cards, containers |
| Text Primary | Dark Gray | #11181C (light) / #ECEDEE (dark) | Main text, headings |
| Text Secondary | Medium Gray | #687076 (light) / #9BA1A6 (dark) | Labels, hints, secondary info |
| Border | Light Border | #E5E7EB (light) / #334155 (dark) | Input borders, dividers |
| Success | Green | #22C55E (light) / #4ADE80 (dark) | Success states, checkmarks |

## Interaction Patterns

- **Press Feedback**: Buttons scale to 0.97 with light haptic feedback on tap
- **Loading States**: Spinner or skeleton loader while waiting for LLM response
- **Error Handling**: Toast notifications for API errors or validation issues
- **Scrolling**: Main content is scrollable; flashcard lists use horizontal scroll for cards

## Responsive Design Notes

- **Portrait orientation only** (9:16 aspect ratio)
- **One-handed usage**: All interactive elements within thumb reach
- **Safe area handling**: Content respects notch and home indicator areas
- **Touch targets**: Minimum 44pt height for all buttons and interactive elements
