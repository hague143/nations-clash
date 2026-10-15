using System;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

namespace NationClash
{
    public static class CharacterCatalog
    {
        public static bool UsesTrainingRoster { get; private set; }
        public static CharacterData[] Load()
        {
            var files = Resources.LoadAll<TextAsset>("NationClash/Characters");
            UsesTrainingRoster = files.Length == 0;
            var roster = UsesTrainingRoster ? TrainingRoster.Create() : files.Select(file =>
            {
                try { return JsonUtility.FromJson<CharacterData>(file.text); }
                catch (Exception error) { throw new ArgumentException("Invalid JSON in " + file.name, error); }
            }).ToArray();
            CharacterData.ValidateRoster(roster);
            return roster.OrderBy(c => c.region ?? "Other").ThenBy(c => c.country).ToArray();
        }
    }
}
