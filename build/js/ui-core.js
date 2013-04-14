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
        factory(require("knockout"), require("jquery"), exports);
    //AMD
    } else if (typeof define === "function" && define.amd) {
        define(["knockout", "jquery", "exports"], factory);
    //normal script tag
    } else {
        ko.ui = "undefined" === typeof ko.ui ? { core: {} } : ko.ui;
        factory(ko, $, ko.ui.core);
    }
}(function(ko, $, exports) {
    "use strict";

	var initializing = false,
        fnTest,
        _init = function () { return this._super.apply(this, arguments); },
        _superMap = function (name, method, proto) {
            return function () {
              var tmp = this._super;
              this._super = proto[name] || _noop;
              var ret = method.apply(this, arguments);
              this._super = tmp;
              return ret;
            };
        },
        returnFalse = function() { return false; },
        returnTrue = function() { return true; },
        applyBindingsHandlers = [],
        oldApplyBindings = ko.applyBindings
	;

    if (/xyz/.test(function(){var xyz;})) {
        fnTest = /\b_super\b/;
    } else {
        fnTest = /.*/;
    }

	window.Class = function() {};
	Class.extend = function(prop) {
		var _super = this.prototype,
            prototype, Class = this
        ;
        initializing = true;
        prototype = new Class();
        initializing = false;
        prop.init = prop.init || _init;
        for (var name in prop) {
            prototype[name] = typeof prop[name] == "function" &&
                typeof _super[name] == "function" && fnTest.test(prop[name]) ?
                _superMap(name, prop[name], _super):
                prop[name];
        }
        function Base() {
            if ( !initializing && this.init )
                this.init.apply(this, arguments);
        }
        Base.prototype = prototype;
        Base.constructor = Base;
        Base.extend = Class.extend;
        return Base;
	};

	exports.NOOP = function() {};

	exports.extend = function(hasOptions, opt) {
        var options = hasOptions === true ? opt : {},
            sources = Array.prototype.slice.call(arguments, hasOptions === true ? 2 : 0),
            exclude = options.exlude || [],
            target = sources[0] || {}
        ;

        for (var i = 0, l = sources.length; i < l; i += 1) {
            var source = sources[i];
            for(var prop in source) {
                if(source.hasOwnProperty(prop) && exclude.indexOf(prop) === -1) {
                    target[prop] = source[prop];
                }
            }
        }
        return target;
    };

	// reusable classes
	exports.Component = Class.extend({
		init: function() {
			this.events = {};
		},
		subscribersTo:  function(eventName) {
            this.events[eventName] = this.events[eventName] || [];
            return this.events[eventName];
		},
        subscribe : function (eventName, handler) {
            var handlers = this.subscribersTo(eventName);
            if (handlers.indexOf(handler) === -1) {
                handlers.push(handler);
            }
        },
        unsubscribe : function (eventName, handler) {
            var handlers = this.subscribersTo(eventName),
                idx = handlers.indexOf(handler);
            if (idx > -1) {
                handlers.splice(idx, 1);
            }
        },
        notify : function(eventName, event) {
            var handlers = this.subscribersTo(eventName),
                handlerResult, result
            ;
            if (handlers) {
                for (var i = 0, len = handlers.length; i < len; i += 1) {

                    result = handlers[i].apply(this,
                        Array.prototype.slice.call(arguments, 1));

                    if (!result && typeof result !== "undefined") {
                        event.preventDefault();
                        event.stopPropogation();
                    }
                    event.result = event.result || result;
                    if (event.isImmediatePropogationStopped()) {
                        break;
                    }
                }
                return event.result;
            }
        }
	});

	exports.Event = Class.extend({
		init: function(def) {
			exports.extend(this, def);
		},
		preventDefault: function () {
			this.isDefaultPrevented = returnTrue;
		},
		stopPropogation: function () {
			this.isPropogationStopped = returnTrue;
		},
		stopImmediatePropogatipn: function () {
			this.isImmediatePropogationStopped = returnTrue;
		},
		isImmediatePropogationStopped: returnFalse,
		isPropogationStopped: returnFalse,
		isDefaultPrevented: returnFalse
	});

	exports.createEvent = function(def) {
		return new exports.Event(def);
	};

	exports.when = function(value) {
		return $.when(value);
	};

	// template sources
	ko.templateSources = ko.templateSources || {};
	ko.templateSources.stringTemplate = function(templateName, templates) {
        this.templateName = templateName;
        this.templates = templates;
        this._data = {};
	};
	ko.templateSources.stringTemplate.prototype = {
        data: function(key, value) {
            this.templates._data[this.templateName] = this.templates._data[this.templateName] || {};

            if (arguments.length === 1) {
                return this.templates._data[this.templateName][key];
            }

            this.templates._data[this.templateName][key] = value;
        },
        text: function(value) {
            if (arguments.length) {
                this.templates[this.templateName] = value;
            }
            return this.templates[this.templateName];
        }
	};

	ko.fallThroughTemplateEngine = function() {
		var engine = new ko.nativeTemplateEngine();

        engine.templates = {};

        engine.makeTemplateSource = function(template, templateDocument) {
            // named template
            if (typeof template == "string") {
                templateDocument = templateDocument || document;
                var elem = templateDocument.getElementById(template);
                if (elem) {
                    return new ko.templateSources.domElement(elem);
                }
                if (this.templates[template]) {
                    return new ko.templateSources.stringTemplate(template, this.templates);
                }
                throw new Error("Cannot find template with ID " + template);

            } else if ((template.nodeType == 1) || (template.nodeType == 8)) {
                // Anonymous template
                return new ko.templateSources.anonymousTemplate(template);
            } else {
                throw new Error("Unknown template type: " + template);
            }
        };

        engine.addTemplate = function(templateName, templateMarkup) {
			this.templates[templateName] = templateMarkup;
		};

        return engine;
	};

	exports.templateEngine = new ko.fallThroughTemplateEngine();

	ko.addTemplate = function(templateName, templateMarkup) {
		exports.templateEngine.addTemplate(templateName, templateMarkup);
	};

	ko.observable.fn.toggle = function(value) {
		this(typeof value === "undefined" ? !this() : value);
	};

    ko.setTemplateEngine(exports.templateEngine);

    exports.unwrap = ko.utils.unwrapObservable;

    exports.isArray = function(object) {
        return Object.prototype.toString.call(object) === '[object Array]';
    };

    exports.toDimensions = function(observable) {
        return function() {
            var value = ko.utils.unwrapObservable(observable);
            if (isNaN(value)) {
                return value;
            }
            return value + "px";
        };
    };

    ko.proxyBinding = function(method, element, allBindingsAccessor, viewModel, config) {
        for (var binding in config) {
            ko.bindingHandlers[binding][method].call(this, element, config[binding], allBindingsAccessor, viewModel);
        }
    };

    ko.applyBindingsExecuted = function(handler, context) {
        if (handler && typeof handler === "function") {
            applyBindingsHandlers.push({ handler: handler, context: context || this });
        }
    };

    // overwrite apply bindings to allow us to register completion handlers
    ko.applyBindings = function(viewModel, rootNode) {
        var handlersLength = applyBindingsHandlers.length,
            def, i
        ;
        oldApplyBindings(viewModel, rootNode);
        for (i = 0; i < handlersLength; i += 1) {
            def = applyBindingsHandlers.shift();
            def.handler.call(def.context, viewModel);
        }
    };

}));