using UnityEngine;

namespace NationClash
{
    public sealed class NationClashBootstrap : MonoBehaviour
    {
        CharacterData[] roster;
        CombatWorld world;
        FighterView leftView, rightView;
        ArenaView arena;
        Camera cameraView;
        readonly PlayerInputSource leftInput = new PlayerInputSource(0), rightInput = new PlayerInputSource(1);
        int leftChoice, rightChoice = 1, touchPlayer;
        bool showRoster = true, paused, showTouch = true;
        float accumulator;
        Vector2 rosterScroll;
        string error, filter = "", region = "All regions";
        string[] regions;
        GUIStyle title, text, small, large;
        readonly Rect[] touchRects =
        {
            new Rect(40, 782, 72, 70), new Rect(119, 782, 72, 70), new Rect(201, 782, 90, 70),
            new Rect(300, 782, 84, 70), new Rect(393, 782, 84, 70), new Rect(672, 782, 108, 70),
            new Rect(790, 782, 108, 70), new Rect(908, 782, 108, 70), new Rect(1026, 782, 120, 70),
            new Rect(1156, 782, 108, 70), new Rect(1274, 782, 160, 70)
        };
        readonly string[] touchLabels = { "LEFT", "RIGHT", "BLOCK", "LOW", "JUMP", "LIGHT", "HEAVY", "SPECIAL", "BREAK", "THROW", "ULTIMATE" };

        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.AfterSceneLoad)]
        static void EnsureBootstrap()
        {
            if (Object.FindObjectOfType<NationClashBootstrap>() == null)
                new GameObject("NationClash").AddComponent<NationClashBootstrap>();
        }
        void Start()
        {
            Application.targetFrameRate = 60;
            try
            {
                roster = CharacterCatalog.Load();
                rightChoice = roster.Length > 1 ? 1 : 0;
                var groups = new System.Collections.Generic.SortedSet<string>();
                foreach (var character in roster) groups.Add(character.region ?? "Other");
                var list = new System.Collections.Generic.List<string> { "All regions" }; list.AddRange(groups); regions = list.ToArray();
                var obj = new GameObject("Arena Camera"); cameraView = obj.AddComponent<Camera>(); cameraView.tag = "MainCamera";
                cameraView.transform.position = new Vector3(0, 4, -14);
                cameraView.transform.LookAt(new Vector3(0, 1, 0));
                cameraView.orthographic = true; cameraView.orthographicSize = 4.4f;
                cameraView.clearFlags = CameraClearFlags.SolidColor; cameraView.backgroundColor = new Color(.025f, .05f, .09f);
                arena = new ArenaView();
            }
            catch (System.Exception exception) { error = exception.Message; Debug.LogException(exception); }
        }
        void StartMatch()
        {
            leftView?.Dispose(); rightView?.Dispose();
            world = new CombatWorld(roster[leftChoice], roster[rightChoice]);
            leftView = new FighterView(world.Left, "Player 1"); rightView = new FighterView(world.Right, "Player 2");
            leftInput.Clear(); rightInput.Clear(); accumulator = 0; paused = false; showRoster = false;
        }
        void Update()
        {
            if (error != null || world == null || showRoster) return;
            if (Input.GetKeyDown(KeyCode.Escape)) { paused = !paused; leftInput.Clear(); rightInput.Clear(); accumulator = 0; }
            if (paused) return;
            leftInput.Sample(touchRects, showTouch && touchPlayer == 0);
            rightInput.Sample(touchRects, showTouch && touchPlayer == 1);
            accumulator += Mathf.Min(Time.unscaledDeltaTime, .1f);
            while (accumulator >= 1f / CombatWorld.TickRate)
            {
                world.Tick(leftInput.Consume(), rightInput.Consume()); accumulator -= 1f / CombatWorld.TickRate;
            }
            leftView.Render(world.Left); rightView.Render(world.Right);
            float midpoint = (world.Left.X + world.Right.X) / 2;
            cameraView.transform.position = new Vector3(Mathf.Lerp(cameraView.transform.position.x, midpoint * .25f, Time.unscaledDeltaTime * 4), 4, -14);
            cameraView.orthographicSize = Mathf.Max(4.4f, Mathf.Abs(world.Left.X - world.Right.X) * .42f);
        }

        void Styles()
        {
            if (title != null) return;
            title = new GUIStyle(GUI.skin.label) { fontSize = 44, fontStyle = FontStyle.Bold };
            title.normal.textColor = new Color(.85f, .97f, .65f);
            text = new GUIStyle(GUI.skin.label) { fontSize = 22, wordWrap = true };
            small = new GUIStyle(text) { fontSize = 16 };
            large = new GUIStyle(title) { fontSize = 64, alignment = TextAnchor.MiddleCenter };
            GUI.skin.button.fontSize = 18; GUI.skin.button.padding = new RectOffset(12, 12, 12, 12);
            GUI.skin.textField.fontSize = 20;
        }
        void OnGUI()
        {
            GUI.matrix = Matrix4x4.TRS(Vector3.zero, Quaternion.identity, new Vector3(Screen.width / 1600f, Screen.height / 900f, 1));
            Styles();
            if (error != null) { GUI.Label(new Rect(60, 60, 1480, 200), "SETUP ERROR\n" + error, text); return; }
            if (roster == null) return;
            if (showRoster) { SelectScreen(); return; }
            Hud();
            if (paused || world.Rounds.Phase == RoundPhase.Complete)
            {
                Panel(new Rect(420, 245, 760, 350), new Color(.03f, .06f, .1f, .97f));
                string message = paused ? "PAUSED" : (world.Rounds.Winner == 0 ? world.Left.Data.country : world.Right.Data.country) + " WINS";
                GUI.Label(new Rect(440, 275, 720, 90), message, large);
                if (!paused) GUI.Label(new Rect(485, 380, 630, 70),
                    (world.Rounds.Winner == 0 ? world.Left.Data : world.Right.Data).victoryLine, text);
                if (GUI.Button(new Rect(455, 500, 210, 60), paused ? "RESUME" : "REMATCH"))
                { if (paused) paused = false; else StartMatch(); }
                if (GUI.Button(new Rect(685, 500, 250, 60), "CHOOSE FIGHTERS")) { showRoster = true; paused = false; }
                if (GUI.Button(new Rect(955, 500, 185, 60), "QUIT")) Application.Quit();
                return;
            }
            if (showTouch)
            {
                GUI.Label(new Rect(40, 744, 440, 30), "TOUCH CONTROLS · PLAYER " + (touchPlayer + 1), small);
                for (int i = 0; i < touchRects.Length; i++)
                {
                    // Multitouch is read in Sample; IMGUI buttons additionally support mouse attack taps.
                    if (GUI.Button(touchRects[i], touchLabels[i]) && Input.touchCount == 0)
                        (touchPlayer == 0 ? leftInput : rightInput).TouchPress(i);
                }
            }
        }
        void SelectScreen()
        {
            Panel(new Rect(0, 0, 1600, 900), new Color(.025f, .05f, .09f));
            GUI.Label(new Rect(60, 36, 1000, 70), "NATIONCLASH", title);
            GUI.Label(new Rect(63, 107, 1400, 50), "ONE WORLD. TWO FIGHTERS. YOUR NEXT ROUND.", text);
            GUI.Label(new Rect(60, 160, 1440, 40), CharacterCatalog.UsesTrainingRoster ?
                "PHASE 1 · TWO TRAINING FIGHTERS · ORIGINAL PLACEHOLDER RIGS" : "PHASE 1 · DATA-DRIVEN ROSTER", small);
            filter = GUI.TextField(new Rect(60, 215, 520, 45), filter);
            int selectedRegion = System.Array.IndexOf(regions, region);
            if (GUI.Button(new Rect(605, 215, 335, 45), region)) region = regions[(selectedRegion + 1) % regions.Length];
            if (GUI.Button(new Rect(1010, 215, 240, 45), "P1: " + roster[leftChoice].country)) touchPlayer = 0;
            if (GUI.Button(new Rect(1270, 215, 260, 45), "P2: " + roster[rightChoice].country)) touchPlayer = 1;
            int visible = 0;
            foreach (var c in roster) if (Matches(c)) visible++;
            rosterScroll = GUI.BeginScrollView(new Rect(60, 285, 1480, 385), rosterScroll,
                new Rect(0, 0, 1425, Mathf.Max(375, ((visible + 3) / 4) * 180)));
            int index = 0;
            for (int i = 0; i < roster.Length; i++)
            {
                var c = roster[i]; if (!Matches(c)) continue;
                Rect card = new Rect((index % 4) * 356, (index / 4) * 180, 338, 164); index++;
                ColorUtility.TryParseHtmlString(c.palette[0], out Color color); Panel(card, color * .45f);
                // Portrait is an original abstract silhouette, never a copied character render.
                GUI.Label(new Rect(card.x + 16, card.y + 8, 302, 35), c.country.ToUpperInvariant(), text);
                Panel(new Rect(card.x + 18, card.y + 53, 23, 23), new Color(.94f, .93f, .83f));
                Panel(new Rect(card.x + 12, card.y + 78, 36, 23), color);
                GUI.Label(new Rect(card.x + 61, card.y + 47, 261, 55), c.displayName + "\n" + c.archetype + " · " + c.hp + " HP", small);
                if (GUI.Button(new Rect(card.x + 16, card.y + 112, 144, 38), leftChoice == i ? "P1 SELECTED" : "PLAYER 1")) leftChoice = i;
                if (GUI.Button(new Rect(card.x + 177, card.y + 112, 144, 38), rightChoice == i ? "P2 SELECTED" : "PLAYER 2")) rightChoice = i;
            }
            GUI.EndScrollView();
            GUI.Label(new Rect(60, 696, 1480, 40), "P1  A/D move · W jump · S low · F block · J/K/L light/heavy/special · U guard break · I throw · O ultimate", small);
            GUI.Label(new Rect(60, 732, 1480, 40), "P2  arrows move/jump/low · right Ctrl block · numpad 1–6 attacks · Shift dash · Esc pause", small);
            GUI.Label(new Rect(60, 772, 1000, 50), "Local 2-player prototype. AI and online play belong to later phases.", small);
            if (GUI.Button(new Rect(1170, 773, 350, 70), "ENTER THE ARENA")) StartMatch();
        }
        bool Matches(CharacterData c) => (region == "All regions" || (c.region ?? "Other") == region) &&
            (string.IsNullOrEmpty(filter) || c.country.IndexOf(filter, System.StringComparison.OrdinalIgnoreCase) >= 0 ||
             c.displayName.IndexOf(filter, System.StringComparison.OrdinalIgnoreCase) >= 0);

        void Hud()
        {
            Panel(new Rect(0, 0, 1600, 160), new Color(.025f, .05f, .09f, .95f));
            Health(world.Left, new Rect(50, 55, 600, 26), false);
            Health(world.Right, new Rect(950, 55, 600, 26), true);
            GUI.Label(new Rect(50, 17, 600, 36), world.Left.Data.country + " / " + world.Left.Data.displayName, text);
            GUI.Label(new Rect(950, 17, 600, 36), world.Right.Data.country + " / " + world.Right.Data.displayName, text);
            GUI.Label(new Rect(690, 8, 220, 90), world.Rounds.SecondsLeft.ToString("00"), large);
            GUI.Label(new Rect(692, 100, 240, 36), "ROUND " + world.Rounds.RoundNumber, text);
            GUI.Label(new Rect(50, 124, 600, 32), "ROUNDS " + world.Rounds.LeftWins + " / 2", small);
            GUI.Label(new Rect(950, 124, 600, 32), "ROUNDS " + world.Rounds.RightWins + " / 2", small);
            string center = world.Rounds.Phase == RoundPhase.Intro ? "GET READY" :
                world.Rounds.Phase == RoundPhase.Intermission ? world.LastEvent :
                world.Frame - world.LastEventFrame < 55 ? world.LastEvent : "";
            GUI.Label(new Rect(300, 180, 1000, 100), center, large);
            GUI.Label(new Rect(40, 657, 1400, 35), world.Left.Data.stage.name.ToUpperInvariant() + " · TRAINING ARENA", small);
            if (GUI.Button(new Rect(40, 701, 190, 38), "TOUCH P" + (touchPlayer + 1))) touchPlayer = 1 - touchPlayer;
            if (GUI.Button(new Rect(245, 701, 200, 38), showTouch ? "HIDE TOUCH" : "SHOW TOUCH")) showTouch = !showTouch;
            if (GUI.Button(new Rect(1410, 701, 140, 38), "PAUSE")) paused = true;
        }
        void Health(Fighter fighter, Rect rect, bool reverse)
        {
            Panel(rect, new Color(.18f, .23f, .3f));
            float width = rect.width * fighter.Hp / fighter.Data.hp;
            Panel(new Rect(reverse ? rect.xMax - width : rect.x, rect.y, width, rect.height), new Color(.76f, .93f, .51f));
            Rect meter = new Rect(rect.x, rect.y + 38, rect.width, 8);
            Panel(meter, new Color(.15f, .23f, .31f));
            Panel(new Rect(meter.x, meter.y, meter.width * fighter.Meter.Value / 100, meter.height), new Color(.28f, .76f, .97f));
            GUI.Label(new Rect(rect.x, rect.y + 12, rect.width, 30), fighter.Hp + " HP  /  METER " + (int)fighter.Meter.Value + "%", small);
        }
        static void Panel(Rect rect, Color color)
        { Color previous = GUI.color; GUI.color = color; GUI.DrawTexture(rect, Texture2D.whiteTexture); GUI.color = previous; }
        void OnDestroy()
        { leftView?.Dispose(); rightView?.Dispose(); arena?.Dispose(); if (cameraView != null) Object.Destroy(cameraView.gameObject); }
    }
}
