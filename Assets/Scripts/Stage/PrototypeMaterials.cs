using UnityEngine;

namespace NationClash
{
    public static class PrototypeMaterials
    {
        public static Material Create(Color color)
        {
            // A Resources material retains its shader in player builds.
            var template = Resources.Load<Material>("NationClash/PrototypeMaterial");
            var shader = Shader.Find("Standard");
            if (template == null && shader == null)
                throw new System.InvalidOperationException("Run NationClash > Prepare prototype to include the prototype material.");
            var material = template != null ? Object.Instantiate(template) : new Material(shader);
            material.color = color; return material;
        }
    }
}
