using System.Collections.Generic;

namespace NKnockoutUI.ContextMenu
{
    public class SubContextMenu : List<IContextMenuItem>
    {
        public SubContextMenu Item(string text, string runFunction)
        {
            Add(new ContextMenuItem { Text = text, RunFunction = runFunction });
            return this;
        }

        public SubContextMenu Item(string text, string iconCssClass, string runFunction)
        {
            Add(new ContextMenuItem { Text = text, RunFunction = runFunction, IconCssClass = iconCssClass });
            return this;
        }

        public SubContextMenu Item(string text, SubContextMenu subContextMenu)
        {
            Add(new ContextMenuItem { Text = text, Items = subContextMenu });
            return this;
        }

        public SubContextMenu Separator()
        {
            Add(new ContextMenuSeparator());
            return this;
        }
    }
}
