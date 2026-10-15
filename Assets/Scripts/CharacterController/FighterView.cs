using UnityEngine;

namespace NationClash
{
    public sealed class FighterView
    {
        public readonly GameObject Root;
        readonly Transform visual;
        readonly Animator animator;
        string state;
        int previousMoveFrame;
        public FighterView(Fighter fighter, string name)
        {
            Root = new GameObject(name);
            visual = new GameObject("Visual").transform; visual.SetParent(Root.transform, false);
            ColorUtility.TryParseHtmlString(fighter.Data.palette[0], out Color primary);
            ColorUtility.TryParseHtmlString(fighter.Data.palette[1], out Color secondary);
            Part("Torso", PrimitiveType.Capsule, new Vector3(0, 1.05f, 0), new Vector3(.55f, .45f, .4f), primary);
            Part("Head", PrimitiveType.Sphere, new Vector3(0, 1.85f, 0), Vector3.one * .4f, secondary);
            Part("ArmL", PrimitiveType.Capsule, new Vector3(-.4f, 1.15f, 0), new Vector3(.19f, .35f, .19f), secondary);
            Part("ArmR", PrimitiveType.Capsule, new Vector3(.4f, 1.15f, 0), new Vector3(.19f, .35f, .19f), primary);
            Part("LegL", PrimitiveType.Capsule, new Vector3(-.19f, .38f, 0), new Vector3(.23f, .36f, .23f), primary);
            Part("LegR", PrimitiveType.Capsule, new Vector3(.19f, .38f, 0), new Vector3(.23f, .36f, .23f), secondary);
            if (fighter.Profile.Name == "Weapon Duelist")
                Part("SportBaton", PrimitiveType.Cube, new Vector3(.64f, 1.32f, 0), new Vector3(.75f, .08f, .08f), secondary);
            animator = visual.gameObject.AddComponent<Animator>();
            animator.runtimeAnimatorController = Resources.Load<RuntimeAnimatorController>(
                "NationClash/Archetypes/" + fighter.Profile.AssetKey);
            animator.applyRootMotion = false;
        }
        void Part(string name, PrimitiveType shape, Vector3 position, Vector3 scale, Color color)
        {
            var part = GameObject.CreatePrimitive(shape); part.name = name;
            part.transform.SetParent(visual, false); part.transform.localPosition = position; part.transform.localScale = scale;
            Object.Destroy(part.GetComponent<Collider>());
            var material = PrototypeMaterials.Create(color);
            part.GetComponent<Renderer>().sharedMaterial = material;
        }
        public void Render(Fighter fighter)
        {
            Root.transform.position = new Vector3(fighter.X, fighter.Y, 0);
            visual.localScale = new Vector3(fighter.Facing, fighter.Input.Down && fighter.Grounded ? .7f : 1, 1);
            string next = fighter.Animation;
            if ((state != next || (fighter.Move != null && fighter.MoveFrame < previousMoveFrame)) && animator.runtimeAnimatorController != null)
            { animator.CrossFadeInFixedTime(next, .06f); state = next; }
            previousMoveFrame = fighter.MoveFrame;
        }
        public void Dispose()
        {
            foreach (var renderer in Root.GetComponentsInChildren<Renderer>()) Object.Destroy(renderer.sharedMaterial);
            Object.Destroy(Root);
        }
    }
}
