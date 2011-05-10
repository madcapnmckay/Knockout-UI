/*global window, $, ko */
$.maxZIndex = $.fn.maxZIndex = function (opt) {
	/// <summary>
    /// Returns the max zOrder in the document (no parameter)
    /// Sets max zOrder by passing a non-zero number
    /// which gets added to the highest zOrder.
    /// </summary>    
    /// <param name="opt" type="object">
    /// inc: increment value, 
    /// group: selector for zIndex elements to find max for
    /// </param>
    /// <returns type="jQuery" />
    var def = { inc: 10, group: "*" },
		zmax = 0;
    $.extend(def, opt);
    $(def.group).each(function (index, el) {
        var cur = parseInt(Number($(el).css('z-index')), 10);
        zmax = cur > zmax ? cur : zmax;
    });
    if (!this.jquery) {
        return zmax;
	}
    return this.each(function () {
        zmax += def.inc;
        $(this).css("z-index", zmax);
    });
};