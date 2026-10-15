using System;

namespace NationClash
{
    public sealed class Fighter
    {
        public readonly CharacterData Data;
        public readonly ArchetypeProfile Profile;
        public readonly WeightClass Weight;
        public readonly InputBuffer Buffer = new InputBuffer();
        public readonly ComboChainer Combo = new ComboChainer();
        public readonly JuggleState Juggle = new JuggleState();
        public readonly MeterSystem Meter = new MeterSystem();
        public float X, Y, VerticalVelocity;
        public int Facing = 1, Hp, StunFrames, DashFrames, DashDirection;
        public FighterState State;
        public InputState Input;
        public MoveData Move;
        public int MoveFrame;
        public bool MoveConnected, MoveResolved, MoveLow;
        public PendingThrow PendingThrow;
        public bool Grounded => Y <= .001f;
        public bool CanAct => Hp > 0 && StunFrames <= 0 && PendingThrow == null;
        public string Animation => Hp <= 0 ? "KO" : PendingThrow != null ? "HitReaction" :
            StunFrames > 0 ? (State == FighterState.ThrowTech ? "ThrowTech" : State == FighterState.Block ? "Block" : "HitReaction") :
            Move != null ? Move.Animation : State.ToString();

        public Fighter(CharacterData data)
        {
            data.Validate(); Data = data; Profile = Archetypes.Get(data.archetype);
            Weight = (WeightClass)Enum.Parse(typeof(WeightClass), data.weightClass);
            Reset(0, 1);
        }
        public void Reset(float x, int facing)
        {
            X = x; Y = 0; VerticalVelocity = 0; Facing = facing; Hp = Data.hp;
            StunFrames = 0; DashFrames = 0; DashDirection = 0; State = FighterState.Idle;
            Input = default; Move = null; MoveFrame = 0; MoveConnected = MoveResolved = MoveLow = false;
            PendingThrow = null; Buffer.Clear(); Combo.Reset(); Juggle.Reset(); Meter.Reset();
        }
        public void Interrupt(int stun, FighterState state = FighterState.HitReaction)
        {
            Move = null; MoveFrame = 0; DashFrames = 0; Combo.Reset();
            StunFrames = stun; State = Hp <= 0 ? FighterState.KO : state;
        }
    }
}
