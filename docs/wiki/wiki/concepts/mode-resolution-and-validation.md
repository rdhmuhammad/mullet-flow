# Mode Resolution and Validation

**Summary**: Multi-tier mode validation and resolution hierarchy across environment variables, user config files, and host extensions.
**Sources**: `hooks/ponytail-config.js`, `hooks/ponytail-instructions.js`, `pi-extension/index.js`, `.opencode/plugins/ponytail.mjs`
**Last updated**: 2026-11-02

---

## Mode Tiers

Ponytail enforces two distinct tiers of modes:
- **`RUNTIME_MODES`** (`off`, `lite`, `full`, `ultra`, `max`, `ultra-max`): Valid operational levels for continuous agent execution and default configuration.
- **`VALID_MODES`** (`off`, `lite`, `full`, `ultra`, `max`, `ultra-max`, `review`): Includes `review`, which is strictly session-only and never permitted as a persistent default.

## Normalization Functions

- [`normalizeMode(mode)`](file:///d:/personal/mullet-flow/hooks/ponytail-config.js#L20): Sanitizes input string (trim and lowercase) and checks against `RUNTIME_MODES`. Returns normalized mode or `null`.
- [`normalizeConfigMode(mode)`](file:///d:/personal/mullet-flow/hooks/ponytail-config.js#L26): Checks against `VALID_MODES`.
- [`normalizePersistedMode(mode)`](file:///d:/personal/mullet-flow/hooks/ponytail-config.js#L32): Accepts either runtime or session modes (`normalizeMode(mode) || normalizeConfigMode(mode)`).

## Default Mode Resolution Order

[`getDefaultMode()`](file:///d:/personal/mullet-flow/hooks/ponytail-config.js#L80) evaluates in strict order:
1. **`PONYTAIL_DEFAULT_MODE`**: Environment variable, parsed through `normalizeMode()`.
2. **`config.json` (`defaultMode`)**: Located at `$XDG_CONFIG_HOME/ponytail/config.json`, `%APPDATA%\ponytail\config.json` (Windows), or `~/.config/ponytail/config.json`. Strips UTF-8 BOM before JSON parsing.
3. **Hardcoded Fallback**: Defaults to `'full'`.

## Cross-Subsystem Enforcement

- **Pi Extension (`pi-extension/index.js`)**: Evaluates `/ponytail <mode>` commands via `parsePonytailCommand()`, supporting deactivation phrases (`stop ponytail`, `normal mode`) through `isDeactivationCommand()`.
- **OpenCode Plugin (`.opencode/plugins/ponytail.mjs`)**: Normalizes reads and persists state cleanly using `normalizeMode()` and `persistMode()`.
- **Prompt Compiler (`hooks/ponytail-instructions.js`)**: Calls `filterSkillBodyForMode()` and `normalizePersistedMode()` to strip unnecessary instructions based on the active mode level.

## Related pages

- [[index]]
- [[concepts/index]]
- [[concepts/get-ponytail-instructions]]
