## Goal

Convert Training Mode from an AI-initiated chatbot into a structured roleplay simulator where the **user always sends the first message** and the AI only ever responds in character as a randomly generated prospect.

## Current behavior (to change)

In `src/pages/TrainingPage.tsx`, `startScenario()` immediately calls the `training-chat` edge function with empty messages, so the AI generates and shows an opening message before the user types anything. This must be removed.

## Planned changes

### 1. `src/pages/TrainingPage.tsx`
- **Random persona generator (client-side):** Add a helper that builds a unique persona each session — random name, age range, job/situation, a personality trait, and light context tied to the scenario's `personaType` (e.g. "Jamie, 32, marketing manager. Followed after seeing a TikTok about passive income. Slightly sceptical but curious."). Built from small randomized name/age/job/trait/context pools.
- **`startScenario(id)`:** Stop calling `training-chat` on start. Instead:
  - Reset state (`messages: []`, no thinking spinner).
  - Generate and store a fresh `persona` in state.
  - Leave the conversation empty so the input box is ready.
- **Scenario intro panel:** When a scenario is active but `messages` is empty, show an intro block above the (empty) chat:
  - Scenario name
  - Goal text: "Your goal is to get them to book a call."
  - The generated persona card (name/age/job/trait/context)
  - Prompt: "Send your first message."
  - No AI/system message is rendered.
- **`sendMessage()`:** Keep current flow — append the user message, then call `getAiReply` so the AI responds **only after** the user's input. Persona is passed through so the AI stays in character.
- **`getAiReply` / function payload:** Include the generated `persona` (name, age, job, trait, context) in the `scenario` object sent to `training-chat` so replies match the random prospect.
- Keep existing turn-count / feedback / "Try Again" logic. "Try Again" regenerates a new persona (fresh session = different person).

### 2. `supabase/functions/training-chat/index.ts`
- The function already builds `aiMessages` and, when `messages` is empty, injects a "send your opening response as the prospect" user turn. **Remove that opener branch** so the function never produces a first message: if no user messages are present, return an error/no-op (the client will never call it with empty messages anyway).
- Use the passed persona fields (`personaName`, age, job, trait, context) to strengthen the in-character system prompt. Keep the existing persona-type behavior guidelines and offer context.

## Acceptance criteria mapping
- Clicking Start Practice shows scenario + goal only → intro panel, no AI message.
- Shows random prospect persona → persona generated and displayed each session.
- Input box empty and ready → no opener call, `input` stays empty.
- User sends first message → `sendMessage` is the only entry to the AI.
- AI responds as prospect only after user message → `getAiReply` called post-send; opener branch removed server-side.
- Every session different person → persona regenerated on start and on "Try Again".

No backend schema changes. Scenario list already matches the 8 requested modes.</content>
<summary>Refactor Training Mode into a roleplay simulator: user sends first message, AI only responds, with a randomly generated prospect persona per session.</summary>
</invoke>
