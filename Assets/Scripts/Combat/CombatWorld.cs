using System;

namespace NationClash
{
    // Pure C# simulation. Unity rendering and inputs do not own damage or round rules.
    public sealed class CombatWorld
    {
        public const int TickRate = 60;
        public readonly Fighter Left, Right;
        public readonly RoundManager Rounds;
        public int Frame { get; private set; }
        public int HitStopFrames { get; private set; }
        public string LastEvent { get; private set; } = "READY";
        public int LastEventFrame { get; private set; }
        public CombatWorld(CharacterData left, CharacterData right, int seconds = 60, int introFrames = 90, int intermissionFrames = 150)
        {
            Left = new Fighter(left); Right = new Fighter(right);
            Rounds = new RoundManager(seconds, introFrames, intermissionFrames); ResetFighters();
        }
        void ResetFighters() { Left.Reset(-2.2f, 1); Right.Reset(2.2f, -1); HitStopFrames = 0; }
        void Event(string text) { LastEvent = text; LastEventFrame = Frame; }

        public void Tick(InputState leftInput, InputState rightInput)
        {
            if (Rounds.Phase != RoundPhase.Fighting)
            {
                Frame++;
                if (Rounds.Tick(Left.Hp, Right.Hp, Left.Data.hp, Right.Data.hp)) ResetFighters();
                return;
            }
            ReadInput(Left, leftInput); ReadInput(Right, rightInput);
            if (HitStopFrames > 0) { HitStopFrames--; return; }
            Frame++;
            Advance(Left, Right); Advance(Right, Left);
            // Take both collision snapshots before applying either: simultaneous hits can trade.
            HitResult leftHit = HitboxSystem.Detect(Left, Right), rightHit = HitboxSystem.Detect(Right, Left);
            if (leftHit.Kind == HitKind.Throw && rightHit.Kind == HitKind.Throw)
            {
                Left.Interrupt(12, FighterState.ThrowTech); Right.Interrupt(12, FighterState.ThrowTech);
                Event("THROW CLASH");
            }
            else { Apply(leftHit); Apply(rightHit); }
            bool leftThrow = ThrowSystem.Tick(Left, Frame), rightThrow = ThrowSystem.Tick(Right, Frame);
            if (leftThrow || rightThrow) Event("THROW");
            KeepInArena();
            Rounds.Tick(Left.Hp, Right.Hp, Left.Data.hp, Right.Data.hp);
            if (Rounds.Phase != RoundPhase.Fighting)
                Event(Rounds.Winner < 0 ? "DRAW" : Rounds.Perfect ? "PERFECT" : Rounds.Reason.ToString().ToUpperInvariant());
        }

        void ReadInput(Fighter fighter, InputState input)
        {
            input.Horizontal = Math.Sign(input.Horizontal);
            fighter.Input = input;
            if (input.Action == Command.Throw && ThrowSystem.Tech(fighter, Frame))
            { Event("THROW TECH"); return; }
            fighter.Buffer.Push(input, Frame);
        }

        void Advance(Fighter f, Fighter other)
        {
            f.Combo.Expire(Frame);
            if (!f.Grounded || f.VerticalVelocity > 0)
            {
                f.VerticalVelocity -= 20f / TickRate;
                f.Y += f.VerticalVelocity / TickRate;
                if (f.Y <= 0) { f.Y = 0; f.VerticalVelocity = 0; }
            }
            f.Juggle.Tick(Frame, f.Grounded);
            if (f.StunFrames > 0) f.StunFrames--;
            if (!f.CanAct) return;
            if (f.Move == null) f.Facing = other.X >= f.X ? 1 : -1;

            if (f.Move != null)
            {
                f.MoveFrame++;
                if (f.MoveFrame >= f.Move.Startup + f.Move.Active && !f.MoveResolved) f.Combo.Reset();
                bool canCancel = f.MoveConnected && f.MoveFrame >= f.Move.Startup + f.Move.Active &&
                    f.Buffer.Peek(Frame, out var next) && f.Combo.CanChain(next.Action, Frame);
                if (canCancel) { StartAction(f, f.Buffer.Pop()); return; }
                else if (f.MoveFrame >= f.Move.TotalFrames) { f.Move = null; f.MoveFrame = 0; }
                else return;
            }
            if (f.Buffer.Peek(Frame, out _))
            {
                var command = f.Buffer.Pop();
                StartAction(f, command);
                if (f.Move != null) return;
            }
            if (f.DashFrames > 0)
            {
                f.DashFrames--; f.State = FighterState.Dash;
                f.X += f.DashDirection * f.Profile.DashSpeed / TickRate; return;
            }
            if (f.Input.Block || f.Input.Horizontal == -f.Facing)
                f.State = f.Grounded ? FighterState.Block : FighterState.Jump;
            else f.State = !f.Grounded ? FighterState.Jump : f.Input.Horizontal != 0 ? FighterState.Walk : FighterState.Idle;
            if (!f.Input.Block && !f.Input.Down)
                f.X += f.Input.Horizontal * f.Profile.WalkSpeed / TickRate;
        }

        void StartAction(Fighter f, BufferedInput input)
        {
            if (input.Action == Command.Jump)
            { if (f.Grounded) { f.VerticalVelocity = f.Profile.JumpVelocity; f.State = FighterState.Jump; } return; }
            if (input.Action == Command.Dash)
            { if (f.Grounded) { f.DashFrames = 10; f.DashDirection = input.Horizontal != 0 ? input.Horizontal : f.Facing; } return; }
            MoveData move = f.Profile.Get(input.Action, f.Combo.Stage);
            if (move == null || (move.IsThrow && !f.Grounded)) return;
            if (move.Ultimate && !f.Meter.SpendUltimate()) { Event("METER REQUIRED"); return; }
            f.Move = move; f.MoveFrame = 0; f.MoveConnected = false; f.MoveResolved = false;
            f.MoveLow = input.Down && !move.IsThrow && !move.Ultimate;
            f.State = move.IsThrow ? FighterState.Throw : FighterState.Attack;
            if (input.Horizontal == f.Facing) f.X += .15f;
        }

        void Apply(HitResult hit)
        {
            if (hit.Kind == HitKind.None) return;
            var a = hit.Attacker; var d = hit.Defender; var move = hit.Move;
            a.MoveResolved = true;
            if (hit.Kind == HitKind.Block)
            {
                a.Combo.Reset(); d.Interrupt(move.BlockStun); d.State = FighterState.Block;
                HitStopFrames = Math.Max(HitStopFrames, 3); Event("BLOCK"); return;
            }
            if (hit.Kind == HitKind.Throw)
            {
                a.Combo.Reset(); ThrowSystem.Start(a, d, Frame, move.Damage); Event("THROW · TECH NOW"); return;
            }
            int damage = HitboxSystem.Damage(d, move);
            d.Hp = Math.Max(0, d.Hp - damage);
            d.PendingThrow = null;
            d.Interrupt(move.HitStun);
            a.MoveConnected = true; a.Combo.Hit(move.Command, Frame);
            a.Meter.Add(damage * .08f); d.Meter.Add(damage * .05f);
            d.X += a.Facing * .25f;
            if (d.Juggle.Active)
            {
                d.Juggle.Hit();
                if (move.Command == Command.Special) d.VerticalVelocity = -7f; // original slam finisher
                else d.VerticalVelocity = Math.Max(d.VerticalVelocity, 3.0f);
            }
            else if (move.Launcher && d.Hp > 0)
            { d.Juggle.Launch(Frame); d.VerticalVelocity = 6.2f; d.Y = .02f; }
            HitStopFrames = Math.Max(HitStopFrames, move.Ultimate ? 10 : 5);
            Event(hit.Kind == HitKind.GuardBreak ? "GUARD BREAK" : move.Ultimate ? "NATION ULTIMATE" :
                move.Launcher ? "LAUNCH" : a.Combo.Hits > 1 ? a.Combo.Hits + " HIT COMBO" : "HIT");
        }

        void KeepInArena()
        {
            Left.X = Math.Max(-7.5f, Math.Min(7.5f, Left.X)); Right.X = Math.Max(-7.5f, Math.Min(7.5f, Right.X));
            if (Math.Abs(Left.X - Right.X) < .7f && Math.Abs(Left.Y - Right.Y) < 1.3f)
            {
                float center = Math.Max(-7.15f, Math.Min(7.15f, (Left.X + Right.X) / 2));
                int direction = Left.X <= Right.X ? 1 : -1;
                Left.X = center - direction * .35f; Right.X = center + direction * .35f;
            }
        }
    }
}
