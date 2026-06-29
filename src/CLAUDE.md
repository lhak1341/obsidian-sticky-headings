# Obsidian API gotchas

- `PluginSettingTab` has an internal `update()` method since Obsidian 1.13.0 — don't define a method with that name in subclasses; the framework calls it during `addSettingTab` with no args, wiping plugin settings.
