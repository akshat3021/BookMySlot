# Workflow: plan

Run this before starting any new project or major feature.

1. Ask the user (if not already clear from context):
   - What is this app for, and who is it for?
   - What are the 3–5 core features for v1 — nothing extra?
   - What data/entities need to be stored, and how do they relate?
   - Is auth actually needed for v1, or can it wait?
   - What's the simplest stack that accomplishes this?
   - What should explicitly stay out of scope for now?
2. Summarize the answers as a short written plan.
3. Save this plan as the scope of truth for the project (e.g. in
   `production_artifacts/PLAN.md`).
4. Break the plan into individual, small, sequential agent tasks —
   one per feature. List them in build order.
5. Do not start building. Wait for the user to approve the plan and
   task list first.
