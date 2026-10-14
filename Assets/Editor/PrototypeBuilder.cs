using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEditor.Animations;
using UnityEditor.SceneManagement;
using UnityEngine;

namespace NationClash.Editor
{
    public static class PrototypeBuilder
    {
        const string Root = "Assets/Generated/Resources/NationClash";
        const string ScenePath = "Assets/Scenes/Generated/TrainingArena.unity";
        static readonly string[] States =
        { "Idle", "Walk", "Jump", "Dash", "Light1", "Light2", "Light3", "Heavy", "Special1", "Special2", "Ultimate", "Block", "HitReaction", "Throw", "ThrowTech", "KO" };

        [InitializeOnLoadMethod]
        static void OnEditorLoad()
        {
            if (Application.isBatchMode) return;
            EditorApplication.delayCall += () =>
            {
                if (!File.Exists(ScenePath) && !EditorApplication.isPlayingOrWillChangePlaymode)
                {
                    // Never replace a user's unsaved scene without the Editor's own save flow.
                    if (EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) Prepare();
                }
            };
        }

        [MenuItem("NationClash/Prepare prototype")]
        public static void Prepare()
        {
            if (!Application.isBatchMode && !EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo()) return;
            PackRoster();
            Directory.CreateDirectory(Root + "/Archetypes");
            Directory.CreateDirectory("Assets/Scenes/Generated"); AssetDatabase.Refresh();
            if (AssetDatabase.LoadAssetAtPath<Material>(Root + "/PrototypeMaterial.mat") == null)
                AssetDatabase.CreateAsset(new Material(Shader.Find("Standard")), Root + "/PrototypeMaterial.mat");
            foreach (string name in Archetypes.Names) PrepareArchetype(Archetypes.Get(name));
            // A generated scene contains only the bootstrap; runtime creates the arena and rig instances.
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);
            new GameObject("NationClash").AddComponent<NationClashBootstrap>();
            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
            PlayerSettings.companyName = "NationClash"; PlayerSettings.productName = "NationClash";
            PlayerSettings.defaultInterfaceOrientation = UIOrientation.LandscapeLeft;
            AssetDatabase.SaveAssets(); AssetDatabase.Refresh();
            Debug.Log("NationClash prepared: eight controllers and sixteen clips per controller. Open TrainingArena and press Play.");
        }

        static void PackRoster()
        {
            string source = "Assets/Characters/Data", destination = Root + "/Characters";
            var files = Directory.GetFiles(source, "*.json", SearchOption.TopDirectoryOnly).OrderBy(f => f).ToArray();
            var roster = files.Select(file => JsonUtility.FromJson<CharacterData>(File.ReadAllText(file))).ToArray();
            CharacterData.ValidateRoster(roster);
            Directory.CreateDirectory(destination);
            // Only this generated copy is refreshed; original country JSON remains untouched.
            foreach (string stale in Directory.GetFiles(destination, "*.json")) AssetDatabase.DeleteAsset(stale);
            foreach (string file in files) File.Copy(file, Path.Combine(destination, Path.GetFileName(file)), true);
        }

        static void PrepareArchetype(ArchetypeProfile profile)
        {
            string directory = Root + "/Archetypes/" + profile.AssetKey + "_Clips";
            Directory.CreateDirectory(directory); AssetDatabase.Refresh();
            string controllerPath = Root + "/Archetypes/" + profile.AssetKey + ".controller";
            var controller = AssetDatabase.LoadAssetAtPath<AnimatorController>(controllerPath) ??
                AnimatorController.CreateAnimatorControllerAtPath(controllerPath);
            var machine = controller.layers[0].stateMachine;
            foreach (string stateName in States)
            {
                string clipPath = directory + "/" + stateName + ".anim";
                var clip = AssetDatabase.LoadAssetAtPath<AnimationClip>(clipPath);
                bool isNew = clip == null;
                if (isNew) clip = new AnimationClip { name = stateName, frameRate = CombatWorld.TickRate };
                else clip.ClearCurves();
                float duration = Duration(profile, stateName);
                bool loop = stateName == "Idle" || stateName == "Walk" || stateName == "Block";
                var settings = AnimationUtility.GetAnimationClipSettings(clip); settings.loopTime = loop;
                AnimationUtility.SetAnimationClipSettings(clip, settings);
                float styleScale = profile.Name == "Trickster" ? 1.35f : profile.DefaultWeight == WeightClass.Heavy ? .7f : 1;
                float rightArm = stateName.StartsWith("Light", StringComparison.Ordinal) ? -70 :
                    stateName == "Heavy" ? -130 : stateName.StartsWith("Special", StringComparison.Ordinal) ? -100 :
                    stateName == "Ultimate" ? -160 : stateName == "Block" ? -50 : stateName == "Throw" ? -90 : 0;
                float leftArm = stateName == "Block" ? 50 : stateName == "Throw" ? 90 : -rightArm * .35f;
                Curve(clip, "ArmR", "localEulerAnglesRaw.z", 0, rightArm * styleScale, 0, duration, loop);
                Curve(clip, "ArmL", "localEulerAnglesRaw.z", 0, leftArm * styleScale, 0, duration, loop);
                Curve(clip, "Torso", "localEulerAnglesRaw.z", 0,
                    stateName == "KO" ? 85 : stateName == "HitReaction" ? 24 : stateName == "ThrowTech" ? -20 : 0,
                    stateName == "KO" ? 85 : 0, duration, false);
                if (stateName == "Walk" || stateName == "Dash")
                {
                    Curve(clip, "LegL", "localEulerAnglesRaw.z", -22, 22, -22, duration, true);
                    Curve(clip, "LegR", "localEulerAnglesRaw.z", 22, -22, 22, duration, true);
                }
                else
                {
                    Curve(clip, "LegL", "localEulerAnglesRaw.z", 0, stateName == "Light3" ? -65 : 0, 0, duration, false);
                    Curve(clip, "LegR", "localEulerAnglesRaw.z", 0, stateName == "Jump" ? 30 : 0, 0, duration, false);
                }
                if (isNew) AssetDatabase.CreateAsset(clip, clipPath); else EditorUtility.SetDirty(clip);
                var state = machine.states.Select(s => s.state).FirstOrDefault(s => s.name == stateName) ?? machine.AddState(stateName);
                state.motion = clip;
                if (stateName == "Idle") machine.defaultState = state;
            }
            EditorUtility.SetDirty(controller);
        }

        static void Curve(AnimationClip clip, string path, string property, float a, float b, float c, float duration, bool loop)
        {
            var curve = new AnimationCurve(new Keyframe(0, a), new Keyframe(duration * .4f, b), new Keyframe(duration, c));
            if (loop) curve.preWrapMode = curve.postWrapMode = WrapMode.Loop;
            clip.SetCurve(path, typeof(Transform), property, curve);
        }
        static float Duration(ArchetypeProfile p, string state)
        {
            var moves = new[] { p.Light1, p.Light2, p.Light3, p.Heavy, p.Special1, p.Special2, p.Throw, p.Ultimate };
            var move = moves.FirstOrDefault(m => m.Animation == state);
            return move != null ? move.TotalFrames / (float)CombatWorld.TickRate : .65f;
        }
    }
}
