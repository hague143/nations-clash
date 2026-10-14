using System;
using System.Collections.Generic;

namespace NationClash
{
    public enum WeightClass { Light, Medium, Heavy }
    public enum FighterState { Idle, Walk, Jump, Dash, Attack, Block, HitReaction, Throw, ThrowTech, KO }

    public sealed class MoveData
    {
        public string Animation;
        public Command Command;
        public int Damage, Startup, Active, Recovery, HitStun, BlockStun;
        public float Range;
        public bool Launcher, GuardBreak, IsThrow, Ultimate;
        public int TotalFrames => Startup + Active + Recovery;
        public bool IsActive(int frame) => frame >= Startup && frame < Startup + Active;
    }

    public sealed class ArchetypeProfile
    {
        public string Name, AssetKey;
        public float WalkSpeed, DashSpeed, JumpVelocity;
        public WeightClass DefaultWeight;
        public MoveData Light1, Light2, Light3, Heavy, Special1, Special2, Throw, Ultimate;
        public MoveData Get(Command command, int comboStage)
        {
            switch (command)
            {
                case Command.Light: return comboStage == 1 ? Light2 : comboStage >= 2 ? Light3 : Light1;
                case Command.Heavy: return Heavy;
                case Command.Special: return Special1;
                case Command.GuardBreak: return Special2;
                case Command.Throw: return Throw;
                case Command.Ultimate: return Ultimate;
                default: return null;
            }
        }
    }

    public static class Archetypes
    {
        public static readonly string[] Names =
        { "Striker", "Grappler", "Weapon Duelist", "Trickster", "Brawler/Heavy", "Kicker", "Dual-Stance", "Zoner" };
        static readonly Dictionary<string, ArchetypeProfile> profiles = Build();
        public static ArchetypeProfile Get(string name)
        {
            if (name == null || !profiles.TryGetValue(name, out var profile))
                throw new ArgumentException("Unknown archetype: " + name);
            return profile;
        }

        static MoveData Move(string animation, Command command, int damage, int startup, int active,
            int recovery, float range, int hitStun = 22) => new MoveData
            {
                Animation = animation, Command = command, Damage = damage, Startup = startup,
                Active = active, Recovery = recovery, Range = range, HitStun = hitStun, BlockStun = 10
            };

        static Dictionary<string, ArchetypeProfile> Build()
        {
            var result = new Dictionary<string, ArchetypeProfile>(StringComparer.Ordinal);
            for (int i = 0; i < Names.Length; i++)
            {
                bool heavy = i == 1 || i == 4, agile = i == 3 || i == 5;
                float reach = i == 2 || i == 5 ? 1.8f : 1.4f;
                int bonus = heavy ? 12 : 0, start = heavy ? 8 : 5;
                var p = new ArchetypeProfile
                {
                    Name = Names[i], AssetKey = Names[i].Replace("/", "_").Replace(" ", "_"),
                    WalkSpeed = heavy ? 2.6f : agile ? 4.1f : 3.3f,
                    DashSpeed = heavy ? 6.0f : 8.0f,
                    JumpVelocity = agile ? 8.0f : 7.0f,
                    DefaultWeight = heavy ? WeightClass.Heavy : agile ? WeightClass.Light : WeightClass.Medium,
                    Light1 = Move("Light1", Command.Light, 50 + bonus, start, 3, 14, reach),
                    Light2 = Move("Light2", Command.Light, 58 + bonus, start, 3, 15, reach + .1f),
                    Light3 = Move("Light3", Command.Light, 70 + bonus, start + 2, 3, 18, reach + .2f),
                    Heavy = Move("Heavy", Command.Heavy, 115 + bonus, 12, 4, 24, reach + .3f, 30),
                    Special1 = Move("Special1", Command.Special, 135 + bonus, 16, 4, 28, i == 7 ? 5.5f : reach + .7f, 30),
                    Special2 = Move("Special2", Command.GuardBreak, 90 + bonus, 20, 3, 32, reach + .2f, 42),
                    Throw = Move("Throw", Command.Throw, i == 1 ? 170 : 130, 7, 2, 30, i == 1 ? 1.2f : .95f, 30),
                    Ultimate = Move("Ultimate", Command.Ultimate, 310 + bonus, 22, 5, 40, 3.2f, 45)
                };
                p.Heavy.Launcher = true;
                p.Special2.GuardBreak = true;
                p.Throw.IsThrow = true;
                p.Ultimate.Ultimate = true;
                result.Add(p.Name, p);
            }
            return result;
        }
    }
}
