using UnityEngine;

namespace NationClash
{
    // Render-frame edges are queued until consumed by a simulation tick.
    public sealed class PlayerInputSource
    {
        readonly int player;
        readonly System.Collections.Generic.Queue<Command> actions = new System.Collections.Generic.Queue<Command>();
        int horizontal;
        bool down, block;
        public PlayerInputSource(int playerIndex) { player = playerIndex; }
        void Add(Command command) { if (actions.Count < 16) actions.Enqueue(command); }

        public void Sample(Rect[] touchRects, bool enableTouch)
        {
            bool p1 = player == 0;
            KeyCode left = p1 ? KeyCode.A : KeyCode.LeftArrow, right = p1 ? KeyCode.D : KeyCode.RightArrow;
            horizontal = (Input.GetKey(right) ? 1 : 0) - (Input.GetKey(left) ? 1 : 0);
            down = Input.GetKey(p1 ? KeyCode.S : KeyCode.DownArrow);
            block = Input.GetKey(p1 ? KeyCode.F : KeyCode.RightControl);
            Edge(p1 ? KeyCode.J : KeyCode.Keypad1, Command.Light);
            Edge(p1 ? KeyCode.K : KeyCode.Keypad2, Command.Heavy);
            Edge(p1 ? KeyCode.L : KeyCode.Keypad3, Command.Special);
            Edge(p1 ? KeyCode.U : KeyCode.Keypad4, Command.GuardBreak);
            Edge(p1 ? KeyCode.I : KeyCode.Keypad5, Command.Throw);
            Edge(p1 ? KeyCode.O : KeyCode.Keypad6, Command.Ultimate);
            Edge(p1 ? KeyCode.W : KeyCode.UpArrow, Command.Jump);
            Edge(p1 ? KeyCode.LeftShift : KeyCode.RightShift, Command.Dash);
            if (!enableTouch || touchRects == null) return;
            if (Input.touchCount == 0 && Input.GetMouseButton(0))
            {
                Vector2 mouse = new Vector2(Input.mousePosition.x / Screen.width * 1600,
                    (Screen.height - Input.mousePosition.y) / Screen.height * 900);
                if (touchRects[0].Contains(mouse)) horizontal = -1;
                if (touchRects[1].Contains(mouse)) horizontal = 1;
                if (touchRects[2].Contains(mouse)) block = true;
                if (touchRects[3].Contains(mouse)) down = true;
            }
            foreach (var touch in Input.touches)
            {
                if (touch.phase == TouchPhase.Ended || touch.phase == TouchPhase.Canceled) continue;
                Vector2 point = new Vector2(touch.position.x / Screen.width * 1600,
                    (Screen.height - touch.position.y) / Screen.height * 900);
                for (int index = 0; index < touchRects.Length; index++)
                {
                    if (!touchRects[index].Contains(point)) continue;
                    if (index == 0) horizontal = -1;
                    else if (index == 1) horizontal = 1;
                    else if (index == 2) block = true;
                    else if (index == 3) down = true;
                    else if (touch.phase == TouchPhase.Began) Add(TouchCommand(index));
                }
            }
        }
        public void TouchPress(int index)
        {
            if (index >= 4) Add(TouchCommand(index));
        }
        static Command TouchCommand(int index)
        {
            switch (index)
            {
                case 4: return Command.Jump;
                case 5: return Command.Light;
                case 6: return Command.Heavy;
                case 7: return Command.Special;
                case 8: return Command.GuardBreak;
                case 9: return Command.Throw;
                case 10: return Command.Ultimate;
                default: return Command.None;
            }
        }
        public InputState Consume() => new InputState(horizontal, down, block,
            actions.Count > 0 ? actions.Dequeue() : Command.None);
        public void Clear() { actions.Clear(); horizontal = 0; down = block = false; }
        void Edge(KeyCode key, Command command) { if (Input.GetKeyDown(key)) Add(command); }
    }
}
