namespace NationClash
{
    // These are Phase 1 fixtures, not culturally reviewed production characters.
    public static class TrainingRoster
    {
        public static CharacterData[] Create() => new[]
        {
            Create("pk_training", "Pakistan", "Crescent Vanguard", "South Asia", "Grappler", "Heavy", 1050,
                "#147D52", "#F3F1DA", "Lahore training arena"),
            Create("jp_training", "Japan", "Horizon Sentinel", "East Asia", "Striker", "Medium", 1000,
                "#D44B57", "#F3F1DA", "Coastal training arena")
        };

        public static CharacterData Create(string id, string country, string name, string region,
            string archetype, string weight, int hp, string primary, string secondary, string stage)
            => new CharacterData
            {
                id = id, country = country, displayName = name, region = region, archetype = archetype,
                weightClass = weight, hp = hp, palette = new[] { primary, secondary },
                stance = "Prototype sport stance",
                moves = new MoveNames
                {
                    lightAttack = "Opening Spark", heavyAttack = "Rising Horizon", special1 = "Momentum Drive",
                    special2 = "Guard Eclipse", ultimate = "Nation Radiance"
                },
                stage = new StageData { name = stage, hazard = "Visual theme only; no hazards in Phase 1" },
                victoryLine = "Every round is a new beginning."
            };
    }
}
