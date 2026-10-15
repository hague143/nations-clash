using System;
using System.Collections.Generic;
using NationClash;

static class Program
{
    static int passed, failed;
    static void Main()
    {
        Run("eight-frame input lifetime and direction modifiers", () =>
        {
            var buffer = new InputBuffer(); buffer.Push(new InputState(-1, true, false, Command.Light), 10);
            Check(buffer.Peek(17, out var value), "last valid frame");
            Check(value.Horizontal == -1 && value.Down, "modifiers preserved");
            Check(!buffer.Peek(18, out _), "expired at frame eight");
        });
        Run("input queue is bounded", () =>
        {
            var buffer = new InputBuffer();
            for (int i = 0; i < 80; i++) buffer.Push(new InputState(action: Command.Light), 0);
            Check(buffer.Count == 16, "bounded to 16");
        });
        Run("all eight archetypes have complete moves and distinct tuning", () =>
        {
            var speeds = new HashSet<float>();
            foreach (var name in Archetypes.Names)
            {
                var p = Archetypes.Get(name); speeds.Add(p.WalkSpeed);
                foreach (var move in new[] { p.Light1, p.Light2, p.Light3, p.Heavy, p.Special1, p.Special2, p.Throw, p.Ultimate })
                    Check(move.Startup > 0 && move.Active > 0 && move.Recovery > 0 && move.Damage > 0, name);
            }
            Check(speeds.Count >= 3, "different movement tuning");
        });
        Run("invalid schemas and duplicate IDs rejected", () =>
        {
            var roster = TrainingRoster.Create(); CharacterData.ValidateRoster(roster);
            Throws(() => CharacterData.ValidateRoster(new CharacterData[] { null }));
            Throws(() => CharacterData.ValidateRoster(new[] { roster[0], roster[0] }));
            roster[0].weightClass = "1"; Throws(roster[0].Validate); roster[0].weightClass = "Heavy";
            roster[0].hp = 5000; Throws(roster[0].Validate);
            roster[0].hp = 1000; roster[0].palette[0] = "green"; Throws(roster[0].Validate);
            roster[0].palette[0] = "#00FF00"; roster[0].archetype = "missing"; Throws(roster[0].Validate);
        });
        Run("attack damages only on active frames and only once", () =>
        {
            var w = World(); int hp = w.Right.Hp;
            w.Tick(new InputState(action: Command.Light), default);
            Check(w.Right.Hp == hp, "startup does not hit");
            Until(w, () => w.Right.Hp < hp);
            int damage = hp - w.Right.Hp; Step(w, 45);
            Check(damage == w.Left.Profile.Light1.Damage && w.Right.Hp == hp - damage, "one damage application");
        });
        Run("out-of-range attacks whiff and reset combo", () =>
        {
            var w = World(); w.Right.X = 6; int hp = w.Right.Hp;
            w.Left.Combo.Hit(Command.Light, w.Frame);
            w.Tick(new InputState(action: Command.Light), default); Step(w, 60);
            Check(w.Right.Hp == hp && w.Left.Combo.Hits == 0, "no hit, dropped combo");
        });
        Run("dedicated block causes zero chip and breaks attacker combo", () =>
        {
            var w = World(); int hp = w.Right.Hp;
            w.Tick(new InputState(action: Command.Light), new InputState(block: true));
            Step(w, 35, right: new InputState(block: true));
            Check(w.Right.Hp == hp && w.Left.Combo.Hits == 0, "zero chip");
        });
        Run("holding back blocks", () =>
        {
            var w = World(); int hp = w.Right.Hp;
            w.Tick(new InputState(action: Command.Light), new InputState(1));
            Until(w, () => w.LastEvent == "BLOCK", right: new InputState(1));
            Check(w.Right.Hp == hp, "back block without chip");
        });
        Run("low attacks beat standing guard but crouch guard blocks", () =>
        {
            var w = World(); int hp = w.Right.Hp;
            w.Tick(new InputState(down: true, action: Command.Light), new InputState(block: true));
            Until(w, () => w.Right.Hp < hp, right: new InputState(block: true));
            var guarded = World(); hp = guarded.Right.Hp;
            guarded.Tick(new InputState(down: true, action: Command.Light), new InputState(down: true, block: true));
            Step(guarded, 35, right: new InputState(down: true, block: true));
            Check(guarded.Right.Hp == hp, "crouch block");
        });
        Run("guard break damages and staggers held block", () =>
        {
            var w = World(); int hp = w.Right.Hp;
            w.Tick(new InputState(action: Command.GuardBreak), new InputState(block: true));
            Until(w, () => w.Right.Hp < hp, right: new InputState(block: true));
            Check(w.LastEvent == "GUARD BREAK" && w.Right.StunFrames >= 30, "guard break stagger");
        });
        Run("light-light-heavy chain is buffered and launches", () =>
        {
            var w = World(); int hp = w.Right.Hp;
            w.Tick(new InputState(action: Command.Light), default);
            Until(w, () => w.Right.Hp < hp); hp = w.Right.Hp;
            w.Tick(new InputState(action: Command.Light), default);
            Until(w, () => w.Right.Hp < hp); hp = w.Right.Hp;
            Check(w.Left.Combo.Hits == 2, "second connected hit");
            w.Tick(new InputState(action: Command.Heavy), default);
            Until(w, () => w.Right.Hp < hp);
            Check(w.Left.Combo.Hits == 3 && w.Right.Juggle.Active && w.Right.Y > 0, "third hit launches");
        });
        Run("recovery inputs execute while valid and stale inputs expire", () =>
        {
            var w = World(); w.Left.StunFrames = 5;
            w.Tick(new InputState(action: Command.Light), default); Step(w, 4);
            Check(w.Left.Move != null, "buffer survives short stun");
            var stale = World(); stale.Left.StunFrames = 20;
            stale.Tick(new InputState(action: Command.Light), default); Step(stale, 25);
            Check(stale.Left.Move == null && stale.Left.Buffer.Count == 0, "long stun expires command");
        });
        Run("juggle decay varies by weight and expires on timeout/landing", () =>
        {
            var juggle = new JuggleState(); juggle.Launch(0); juggle.Hit(); juggle.Hit();
            Check(juggle.Scale(WeightClass.Heavy) < juggle.Scale(WeightClass.Light), "weight decay");
            juggle.Tick(90, false); Check(!juggle.Active, "timeout");
            juggle.Launch(100); juggle.Tick(101, true); Check(!juggle.Active, "landing");
        });
        Run("launcher and special slam resolve through the world", () =>
        {
            var w = World(); int hp = w.Right.Hp;
            w.Tick(new InputState(action: Command.Heavy), default); Until(w, () => w.Right.Hp < hp);
            Check(w.Right.Juggle.Active && w.Right.VerticalVelocity > 0, "launched");
            // Wait for attacker recovery and align a follow-up against the falling hurtbox.
            Until(w, () => w.Left.Move == null); hp = w.Right.Hp;
            w.Tick(new InputState(action: Command.Special), default); Until(w, () => w.Right.Hp < hp);
            Check(w.Right.Hp < hp, "follow-up special hits");
            Step(w, 90); Check(w.Right.Grounded && !w.Right.Juggle.Active, "returns to ground");
        });
        Run("throws bypass block and grant a timed tech window", () =>
        {
            var w = World(); int hp = w.Right.Hp;
            w.Tick(new InputState(action: Command.Throw), new InputState(block: true));
            Until(w, () => w.Right.PendingThrow != null, right: new InputState(block: true));
            Check(w.Right.Hp == hp, "damage deferred");
            w.Tick(default, new InputState(action: Command.Throw)); Step(w, 30);
            Check(w.Right.Hp == hp && w.Right.PendingThrow == null, "tech prevented damage");
        });
        Run("unbroken throw damages after the tech deadline", () =>
        {
            var w = World(); int hp = w.Right.Hp;
            w.Tick(new InputState(action: Command.Throw), default); Until(w, () => w.Right.PendingThrow != null);
            Until(w, () => w.Right.Hp < hp);
            Check(hp - w.Right.Hp == w.Left.Profile.Throw.Damage, "throw damage");
        });
        Run("jump evades a grounded throw", () =>
        {
            var w = World(); int hp = w.Right.Hp;
            w.Tick(new InputState(action: Command.Throw), new InputState(action: Command.Jump)); Step(w, 25);
            Check(w.Right.Hp == hp && w.Right.PendingThrow == null, "airborne cannot be grabbed");
        });
        Run("simultaneous grabs clash without player-order advantage", () =>
        {
            var w = World(); int leftHp = w.Left.Hp, rightHp = w.Right.Hp;
            w.Tick(new InputState(action: Command.Throw), new InputState(action: Command.Throw));
            Until(w, () => w.LastEvent == "THROW CLASH"); Step(w, 30);
            Check(w.Left.Hp == leftHp && w.Right.Hp == rightHp, "clash has no damage");
            Check(w.Left.PendingThrow == null && w.Right.PendingThrow == null, "both throws cleared");
        });
        Run("meter gains on hit and gates ultimate spending", () =>
        {
            var w = World();
            w.Tick(new InputState(action: Command.Ultimate), default);
            Check(w.Left.Move == null && w.LastEvent == "METER REQUIRED", "ultimate denied");
            w.Tick(new InputState(action: Command.Light), default); Until(w, () => w.Right.Hp < w.Right.Data.hp);
            Check(w.Left.Meter.Value > 0 && w.Right.Meter.Value > 0, "meter gain");
            Until(w, () => w.Left.Move == null); w.Left.Meter.Add(200);
            w.Tick(new InputState(action: Command.Ultimate), default);
            Check(w.Left.Move.Ultimate && w.Left.Meter.Value == 0, "ultimate spends 100");
        });
        Run("simultaneous active hits trade and double KO is a draw", () =>
        {
            var w = World(); w.Left.Hp = w.Right.Hp = 20;
            w.Left.Move = w.Left.Profile.Light1; w.Right.Move = w.Right.Profile.Light1;
            w.Left.MoveFrame = w.Left.Move.Startup - 1; w.Right.MoveFrame = w.Right.Move.Startup - 1;
            w.Tick(default, default);
            Check(w.Left.Hp == 0 && w.Right.Hp == 0, "both hit");
            Check(w.Rounds.Reason == RoundReason.DoubleKO && w.Rounds.LeftWins == 0 && w.Rounds.RightWins == 0, "draw awards no wins");
        });
        Run("best-of-three, perfect bonus and round reset", () =>
        {
            var w = World(intermission: 1); w.Left.Meter.Add(70); w.Right.Hp = 0; w.Tick(default, default);
            Check(w.Rounds.LeftWins == 1 && w.Rounds.Perfect, "perfect first round");
            w.Tick(default, default);
            Check(w.Rounds.RoundNumber == 2 && w.Right.Hp == w.Right.Data.hp && w.Left.Meter.Value == 0, "round reset");
            w.Right.Hp = 0; w.Tick(default, default);
            Check(w.Rounds.Phase == RoundPhase.Complete && w.Rounds.LeftWins == 2, "match ends at two wins");
        });
        Run("timeout judges normalized HP percentages", () =>
        {
            var rounds = new RoundManager(60, 0, 1);
            for (int i = 0; i < 3600; i++) rounds.Tick(550, 525, 1100, 1000);
            Check(rounds.Winner == 1 && rounds.Reason == RoundReason.Timeout, "52.5% beats 50%");
            var draw = new RoundManager(60, 0, 1);
            for (int i = 0; i < 3600; i++) draw.Tick(550, 500, 1100, 1000);
            Check(draw.Winner == -1 && draw.Reason == RoundReason.Draw, "equal percentage draws");
        });
        Run("intro freezes combat and match completion freezes state", () =>
        {
            var roster = TrainingRoster.Create(); var w = new CombatWorld(roster[0], roster[1], 60, 3, 1);
            float x = w.Left.X;
            for (int i = 0; i < 3; i++) w.Tick(new InputState(1, action: Command.Light), default);
            Check(w.Left.X == x && w.Right.Hp == w.Right.Data.hp && w.Left.Buffer.Count == 0, "intro frozen");
            w.Right.Hp = 0; w.Tick(default, default); w.Tick(default, default);
            for (int i = 0; i < 3; i++) w.Tick(default, default);
            w.Right.Hp = 0; w.Tick(default, default);
            Check(w.Rounds.Phase == RoundPhase.Complete, "completed match");
            x = w.Left.X; int hp = w.Left.Hp, timer = w.Rounds.RemainingFrames;
            for (int i = 0; i < 20; i++) w.Tick(new InputState(1, action: Command.Heavy), new InputState(action: Command.Heavy));
            Check(w.Left.X == x && w.Left.Hp == hp && w.Rounds.RemainingFrames == timer, "completed state frozen");
        });
        Run("jump, dash and arena bounds are enforced", () =>
        {
            var w = World(); w.Tick(new InputState(action: Command.Jump), default); Step(w, 5);
            Check(w.Left.Y > 0, "jump arc"); Step(w, 90); Check(w.Left.Grounded, "landed");
            float x = w.Left.X; w.Tick(new InputState(-1, action: Command.Dash), default); Step(w, 10);
            Check(w.Left.X < x - .5f, "dash speed");
            Step(w, 600, new InputState(-1), new InputState(1));
            Check(w.Left.X >= -7.5f && w.Right.X <= 7.5f, "stage bounds");
        });
        Run("seeded fight smoke test preserves HP, meter and position invariants", () =>
        {
            var random = new Random(312); var w = World(intermission: 1);
            for (int i = 0; i < 15000 && w.Rounds.Phase != RoundPhase.Complete; i++)
            {
                w.Tick(RandomInput(random), RandomInput(random));
                foreach (var f in new[] { w.Left, w.Right })
                {
                    Check(f.Hp >= 0 && f.Hp <= f.Data.hp, "HP bounds");
                    Check(f.Meter.Value >= 0 && f.Meter.Value <= 100, "meter bounds");
                    Check(f.Y >= 0 && Math.Abs(f.X) <= 7.5f, "position bounds");
                }
            }
            Check(w.Rounds.LeftWins + w.Rounds.RightWins > 0, "fight completed a decisive round");
        });
        Console.WriteLine($"\n{passed} passed; {failed} failed; {passed + failed} executed.");
        Environment.ExitCode = failed == 0 ? 0 : 1;
    }
    static InputState RandomInput(Random random) => new InputState(random.Next(-1, 2), random.Next(8) == 0,
        random.Next(7) == 0, random.Next(9) == 0 ? (Command)random.Next(1, 9) : Command.None);
    static CombatWorld World(int intermission = 1)
    {
        var roster = TrainingRoster.Create(); var w = new CombatWorld(roster[0], roster[1], 60, 0, intermission);
        w.Left.X = -.45f; w.Right.X = .45f; return w;
    }
    static void Step(CombatWorld w, int ticks, InputState left = default, InputState right = default)
    { for (int i = 0; i < ticks; i++) w.Tick(left, right); }
    static void Until(CombatWorld w, Func<bool> predicate, int limit = 180, InputState right = default)
    {
        for (int i = 0; i < limit && !predicate(); i++) w.Tick(default, right);
        Check(predicate(), "condition reached within " + limit + " ticks");
    }
    static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
    static void Throws(Action action)
    {
        try { action(); } catch (ArgumentException) { return; }
        throw new Exception("Expected ArgumentException");
    }
    static void Run(string name, Action test)
    {
        try { test(); passed++; Console.WriteLine("PASS " + name); }
        catch (Exception error) { failed++; Console.WriteLine("FAIL " + name + ": " + error.Message); }
    }
}
