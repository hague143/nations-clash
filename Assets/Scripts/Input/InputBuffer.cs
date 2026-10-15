using System.Collections.Generic;

namespace NationClash
{
    public enum Command { None, Light, Heavy, Special, GuardBreak, Throw, Ultimate, Jump, Dash }
    public struct InputState
    {
        public int Horizontal;
        public bool Down, Block;
        public Command Action;
        public InputState(int horizontal = 0, bool down = false, bool block = false, Command action = Command.None)
        { Horizontal = horizontal; Down = down; Block = block; Action = action; }
    }

    public struct BufferedInput
    {
        public Command Action;
        public int Frame, Horizontal;
        public bool Down;
        public BufferedInput(InputState input, int frame)
        { Action = input.Action; Frame = frame; Horizontal = input.Horizontal; Down = input.Down; }
    }

    public sealed class InputBuffer
    {
        public const int WindowFrames = 8;
        readonly Queue<BufferedInput> queue = new Queue<BufferedInput>();
        public int Count => queue.Count;

        public void Push(InputState input, int frame)
        {
            Expire(frame);
            if (input.Action == Command.None) return;
            // Bounded even when callers enqueue multiple events within a simulation tick.
            if (queue.Count == 16) queue.Dequeue();
            queue.Enqueue(new BufferedInput(input, frame));
        }

        public void Expire(int frame)
        {
            while (queue.Count > 0 && frame - queue.Peek().Frame >= WindowFrames) queue.Dequeue();
        }
        public bool Peek(int frame, out BufferedInput input)
        {
            Expire(frame);
            input = queue.Count > 0 ? queue.Peek() : default;
            return queue.Count > 0;
        }
        public BufferedInput Pop() => queue.Dequeue();
        public void Clear() => queue.Clear();
    }
}
