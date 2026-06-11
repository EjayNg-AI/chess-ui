import type { GameSettings } from '../../types/chess'

type SettingsPanelProps = {
  settings: GameSettings
  onChange: (settings: GameSettings) => void
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <section className="panel-section settings-panel" aria-label="Settings">
      <div className="section-title">Settings</div>

      <label>
        Game mode
        <select
          value={settings.mode}
          onChange={(event) =>
            onChange({ ...settings, mode: event.target.value as GameSettings['mode'] })
          }
        >
          <option value="human_vs_engine">Human vs Engine</option>
          <option value="engine_vs_engine">Engine vs Engine</option>
          <option value="human_vs_human">Human vs Human</option>
        </select>
      </label>

      <label>
        Human side
        <select
          value={settings.human_color}
          onChange={(event) =>
            onChange({
              ...settings,
              human_color: event.target.value as GameSettings['human_color'],
            })
          }
        >
          <option value="white">White</option>
          <option value="black">Black</option>
          <option value="random">Random</option>
        </select>
      </label>

      <label>
        Engine limit
        <select
          value={settings.engine.limit_type}
          onChange={(event) =>
            onChange({
              ...settings,
              engine: {
                ...settings.engine,
                limit_type: event.target.value as GameSettings['engine']['limit_type'],
              },
            })
          }
        >
          <option value="movetime">Move time</option>
          <option value="depth">Fixed depth</option>
        </select>
      </label>

      <label>
        Move time ms
        <input
          min={50}
          step={50}
          type="number"
          value={settings.engine.movetime_ms}
          onChange={(event) =>
            onChange({
              ...settings,
              engine: { ...settings.engine, movetime_ms: Number(event.target.value) },
            })
          }
        />
      </label>

      <label>
        Fixed depth
        <input
          min={1}
          max={30}
          type="number"
          value={settings.engine.depth ?? 10}
          onChange={(event) =>
            onChange({
              ...settings,
              engine: { ...settings.engine, depth: Number(event.target.value) },
            })
          }
        />
      </label>

      <label>
        Engine skill
        <input
          min={0}
          max={20}
          type="range"
          value={settings.engine.skill_level}
          onChange={(event) =>
            onChange({
              ...settings,
              engine: { ...settings.engine, skill_level: Number(event.target.value) },
            })
          }
        />
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={settings.clock.enabled}
          onChange={(event) =>
            onChange({
              ...settings,
              clock: { ...settings.clock, enabled: event.target.checked },
            })
          }
        />
        Clock enabled
      </label>

      <label>
        Initial minutes
        <input
          min={1}
          type="number"
          value={Math.round(settings.clock.initial_ms / 60_000)}
          onChange={(event) =>
            onChange({
              ...settings,
              clock: { ...settings.clock, initial_ms: Number(event.target.value) * 60_000 },
            })
          }
        />
      </label>

      <label>
        Increment seconds
        <input
          min={0}
          type="number"
          value={Math.round(settings.clock.increment_ms / 1000)}
          onChange={(event) =>
            onChange({
              ...settings,
              clock: { ...settings.clock, increment_ms: Number(event.target.value) * 1000 },
            })
          }
        />
      </label>

      <label>
        Board orientation
        <select
          value={settings.orientation}
          onChange={(event) =>
            onChange({
              ...settings,
              orientation: event.target.value as GameSettings['orientation'],
            })
          }
        >
          <option value="auto">Auto</option>
          <option value="white">White</option>
          <option value="black">Black</option>
        </select>
      </label>

      <label>
        Start FEN
        <textarea
          rows={3}
          spellCheck={false}
          value={settings.fen ?? ''}
          onChange={(event) =>
            onChange({
              ...settings,
              fen: event.target.value.trim() ? event.target.value : null,
            })
          }
        />
      </label>
    </section>
  )
}
