# Essential: Guiding a Small Model (deepseek-flash) — Operating Philosophy

Source: Discord conversation with mentor Tom, 2026-08-21. This is the core
philosophy that drives all our work. Treat it as an essential.

## The core principle
A small model (deepseek-flash) is **agentically the same** as a frontier model
(sol/fable). It just lacks *knowledge*. So you don't make it smarter — you
**give it ground truth to work from**.

## The rules
1. **Code is ground truth, not specs.**
   - The moment you have an artifact markdown, you throw away code definitions.
   - Markdown files are ultimately for post-code stuff.
   - The more you rely on markdown as a spec, the more you burn on iterating
     things that could have been one-shotted with 1-2 examples.
   - The chat session itself is already an "artifact." Only burn it into a
     markdown when you expect the run to last 4-10 days.

2. **The reusable unit is the skill (the shortcut), not the spec.**
   - "Deepseek makes no mistakes, because the workflow is written in code or a
     skill somewhere."
   - When the workflow is encoded in a skill, the small model just follows it —
     no re-deriving, no hallucinating.

3. **Prewalk is your best tool.**
   - The prompt planning phase matters, but NOT to plan everything by hand.
   - Give it context, and let it search context. The agent finds the seams itself.

4. **Stack shortcuts.**
   - New stuff takes time and tokens; existing stuff gives you a shortcut on both.
   - The more you stack shortcuts, the faster the work becomes.
   - Every foundation (oh-my-pi, mem0, graphiti, aider, the pack-foundations
     leaves) is a shortcut that makes the small model faster and more correct.

5. **Code foundations are the trail.**
   - Terminal browser brought terminal code; before that was terminal video;
     before that was kitty images. Each built on the last.
   - New designs are quicker because they come from proven code (t3 code,
     localterm, etc.).

## What this means for our setup
- The drain squeezes repos into foundation skills so deepseek-flash can lift
  from proven code — this IS the philosophy in action.
- Use the pack-foundations leaves as retrieval maps, not specs.
- Give the model context and let it search; don't hand-plan every step.
