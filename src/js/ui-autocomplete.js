/*global document, window, $, ko, debug, setTimeout, alert */
ko.bindingHandlers.autocomplete = {
    init: function (element, valueAccessor, allBindings, viewModel) {
        var $element = $(element),
			value = valueAccessor(),
            $config = typeof(value) === 'function' ? value() : value;

        $element.autocomplete($config);

        $config.search = function (term) {
            if ($element.autocomplete("widget").is(":visible")) {
                $element.autocomplete("close");
                return;
            }

            $element.addClass("searching");
            $element.autocomplete("search", term);
            $element.focus();
        };

        // allow override of render item
        if ($config.renderItem !== undefined) {
            $element.data("autocomplete")._renderItem = $config.renderItem;
        }

        $element.data("autocomplete")._resizeMenu = function () {
            var ul = this.menu.element;
            ul.outerWidth(this.element.outerWidth());
        };
    }
};