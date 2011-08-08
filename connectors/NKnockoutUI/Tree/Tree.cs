using System;
using System.Collections.Generic;
using NKnockoutUI.ContextMenu;

namespace NKnockoutUI.Tree
{
    public class Tree
    {
        protected Handlers handlers;

        public string Id { get; set; }
        public bool? Remember { get; set; }
        public IList<Node> Children { get; protected set; }

        public Handlers Handlers { get; set; }
        public object Defaults { get; set; }

        public ContextMenuGroup ContextMenu { get; set; }

        public Tree()
        {
            Id = Guid.NewGuid().ToString();
            Children = new List<Node>();
        }
    }
}
