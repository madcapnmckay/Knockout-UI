namespace NKnockoutUI.ContextMenu
{
    public class ContextMenuSeparator : IContextMenuItem
    {
        public bool Separator { get; protected set; }
        public ContextMenuSeparator()
        {
            Separator = true;
        }
    }
}
