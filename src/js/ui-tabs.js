(function(factory) {

    //CommonJS
    if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        factory(require("knockout"), require("ui-core"), exports);
    //AMD
    } else if (typeof define === "function" && define.amd) {
        define(["knockout", "ui-core", "exports"], factory);
    //normal script tag
    } else {
		ko.ui = "undefined" === typeof ko.ui ? { core: {} } : ko.ui;
        factory(ko, ko.ui.core, ko.ui);
    }
}(function(ko, core, exports) {
    "use strict";

	ko.addTemplate(
		"tmpl_ui_tab_container",
		[
			"<div data-bind='attr: { class : defaults.css }' >",
				"<ul data-bind='foreach: tabs'>",
					"<li data-bind='click: $parent.show.bind($parent), css: { \"ui-tab-active\" : $parent.active() === $data }, class: css, text: name'></li>",
				"</ul>",
				"<div data-bind='foreach: tabs'>",
					"<div data-bind='visible: $parent.active() === $data, attr: { class: bodyCss }'>",
						"<div data-bind='template : { name: template, data: data }'></div>",
					"</div>",
				"</div>",
			"</div>"
		].join("")
	);

	exports.Tab = function(defaults, config) {
		var self = this;

		if (!config.template) {
			throw new Error("A template for the tab must be supplied");
		}

		core.extend(self, {
			data: self
		}, defaults, config);
	};

	exports.TabSet = function(config) {
		var self = this;

		this.foo = 'TabSet';

		this.defaults = {
			css : "ui-tabs",
			tab : {
				css: "ui-tab",
				bodyCss: "ui-tab-body"
			}
		};
		core.extend(true, { exclude : [ "tabs" ] }, self.defaults, config);
		config = core.extend({}, { tabs: [] }, config);

		var buttons = [];
		for (var i = 0, l = config.tabs.length; i < l; i += 1) {
			buttons.push(new exports.Tab(self.defaults.tab, config.tabs[i]));
		}

		this.tabs = ko.observableArray(buttons);
		this.active = ko.observable();

		// show defined tab
		if (this.tabs().length) {
			this.show(config.active || 0);
		}
	};
	exports.TabSet.prototype.show = function(tabOrIndex) {
		var tab = tabOrIndex instanceof exports.Tab ? tabOrIndex : this.get(tabOrIndex);
		if (!tab) {
			throw new Error("Show failed: method must be passed a tab index or a tab instance");
		}
		this.active(tab);
	},
	exports.TabSet.prototype.find = function(name) {
		return this.get(this.indexOf(name));
	};
	exports.TabSet.prototype.get = function(index) {
		if (index < 0 || index >= this.tabs().length) {
			return null;
		}
		return this.tabs()[index];
	};
	exports.TabSet.prototype.indexOf = function(name) {
		for (var i = 0, l = this.tabs().length; i < l; i += 1) {
			if (ko.utils.unwrapObservable(this.tabs()[i].name) === name) {
				return i;
			}
		}
		return -1;
	};
	exports.TabSet.prototype.add = function(config, index) {
		var tab = new exports.Tab(this.defaults.tab, config);
		if (arguments.length === 2) {
			this.tabs.splice(index, 0, tab);
		} else {
			this.tabs.push(tab);
		}
	};
	exports.TabSet.prototype.remove = function(name) {
		var idx = this.indexOf(name);
		if (idx >= 0) {
			this.tabs.splice(idx, 1);
		}
	};
	exports.TabSet.prototype.removeAt = function(index) {
		if (index < 0 || index >= this.tabs().length) {
			return;
		}
		this.tabs.splice(index, 1);
	};

	// The main tabs binding
    ko.bindingHandlers.tabs = {
		init: function() {
            return { 'controlsDescendantBindings': true };
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var value = ko.utils.unwrapObservable(valueAccessor());

			while(element.firstChild) {
                ko.removeNode(element.firstChild);
            }

			if (!(value instanceof exports.TabSet)) {
				throw new Error("The tabs binding requires an instance of ko.ui.TabSet viewModel");
			}
			ko.renderTemplate("tmpl_ui_tab_container", value, { }, element.appendChild(document.createElement('div')), "replaceNode");
        }
    };
}));