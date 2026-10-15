namespace NationClash
{
    public static class BlockSystem
    {
        public static bool IsBlocking(Fighter defender, bool low)
        {
            bool holdingBack = defender.Input.Horizontal == -defender.Facing;
            return defender.Grounded && defender.Hp > 0 && defender.StunFrames == 0 &&
                defender.Move == null && defender.PendingThrow == null &&
                (defender.Input.Block || holdingBack) && (!low || defender.Input.Down);
        }
    }
}
