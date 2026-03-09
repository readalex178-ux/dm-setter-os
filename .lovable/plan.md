

## Bug: Messages Can't Be Sent in Demo Mode

**Root Cause**: In `InboxPage.tsx` line 164-167, when in demo mode, `handleSend()` simply clears the input and returns — the message is never added to the conversation UI. Since there are no DB prospects (the network response returns `[]`), the app falls back to demo mode, making it impossible to see sent messages.

**Fix**:

1. **Add local message state for demo mode** — maintain a local array of user-sent messages that gets merged with the static demo messages for display.

2. **Update `handleSend` for demo mode** — instead of just clearing input, push a new message object (with sender `"setter"`, content, timestamp, and unique ID) into the local state.

3. **Merge demo + local messages** — when computing `messages`, combine `demoMessages[selectedId]` with locally sent messages for that prospect.

This is a straightforward state management fix in `InboxPage.tsx` only.

