using System;

namespace NationClash
{
    public sealed class JuggleState
    {
        public bool Active { get; private set; }
        public int EndFrame { get; private set; }
        public int Hits { get; private set; }
        public float Scale(WeightClass weight)
        {
            float decay = weight == WeightClass.Heavy ? .24f : weight == WeightClass.Light ? .13f : .18f;
            return Math.Max(.30f, 1f - Hits * decay);
        }
        public void Launch(int frame) { Active = true; Hits = 0; EndFrame = frame + 90; }
        public void Hit() { Hits++; }
        public void Tick(int frame, bool grounded) { if (grounded || frame >= EndFrame) Reset(); }
        public void Reset() { Active = false; Hits = 0; EndFrame = 0; }
    }
}
