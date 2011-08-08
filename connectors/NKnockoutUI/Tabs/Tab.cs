using Newtonsoft.Json;

namespace NKnockoutUI.Tabs
{
    public class Tab
    {
        public string Name { get; set; }
        public string CssClass { get; set; }
        public string IconCssClass { get; set; }
        public string BodyCssClass { get; set; }

        public bool? IsActive { get; set; }

        public object Contents { get; set; }

        /// <summary>
        /// This should be the name of function to call to create the window
        /// </summary>
        [JsonProperty(PropertyName = "create")]
        public string CreateFunction { get; set; }
    }
}
