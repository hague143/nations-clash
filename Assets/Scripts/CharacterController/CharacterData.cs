using System;
using System.Collections.Generic;

namespace NationClash
{
    [Serializable]
    public sealed class CharacterData
    {
        public string id, country, displayName, region, archetype, weightClass, stance, victoryLine;
        public int hp = 1000;
        public string[] palette;
        public MoveNames moves;
        public StageData stage;

        public void Validate()
        {
            if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(country) ||
                string.IsNullOrWhiteSpace(displayName) || string.IsNullOrWhiteSpace(stance) ||
                string.IsNullOrWhiteSpace(victoryLine))
                throw new ArgumentException("Character identity, stance and victory line are required.");
            Archetypes.Get(archetype);
            if (weightClass != "Light" && weightClass != "Medium" && weightClass != "Heavy")
                throw new ArgumentException("Invalid weight class: " + weightClass);
            if (hp < 900 || hp > 1100) throw new ArgumentException("HP must be 900..1100.");
            if (palette == null || palette.Length < 2) throw new ArgumentException("Two palette colors are required.");
            foreach (string color in palette)
                if (color == null || color.Length != 7 || color[0] != '#' ||
                    !int.TryParse(color.Substring(1), System.Globalization.NumberStyles.HexNumber,
                        System.Globalization.CultureInfo.InvariantCulture, out _))
                    throw new ArgumentException("Palette entries must be #RRGGBB.");
            if (moves == null || string.IsNullOrWhiteSpace(moves.lightAttack) ||
                string.IsNullOrWhiteSpace(moves.heavyAttack) || string.IsNullOrWhiteSpace(moves.special1) ||
                string.IsNullOrWhiteSpace(moves.special2) || string.IsNullOrWhiteSpace(moves.ultimate))
                throw new ArgumentException("All five move names are required.");
            if (stage == null || string.IsNullOrWhiteSpace(stage.name))
                throw new ArgumentException("Stage name is required.");
        }

        public static void ValidateRoster(IEnumerable<CharacterData> roster)
        {
            var ids = new HashSet<string>(StringComparer.Ordinal);
            foreach (var character in roster)
            {
                if (character == null) throw new ArgumentException("Character JSON cannot be null.");
                character.Validate();
                if (!ids.Add(character.id)) throw new ArgumentException("Duplicate character id: " + character.id);
            }
        }
    }

    [Serializable] public sealed class MoveNames
    {
        public string lightAttack, heavyAttack, special1, special2, ultimate;
    }

    [Serializable] public sealed class StageData { public string name, hazard; }
}
