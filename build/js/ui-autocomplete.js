/*!
 * Knockout-UI v0.5.0
 * A home for rich UI components based on KnockoutJS
 * Copyright (c) 2013 Ian Mckay
 * https://github.com/madcapnmckay/Knockout-UI.git
 * License: MIT (http://opensource.org/licenses/mit-license.php)
**/
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