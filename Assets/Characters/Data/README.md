# Phase 1 data contract

This folder intentionally has no generated country roster. Phase 1 uses two explicitly
marked training definitions in `TrainingRoster.cs`. They are placeholder prototypes,
not researched or finished national character designs.

Place one UTF-8 JSON file per character here in Phase 2. The Editor's
**NationClash > Prepare prototype** command validates every file and packs them as
TextAssets into `Assets/Generated/Resources/NationClash/Characters/`. This makes the
same loader work in Editor, Android, and PC builds without filesystem assumptions.
Invalid or duplicate entries stop preparation rather than disappearing silently.

Required shape (not a generated character):

```json
{
  "id": "unique_id",
  "country": "Country name",
  "displayName": "Original name",
  "region": "Region",
  "archetype": "Grappler",
  "weightClass": "Heavy",
  "hp": 1050,
  "palette": ["#01411C", "#FFFFFF"],
  "stance": "Original sport stance",
  "moves": {
    "lightAttack": "Original move",
    "heavyAttack": "Original move",
    "special1": "Original move",
    "special2": "Original move",
    "ultimate": "Original move"
  },
  "stage": {"name": "Original arena", "hazard": "Visual theme only in Phase 1"},
  "victoryLine": "Original line"
}
```

Archetypes: Striker, Grappler, Weapon Duelist, Trickster, Brawler/Heavy, Kicker,
Dual-Stance, Zoner. Weight classes: Light, Medium, Heavy. `region` is an optional
extension for region grouping. No commercial game data or assets are used.
