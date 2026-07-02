# Obsidian API gotchas

- `PluginSettingTab` has an internal `update()` method since Obsidian 1.13.0 — don't define a method with that name in subclasses; the framework calls it during `addSettingTab` with no args, wiping plugin settings.
- Unit tests (`bun test`) can safely use `import type` from `obsidian` — type-only imports are erased at runtime. Any non-type import of `obsidian` will fail since the host API isn't available outside Obsidian; keep testable logic DOM-free.
