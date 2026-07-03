# Obsidian API gotchas

- `PluginSettingTab` has an internal `update()` method since Obsidian 1.13.0 — don't define a method with that name in subclasses; the framework calls it during `addSettingTab` with no args, wiping plugin settings.
- Unit tests (`bun test`) can safely use `import type` from `obsidian` — type-only imports are erased at runtime. Any non-type import of `obsidian` will fail since the host API isn't available outside Obsidian; keep testable logic DOM-free.
- If you need manual lifecycle control over an `EventRef` (e.g., inside a data structure with its own `destroy()`), don't also pass it to `this.registerEvent` — Obsidian calls `offref` for all registered events at `onunload`, causing a double-deregister. Choose one or the other.
- esbuild resolves bare `src/...` imports using `tsconfig.json`'s `baseUrl` — removing or changing `baseUrl`/`moduleResolution` breaks the build for all files using bare paths, including `.svelte` files. Convert all bare imports to relative paths before touching those tsconfig options.
