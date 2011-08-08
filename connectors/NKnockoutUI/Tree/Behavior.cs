using Newtonsoft.Json;

namespace NKnockoutUI.Tree
{
    public class Behavior
    {
        public string Name { get; set; }
        public string ChildType { get; set; }
        public bool? IsDraggable { get; set; }
        public bool? IsDropTarget { get; set; }
        public bool? CanAddChildren { get; set; }
        public bool? RenameAfterAdd { get; set; }
        public string ConnectToSortable { get; set; }
        public object DragCursorAt { get; set; }
        public string DragCursor { get; set; }
        [JsonProperty(PropertyName = "~dragHelper")]
        public string DragHelper { get; set; } 
    }
}
