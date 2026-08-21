# Billion-Context-Pi — Fleet Widget UX (5W1H)

Source-grounded reference for `src/fleet-widget.ts` (97 lines, read in full).

## WHO
The user watching parallel delegates progress in the TUI.

## WHAT
A below-editor status widget: header (`acp_delegate · N running`) + one row per delegate (`● agent (12s) — task`).

## WHEN
Visible while delegates run; CLEARS itself and STOPS ITS TIMER when the list empties; `poke()` restarts it on a new spawn (a spawn can arrive after idle shutdown :62-67 comment).

## WHERE
Render-key debounce :38-42/:55-60, mode guard :70-77, lifecycle :79-97.

## WHY
- *Debounce by render key*: key = agent + elapsed-SECOND + truncated task per run. Elapsed rounds to seconds, so the 500ms timer naturally re-renders ~once per second per run instead of churning every tick — motion stays legible and cheap.
- *Idle TUIs must not tick*: empty list clears the widget AND stops the interval (unref'd anyway) — a background poller that outlives its content is a bug dressed as a feature.
- *Mode guards over capability sniffing*: RPC mode reports hasUI=true but setWidget there emits useless extension_ui_request notifications (~1Hz chatter); print/json have none. Guard on `ctx.mode === "tui"` DIRECTLY (:73-76 comment cites types.d.ts rationale).
- *Teardown is best-effort twice over*: setWidget throws during session teardown are swallowed; an unexpected throw clears the ui binding so the next setContext rebinds (:63-66 comment). Real cleanup belongs to dispose().
- *Task text respects the row*: newlines collapsed, truncation at 48 chars with ellipsis INSIDE the budget.
- *Sort by startedAt*: oldest first — launch order is the mental model.

## HOW
setContext binds ui + snapshot getter and starts the interval; refresh() pulls a fresh snapshot each tick (never caches state between ticks); placement `belowEditor` keeps it adjacent to the input where attention already is.
