namespace NationClash
{
    public sealed class PendingThrow
    {
        public Fighter Attacker;
        public int EndFrame, Damage;
    }

    public static class ThrowSystem
    {
        public const int TechWindowFrames = 12;
        public static void Start(Fighter attacker, Fighter defender, int frame, int damage)
        {
            defender.Interrupt(0);
            defender.Buffer.Clear();
            defender.PendingThrow = new PendingThrow { Attacker = attacker, EndFrame = frame + TechWindowFrames, Damage = damage };
        }
        public static bool Tech(Fighter defender, int frame)
        {
            var grab = defender.PendingThrow;
            if (grab == null || frame >= grab.EndFrame) return false;
            defender.PendingThrow = null;
            defender.Interrupt(12, FighterState.ThrowTech);
            grab.Attacker.Interrupt(12, FighterState.ThrowTech);
            return true;
        }
        public static bool Tick(Fighter defender, int frame)
        {
            var grab = defender.PendingThrow;
            if (grab == null) return false;
            if (grab.Attacker.Hp <= 0 || grab.Attacker.State == FighterState.HitReaction)
            { defender.PendingThrow = null; return false; }
            if (frame < grab.EndFrame) return false;
            defender.PendingThrow = null;
            defender.Hp = System.Math.Max(0, defender.Hp - grab.Damage);
            defender.Interrupt(28);
            grab.Attacker.Meter.Add(grab.Damage * .08f);
            defender.Meter.Add(grab.Damage * .05f);
            return true;
        }
    }
}
