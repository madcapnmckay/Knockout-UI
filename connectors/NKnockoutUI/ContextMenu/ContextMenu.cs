using System.Collections.Generic;

namespace NKnockoutUI.ContextMenu
{
    public class ContextMenu
    {
        public string Name { get; set; }
        public int? Width { get; set; }

        public IList<IContextMenuItem> Items { get; protected set; }

        public ContextMenu(string name, int width)
        {
            Name = name;
            Width = width;
            Items = new List<IContextMenuItem>();
        }

        public ContextMenu Item(string text, string runFunction)
        {
            Items.Add(new ContextMenuItem { Text = text, RunFunction = runFunction });
            return this;
        }

        public ContextMenu Item(string text, string iconCssClass, string runFunction)
        {
            Items.Add(new ContextMenuItem { Text = text, RunFunction = runFunction, IconCssClass = iconCssClass});
            return this;
        }

        public ContextMenu Item(string text, SubContextMenu subContextMenu)
        {
            Items.Add(new ContextMenuItem { Text = text, Items = subContextMenu});
            return this;
        }

        public ContextMenu Separator()
        {
            Items.Add(new ContextMenuSeparator());
            return this;
        }
    }
}
