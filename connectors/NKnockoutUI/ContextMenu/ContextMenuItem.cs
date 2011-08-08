using System.Collections.Generic;
using Newtonsoft.Json;

namespace NKnockoutUI.ContextMenu
{
    public class ContextMenuItem : IContextMenuItem
    {
        public string Text { get; set; }
        [JsonProperty(PropertyName = "run")]
        public string RunFunction { get; set; }
        public string IconCssClass { get; set; }
        public SubContextMenu Items { get; set; }
    }
}
