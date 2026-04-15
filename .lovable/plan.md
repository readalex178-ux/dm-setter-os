

## Plan: Voice Dictation + Smart Voice Actions for Messaging

**Goal**: Speak your messages to prospects instead of typing, and use voice commands like "send follow-up 1 to Sarah" to auto-fill scripts and target specific conversations.

### Changes

**1. Create `useSpeechToText` hook** (`src/hooks/use-speech-to-text.ts`)
- Pure dictation hook — continuous listening, streams transcript into a callback
- Returns `{ isListening, start, stop, isSupported }`
- No command parsing — just raw speech-to-text

**2. Add mic button to Inbox message composer** (`src/pages/InboxPage.tsx`)
- Microphone icon button next to the Send button (line ~562)
- Tapping starts dictation, speech streams into `messageInput` state in real-time
- Button pulses red while listening, tap again to stop

**3. Add mic button to Training page chat** (`src/pages/TrainingPage.tsx`)
- Same pattern — mic button next to the send button for dictating roleplay responses

**4. Expand voice command actions** (`src/hooks/use-voice-command.ts`)
- Add new patterns:
  - `"send follow up 1 to sarah"` / `"send script opener to john"` — navigates to Inbox, selects the matching conversation, and pre-fills the message input with the matching script from `demoScripts`
  - `"reply to sarah"` — navigates to Inbox and selects Sarah's conversation
- Fuzzy-match script names (e.g., "follow up 1" matches script titled "Follow-Up Message #1") and contact names

### How "send follow-up 1 to Sarah" works

1. Voice command hook parses: action=`send_script`, script=`follow up 1`, target=`sarah`
2. Navigates to `/app/inbox`
3. Finds the conversation matching "sarah" and selects it
4. Looks up the script matching "follow up 1" from the scripts data
5. Pre-fills the message input with the script content
6. You review and hit Send (manual control preserved)

### Technical Details

- `useSpeechToText` is separate from `useVoiceCommand` — dictation vs commands
- Script matching uses fuzzy includes on `demoScripts` title/category
- Contact matching uses fuzzy includes on conversation names
- Both Inbox and Training pages get the mic button via the same reusable hook

### Files

| File | Action |
|------|--------|
| `src/hooks/use-speech-to-text.ts` | Create — pure dictation hook |
| `src/hooks/use-voice-command.ts` | Edit — add `send_script` and `reply_to` patterns |
| `src/pages/InboxPage.tsx` | Edit — add mic button to composer |
| `src/pages/TrainingPage.tsx` | Edit — add mic button to chat input |

