using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Newtonsoft.Json;

namespace NKnockoutUI.ContextMenu
{
    public class ContextMenuGroup
    {
        public string CssClass { get; set; }

        public IList<ContextMenu> ContextMenus { get; set; }
        [JsonProperty(PropertyName = "build")]
        public string BuildFunction { get; set; }

        public ContextMenuGroup(string buildFunction)
        {
            ContextMenus = new List<ContextMenu>();
            BuildFunction = buildFunction;
        }
    }
}
