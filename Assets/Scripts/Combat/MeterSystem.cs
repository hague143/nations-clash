using System;

namespace NationClash
{
    public sealed class MeterSystem
    {
        public float Value { get; private set; }
        public bool Ready => Value >= 100;
        public void Add(float amount) { Value = Math.Max(0, Math.Min(100, Value + amount)); }
        public bool SpendUltimate()
        {
            if (!Ready) return false;
            Value = 0;
            return true;
        }
        public void Reset() { Value = 0; }
    }
}
