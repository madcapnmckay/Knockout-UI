/*!
 * Knockout-UI v0.5.0
 * A home for rich UI components based on KnockoutJS
 * Copyright (c) 2013 Ian Mckay
 * https://github.com/madcapnmckay/Knockout-UI.git
 * License: MIT (http://opensource.org/licenses/mit-license.php)
**/
(function(factory) {

    //CommonJS
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        factory(require("knockout"), require("jquery"), require("ui-core"), exports);
    //AMD
    } else if (typeof define === "function" && define.amd) {
        define(["knockout", "jquery", "ui-core", "exports"], factory);
    //normal script tag
    } else {
        factory(ko, $, ko.ui.core, ko.ui);
    }
}(function(ko, $, core, exports) {
    "use strict";

    var defaults,
        ITEMKEY = "ko_dropdown_model"
    ;

    ko.addTemplate(
        "tmpl_ui_dropdown",
        [
            "<div class='ui-dropdown'>",
                "<input type='text' data-bind='UIDropdownInput: {}' />",
                "<a tabindex='-1' data-bind='UIDropdownButton : {}'>+</a>",
            "</div>"
        ].join("")
    );

    exports.defaults = exports.defaults || {};

    defaults = exports.defaults.dropdown = {
        template:"tmpl_ui_dropdown",
        css: {
            container: "ui-dropdown",
            button: "ui-button",
            searching: "ui-searching"
        },
        autocomplete: {
            minLength: 2/*,
            position: { my: "right top", at: "right bottom", offset: '0 -1' }*/
        }
    };

    exports.Dropdown = core.Component.extend({
        init: function(config) {
            var self = this;

            this.options = core.extend({}, defaults, config.options);
            this.data = ko.isObservable(config.data) ?
                    config.data : ko.observableArray(config.data || []);
            this.value = ko.observable();
            this.label = ko.observable();

            this.optionsText = config.optionsText;
            this.optionsValue = config.optionsValue;
            this.optionsCaption = config.optionsCaption;

            this.mapped = ko.computed(function() {
                return ko.utils.arrayMap(core.unwrap(self.data), self.mapDataItem.bind(self));
            });
            this.autocompleteOptions = this._getAutocompleteOptions();
        },
        mapDataItem: function(item) {
            var labelText = this.optionsText,
                valueText = this.optionsValue
            ;
            if (typeof item === "string" || typeof item === "number") {
                return item;
            }
            var result = {};
            if (labelText) {
                result.label = item[labelText];
            }
            if (valueText) {
                result.value = item[valueText];
            }
            return result;
        },
        _getAutocompleteOptions: function() {
            var model = this,
                source
            ;
            source =
                // allow a source override
                this.options.autocomplete.source ||

                // default source matcher
                function(request, response) {
                    var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");
                    response(ko.utils.arrayMap(ko.utils.arrayFilter(core.unwrap(model.mapped),
                            function (item) {
                                return item.label && (!request.term || matcher.test(item.label));
                            }),
                            function (item) {
                                return {
                                    label: request.term ? item.label.replace(new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + $.ui.autocomplete.escapeRegex(request.term) + ")(?![^<>]*>)(?![^&;]+;)", "gi"), "<strong>$1</strong>") : item.label,
                                    rawLabel: item.label,
                                    value: item.value
                                };
                            })
                    );
                };

            return core.extend({
                source: source,
                select: function(event, ui) {
                    model.value(ui.item.value);
                    event.preventDefault();
                },
                focus: function(event, ui) {
                    model.label(ui.item.rawLabel);
                    event.preventDefault();
                }
            },  defaults.autocomplete);
        },
        isAjax: function() {
            var source = this.options.autocomplete.source;
            return source && typeof source === "string";
        },
        push: function(value) {
            this.data.push(value);
        }
    });

    /*
    * 3 Modes of operation
    * - No backing viewModel array, use data from select
    *       data-bind="uiDropdown: {}"
    * - Exact same params as options
    *       data-bind="uiDropdown: someArray, optionsCaption, optionsText, optionsValue"
    * - Dropdown model passed in
    *       data-bind="uiDropdown: aUiDropDownModel, optionsCaption, optionsText, optionsValue"
    */
    ko.bindingHandlers.dropdown = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var model = valueAccessor(),
                $select = $(element),
                bindings = allBindingsAccessor(),
                value = bindings.value,
                container
            ;
            if (!(model instanceof exports.Dropdown)) {
                // determine the mode
                if (core.isArray(core.unwrap(model))) {
                    // mode 2
                    model = new exports.Dropdown({
                        data: model,
                        optionsText: bindings.optionsText,
                        optionsValue: bindings.optionsValue,
                        optionsCaptions: bindings.optionsCaption
                    });
                } else {
                    // mode 1
                    model = new exports.Dropdown({
                        data: $select.children("option").
                            map(function () {
                                return { label: this.text, value: this.value };
                            }),
                        optionsText: "label",
                        optionsValue: "value"
                    });
                }
            }
            // else mode 3
            model.value = value || model.value;

            ko.utils.domData.set(element, ITEMKEY, model);
            ko.renderTemplate(model.options.template,
                model, { }, element.parentNode.insertBefore(document.createElement('div'), element.nextSibling), "replaceNode");

            return { controlsDescendantBindings: true };
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {

            var model = ko.utils.domData.get(element, ITEMKEY),
                optionsValues, newAllBindings
            ;

            // if data is supplied then apply the options binding
            // else we must be using a source url for ajax autocomplete
            if (!model.isAjax()) {
                optionsValues = function() {
                    return model.data;
                };
                newAllBindings = function() {
                    return  {
                        optionsText: model.optionsText,
                        optionsValue: model.optionsValue,
                        optionsCaption: model.optionsCaption
                    };
                };
                if (model.value) {
                    newAllBindings.value = model.value;
                }
                // bind the regular options binding
                ko.bindingHandlers.options.update(element, optionsValues, newAllBindings, viewModel);
            }
        }
    };

    ko.bindingHandlers.UIDropdownInput = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var model = viewModel,
                value = model.value,
                $element = $(element),
                autocomplete
            ;
            autocomplete = $element.
                autocomplete(model.autocompleteOptions).
                data("autocomplete");

            // allow html in the  rendered list
            autocomplete._renderItem = function(ul, item) {
                return $("<li></li>")
                    .data("item.autocomplete", item)
                    .append("<a>" + item.label + "</a>")
                    .appendTo(ul);
            };

            model.label.subscribe(function(newLabel) {
                $element.val(newLabel);
            });

            if (value && value.subscribe && !model.isAjax()) {
                value.subscribe(function(newValue) {
                    var result = newValue;
                    if (model.optionsText) {
                        // fine the matching object
                        var items = ko.utils.arrayFilter(core.unwrap(model.data), function(d) {
                            var itemValue = model.optionsValue ? d[model.optionsValue] : d;
                            return itemValue == newValue;
                        });
                        if (items.length) {
                            result = items[0][model.optionsText];
                        }
                    }
                    model.label(result);
                });
            }

            ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
                $(element).autocomplete("destroy");
            });
        }
    };

    ko.bindingHandlers.UIDropdownButton = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            var model = viewModel,
                $button = $(element),
                $container = $button.parents("." + model.options.css.container),
                $inputs = $container.find("input")
            ;

            ko.bindingHandlers["click"]["init"].call(this, element, function() {
                return function () {
                    $inputs.each(function(idx, el) {
                        var $input = $(el),
                            hasAuto = $input.data("autocomplete")
                        ;
                        if (hasAuto) {
                            if ($input.autocomplete("widget").is(":visible")) {
                                $input.blur();
                                return false;
                            }
                            $button.blur();
                            // pass empty string as value to search for, displaying all results
                            $input.
                                addClass(model.options.css.searching).
                                autocomplete("option", "minLength", 0).
                                autocomplete("search", "").
                                autocomplete("option", model.autocompleteOptions.minLength || 0);
                            $input.focus();
                        }
                    });
                };
            }, allBindingsAccessor, viewModel);
        }
    };

}));