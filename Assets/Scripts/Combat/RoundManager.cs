using System;

namespace NationClash
{
    public enum RoundPhase { Intro, Fighting, Intermission, Complete }
    public enum RoundReason { None, KO, Timeout, DoubleKO, Draw }
    public sealed class RoundManager
    {
        public readonly int DurationSeconds, IntroFrames, IntermissionFrames;
        public RoundPhase Phase { get; private set; }
        public RoundReason Reason { get; private set; }
        public int RemainingFrames { get; private set; }
        public int RoundNumber { get; private set; } = 1;
        public int LeftWins { get; private set; }
        public int RightWins { get; private set; }
        public int Winner { get; private set; } = -1;
        public bool Perfect { get; private set; }
        public int SecondsLeft => (RemainingFrames + 59) / 60;
        int transitionFrames;

        public RoundManager(int seconds = 60, int introFrames = 90, int intermissionFrames = 150)
        {
            if (seconds < 60 || seconds > 99) throw new ArgumentOutOfRangeException(nameof(seconds));
            DurationSeconds = seconds; IntroFrames = introFrames; IntermissionFrames = intermissionFrames;
            StartRound();
        }
        void StartRound()
        {
            Phase = IntroFrames > 0 ? RoundPhase.Intro : RoundPhase.Fighting;
            transitionFrames = IntroFrames; RemainingFrames = DurationSeconds * 60;
            Reason = RoundReason.None; Perfect = false; Winner = -1;
        }

        // Returns true exactly when a new round begins; caller resets fighters then.
        public bool Tick(int leftHp, int rightHp, int leftMax, int rightMax)
        {
            if (Phase == RoundPhase.Complete) return false;
            if (Phase == RoundPhase.Intro)
            { if (--transitionFrames <= 0) Phase = RoundPhase.Fighting; return false; }
            if (Phase == RoundPhase.Intermission)
            {
                if (--transitionFrames > 0) return false;
                RoundNumber++; StartRound(); return true;
            }
            RemainingFrames = Math.Max(0, RemainingFrames - 1);
            if (leftHp > 0 && rightHp > 0 && RemainingFrames > 0) return false;
            if (leftHp <= 0 && rightHp <= 0) { Winner = -1; Reason = RoundReason.DoubleKO; }
            else if (leftHp <= 0 || rightHp <= 0) { Winner = leftHp > 0 ? 0 : 1; Reason = RoundReason.KO; }
            else
            {
                long leftRatio = (long)leftHp * rightMax, rightRatio = (long)rightHp * leftMax;
                Winner = leftRatio == rightRatio ? -1 : leftRatio > rightRatio ? 0 : 1;
                Reason = Winner < 0 ? RoundReason.Draw : RoundReason.Timeout;
            }
            if (Winner == 0) LeftWins++;
            if (Winner == 1) RightWins++;
            Perfect = Winner == 0 ? leftHp == leftMax : Winner == 1 && rightHp == rightMax;
            Phase = LeftWins == 2 || RightWins == 2 ? RoundPhase.Complete : RoundPhase.Intermission;
            transitionFrames = IntermissionFrames;
            return false;
        }
    }
}
