using System.Collections.Generic;

namespace NKnockoutUI.Tree
{
    public class Node
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Type { get; set; }
        public object Contents { get; set; }

        public string CssClass { get; set; }
        public bool? IsOpen { get; set; }

        public IList<Node> Children { get; protected set; }

        public Node()
        {
            Children = new List<Node>();
        }
    }
}
