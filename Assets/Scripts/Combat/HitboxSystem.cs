using System;

namespace NationClash
{
    public enum HitKind { None, Hit, Block, GuardBreak, Throw }
    public struct HitResult
    {
        public Fighter Attacker, Defender;
        public MoveData Move;
        public HitKind Kind;
    }

    public static class HitboxSystem
    {
        public static HitResult Detect(Fighter attacker, Fighter defender)
        {
            var result = new HitResult { Attacker = attacker, Defender = defender, Move = attacker.Move };
            var move = attacker.Move;
            if (move == null || attacker.MoveResolved || !move.IsActive(attacker.MoveFrame) || defender.Hp <= 0)
                return result;
            float forwardDistance = (defender.X - attacker.X) * attacker.Facing;
            if (forwardDistance < -.25f || forwardDistance > move.Range + .35f) return result;
            float attackBottom = attacker.Y + (attacker.MoveLow ? .1f : .7f);
            float attackTop = attacker.Y + (attacker.MoveLow ? .7f : 1.85f);
            float hurtTop = defender.Y + (defender.Input.Down && defender.Grounded ? 1.05f : 1.85f);
            if (attackTop < defender.Y || attackBottom > hurtTop) return result;
            if (move.IsThrow)
            {
                if (!attacker.Grounded || !defender.Grounded || defender.PendingThrow != null) return result;
                result.Kind = HitKind.Throw;
            }
            else if (BlockSystem.IsBlocking(defender, attacker.MoveLow))
                result.Kind = move.GuardBreak ? HitKind.GuardBreak : HitKind.Block;
            else result.Kind = HitKind.Hit;
            return result;
        }

        public static int Damage(Fighter defender, MoveData move)
        {
            float scale = defender.Juggle.Active ? defender.Juggle.Scale(defender.Weight) : 1f;
            return Math.Max(1, (int)Math.Round(move.Damage * scale));
        }
    }
}
