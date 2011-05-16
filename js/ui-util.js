/*global window, $, ko */
ko.bindingHandlers.hover = {
	'init': function (element, valueAccessor, allBindingsAccessor, viewModel) {
		var $element = $(element),
			value = ko.utils.unwrapObservable(valueAccessor());

		if (typeof(value) === 'string') {
			$element.hover(
				function () { 
					$(this).addClass(value);
				},
				function () {
					$(this).removeClass(value);
				}
			);
		} else {
			$element.hover(
				function () {
					if (value.over !== undefined) {
						value.over();
					}
				}, 
				function () { 
					if (value.out !== undefined) {
						value.out();
					}
				}
			);
		}
	}
};

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