namespace NationClash
{
    public sealed class ComboChainer
    {
        public int Stage { get; private set; }
        public int Hits { get; private set; }
        public int LastHitFrame { get; private set; } = -1000;
        public void Hit(Command command, int frame)
        {
            if (frame - LastHitFrame > 45) Reset();
            Stage = command == Command.Light ? System.Math.Min(Stage + 1, 3) : 0;
            Hits++;
            LastHitFrame = frame;
        }
        public bool CanChain(Command command, int frame) => frame - LastHitFrame <= 45 && Stage > 0 &&
            (command == Command.Heavy || (command == Command.Light && Stage < 3));
        public void Expire(int frame) { if (frame - LastHitFrame > 45) Reset(); }
        public void Reset() { Stage = 0; Hits = 0; LastHitFrame = -1000; }
    }
}
