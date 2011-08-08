using System.Collections.Generic;
using Newtonsoft.Json;

namespace NKnockoutUI.Tabs
{
    public class TabGroup
    {
        public string Id { get; set; }
        public bool? Remember { get; set; }
        [JsonProperty(PropertyName = "tabs")]
        public IList<Tab> Members { get; protected set; }

        public void Add(Tab tab)
        {
            Members.Add(tab);
        }

        public TabGroup(string id)
        {
            Id = id;
            Members = new List<Tab>();
        }
    }
}
