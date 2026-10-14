using UnityEngine;

namespace NationClash
{
    public sealed class ArenaView
    {
        public readonly GameObject Root = new GameObject("Training Arena");
        public ArenaView()
        {
            RenderSettings.ambientLight = new Color(.45f, .53f, .65f);
            Cube("Platform", new Vector3(0, -.2f, 0), new Vector3(17, .4f, 6), new Color(.13f, .19f, .25f));
            Cube("Center line", new Vector3(0, .012f, 0), new Vector3(.06f, .018f, 5), new Color(.75f, .91f, .53f));
            for (int i = -7; i <= 7; i++)
                Cube("Floor stripe", new Vector3(i, .006f, 0), new Vector3(.018f, .01f, 6), new Color(.2f, .29f, .36f));
            for (int i = 0; i < 12; i++)
                Cube("Arena pillar", new Vector3(-11 + i * 2, 1.5f + i % 3, 5),
                    new Vector3(.8f, 3 + (i % 3) * 2, .8f), new Color(.1f, .15f, .22f));
            var light = new GameObject("Arena Light"); light.transform.SetParent(Root.transform);
            var component = light.AddComponent<Light>(); component.type = LightType.Directional; component.intensity = 1.2f;
            light.transform.rotation = Quaternion.Euler(45, -35, 0);
        }
        void Cube(string name, Vector3 position, Vector3 scale, Color color)
        {
            var obj = GameObject.CreatePrimitive(PrimitiveType.Cube); obj.name = name;
            obj.transform.SetParent(Root.transform); obj.transform.position = position; obj.transform.localScale = scale;
            var material = PrototypeMaterials.Create(color);
            obj.GetComponent<Renderer>().sharedMaterial = material;
        }
        public void Dispose()
        {
            foreach (var renderer in Root.GetComponentsInChildren<Renderer>()) Object.Destroy(renderer.sharedMaterial);
            Object.Destroy(Root);
        }
    }
}
