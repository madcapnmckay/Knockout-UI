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
        ITEMKEY = "ko_window_model"
    ;

    ko.addTemplate(
        "tmpl_ui_dialog",
        [
            "<div data-bind='UIDialog: {}'>",
                "<div>",
                    "<div data-bind='text: title'></div>",
                "</div>",
                "<div data-bind='template: { name: contents, data: model }'></div>",
                "<div data-bind='foreach: buttons'>",
                    "<div data-bind='UIButton: $data'></div>",
                "</div>",
            "</div>"
        ].join("")
    );

    ko.addTemplate(
        "tmpl_ui_button",
        [
            "<div data-bind='UIDialog: {}'>",
                "<div data-bind='UIHeader: {}'>",
                    "<div data-bind='text: title'></div>",
                "</div>",
                "<div data-bind='template: { name: contents, data: model }'></div>",
                "<div data-bind='foreach: buttons'>",
                    "<div data-bind='UIButton: $data'></div>",
                "</div>",
            "</div>"
        ].join("")
    );

    exports.defaults = exports.defaults || {};

    defaults = exports.defaults.dialog = {
        title: "Dialog",
        template:"tmpl_ui_dialog",
        width: 500,
        height: 350,
        appendTo: document.body,
        draggable: true,
        buttons: [
            { text: "Close", click: "close" }
        ],
        css: {
            dialog: "ui-dialog",
            contents: "ui-contents"
        }
    };

    exports.Dialog = core.Component.extend({
        init: function(config) {
            var self = this;
            if (!config.contents) {
                throw new Error("You must supply a contents template in the dialog options or set a default contents template");
            }
            core.extend(self, defaults, config);

            this.title = ko.observable(config.title);
            this.visible = config.visible;
            this.width = ko.observable(self.width);
            this.height = ko.observable(self.height);
            this.buttons = ko.observableArray(this._mapButtonActions(self.buttons));

            this.widthAttr = ko.computed(core.toDimensions(self.width));
            this.heightAttr = ko.computed(core.toDimensions(self.height));

            ko.applyBindingsExecuted(this._render, this);
        },
        toggle: function(visible) {
            this.visible.toggle(visible);
        },
        show: function() {
            this.toggle(true);
        },
        hide: function() {
            this.toggle(false);
        },
        _mapButtonActions: function(buttons) {
            var context = this;
            return buttons.map(function(button) {
                if (typeof button.click !== "function") {
                    button.click = context[button.click].bind(context);
                }
                return button;
            });
        },
        _render: function(viewModel) {
            this.model = this.model || viewModel;
            this.$dialog = this;
            ko.renderTemplate(this.template, this, { },
                this.appendTo.appendChild(document.createElement('div')), "replaceNode");
        }
    });

    ko.extenders.dialog = function(target, config) {
        config.visible = target;
        target.dialog = new exports.Dialog(config);
        return target;
    };

    ko.bindingHandlers.UIDialog = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            if (viewModel.draggable) {
                $(element).draggable();
            }
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            ko.proxyBinding.call(this, "update", element, allBindingsAccessor, viewModel, {
                visible: function() {
                    return viewModel.visible;
                },
                style: function() {
                    return {
                        width: viewModel.widthAttr,
                        height: viewModel.heightAttr
                    };
                }
            });
        }
    };

    ko.bindingHandlers.UIButton = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
            ko.proxyBinding.call(this, "init", element, allBindingsAccessor, viewModel, {
                event: function() {
                    return {
                        click: viewModel.click
                    };
                }
            });
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
             ko.proxyBinding.call(this, "update", element, allBindingsAccessor, viewModel, {
                text: function() {
                    return viewModel.text;
                }
            });
        }
    };

}));