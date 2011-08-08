using System.Collections.Generic;
using Newtonsoft.Json;

namespace NKnockoutUI.Window
{
    public class Window
    {
        public Window()
        {
            Buttons = new List<Button>();
        }

        public string Id { get; set; }
        public string Name { get; set; }

        public object Contents { get; set; }

        public string CssClass { get; set; }
        public string TaskbarCssClass { get; set; }
        
        public int? Width { get; set; }
        public int? Height { get; set; }

        [JsonIgnore]
        public int X { get; set; }

        [JsonIgnore]
        public int Y { get; set; }

        public string Position
        {
            get { return string.Format("{0},{1}", X, Y); }
        }

        public bool? IsMinimized { get; set; }
        public bool? IsPinned { get; set; }

        /// <summary>
        /// An array of button objects that appear along the top edge of the window
        /// </summary>
        public IList<Button> Buttons { get; protected set; }
        
        /// <summary>
        /// This should be the name of function to call to create the window
        /// </summary>
        [JsonProperty(PropertyName = "create")]
        public string CreateFunction { get; set; }
    }
}
