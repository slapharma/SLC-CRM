# Lessons

Patterns captured to avoid repeating mistakes. Review at session start.

## Deployment / Vercel
- **`READY` ≠ serving.** A Vercel deployment can reach state `READY` (build exited 0) yet
  return 404 on every route. Verify the actual HTTP response of a real route — not just
  build status or build logs — before claiming a deploy works.
- **Vercel projects created via API/MCP come up with `framework: null`.** Git-connecting
  them does NOT set the Next.js preset, so no serving function is registered → every route
  404s and the project stays `live:false`. Fix: commit `vercel.json` with
  `{"framework":"nextjs"}` (or set the preset in the dashboard). (commit `4b27aa3`)
- **Don't declare success prematurely.** I reported the first deploy as working off `READY`
  + clean build logs; the apex actually 404'd. Always verify end-to-end with a real request.

## Next.js 16 (this repo)
- Runs **Next.js 16.2.9** with breaking changes vs training data (e.g. `middleware` appears
  to be renamed/replaced by **`proxy`**). Per `AGENTS.md`, **read
  `node_modules/next/dist/docs/` before writing any framework code.** Offload that doc
  reading to subagents/workflows to keep the main context clean.

## Workflow scripts
- Workflow scripts are plain JS: do **not** put literal backticks inside backtick-delimited
  template-literal prompts (closes the string early). Use single quotes for inline code.
