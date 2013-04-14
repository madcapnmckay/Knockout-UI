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
		ko.ui = "undefined" === typeof ko.ui ? { core: {} } : ko.ui;
        factory(ko, $, ko.ui.core, ko.ui);
    }
}(function(ko, $, core, exports) {
	"use strict";

	var defaults,
		ITEMKEY = "ko_dragItem"
	;

	ko.addTemplate(
		"tmpl_ui_tree_node",
		[
			"<li>",
				"<div data-bind='UITreeNode: $data'>",
					"<span data-bind='UITreeNodeHandle: {}'></span>",
					"<span data-bind='UITreeNodeIcon: {}'></span>",
					"<label data-bind='UITreeNodeLabel: {}'></label>",
					"<input type='text' data-bind='UITreeNodeTextBox: {}' />",
				"</div>",
				"<ul data-bind='template: { name: 'tmpl_ui_tree_node', foreach: nodes }, visible: open'></ul>",
			"</li>"
		].join("")
	);

	ko.addTemplate(
		"tmpl_ui_tree",
		"<ul data-bind='template: { name: 'tmpl_ui_tree_node', foreach: nodes }, attr: { class: options.css.tree }'></ul>"
	);

	exports.defaults = exports.defaults || {};

	defaults = exports.defaults.tree = {
		templates: {
			tree: "tmpl_ui_tree",
			node: "tmpl_ui_tree_node"
		},
		css: {
			tree: "ui-tree",
			icon: "ui-icon",
			handle: "ui-handle",
			emptyHandle: "ui-no-child",
			node: "ui-node",
			selected: "ui-selected",
			open: "open"
		},
		node: {
			indent: 16,
			title: "New Folder",
			childType: "folder",
			draggable: true,
			droppable: true
		},
		events: {
			click: "click",
			context: "context",
			dblClick: "dblClick",
			added: "added",
			toggle: "toggle",
			edit: "edit",
			renamed: "renamed",
			removed: "removed",
			moved: "moved"
		},
		draggable: {
			addClasses: false,
			appendTo: "body",
			revertDuration: 250,
			connectToSortable: false,
			dragCursorAt: { left: 28, bottom: 0 },
			dragCursor: "auto",
			distance: 10,
			zIndex: 200000,
			helper: function(event, element, css) {
				return $('<div></div>').addClass("drag-icon")
						.append($('<span></span>')
							.addClass(css));
			}
		},
		droppable: {
			addClasses: false,
			greedy: true,
			tolerance: "pointer",
			hoverClass: "ui-drop-target"
		}
	};

	exports.ANode = core.Component.extend({
		init: function(config) {
			var self = this, nodes = [], node,
				i, l = config.nodes ? config.nodes.length : 0
			;
			this._super(config);

			for (i = 0; i < l; i += 1) {
				node = new this.nodeType(
					core.extend(config.nodes[i],
						{
							options: this.options,
							parent: this
						}
					)
				);
				nodes.push(node);
			}
			this.nodes = ko.observableArray(nodes);
			// disconnected children length container to allow ajax expand
			this.children = ko.observable(!!(this.nodes().length || config.children));

			this.nodes.subscribe(function() {
				self.children(!!self.nodes().length);
			});

			this.parent = config.parent;
		},
		get: function(id, skipChildren, skipRecurse) {
			if (this.id === id) {
				return this;
			}
			if (skipChildren) {
				return null;
			}
			var result = null,
				count = this.nodes.length,
				i
			;
			for (i = 0; i < count; i += 1) {
				result = this.nodes[i].get(id, skipRecurse);
				if (result) {
					return result;
				}
			}
			return result;
		},
		notifySelfAndRoot: function(config) {
			var event = core.createEvent(config),
				result = this.notify(config.name, event)
			;
			if (!event.isPropogationStopped() && !result && this.root) {
				result = this.root.notify(config.name, event);
			}
			if (!event.isDefaultPrevented()) {
				return core.when(result);
			}
			return { then: core.NOOP };
		},
		add: function(nodeDefOrArray, edit) {
			var self = this;

			nodeDefOrArray = core.isArray(nodeDefOrArray) ?
					nodeDefOrArray : [ nodeDefOrArray ];

			this.notifySelfAndRoot({
				name: self.options.events.added,
				nodes: ko.utils.arrayMap(nodeDefOrArray, function(el) {
					return core.extend(
						{
							title: self.options.node.title
						}, el, {
							parentId: self.id || -1,
							parentType: self.type
						}
					);
				})
			})
			.then(function(nodesOrArray) {
				var nodes = core.isArray(nodesOrArray) ? nodesOrArray : [nodesOrArray],
					newNodes = ko.utils.arrayMap(nodes, function(el) {
						return new self.nodeType(core.extend(el, {
							options: self.options,
							parent: self
						}));
					})
				;
				self.nodes.push.apply(self.nodes, newNodes);
				self.toggle(true);
				if (edit) {
					newNodes[0].select(true);
					newNodes[0].edit();
				}
			}.bind(this));
		},
		toggle: core.NOOP,
		toString: function() {
			return this.title() + " (" + this.id + ")";
		}
	});

	exports.TreeNode = exports.ANode.extend({
		init: function(config) {
			core.extend(true, { exlude: ["nodes"] }, this, config);

			this.root = config.parent.root || config.parent;
			this.options = config.options || this.root.options;

			this.title = ko.observable(config.title || this.options.node.title);

			// behavioral observables
			this.open = ko.observable(config.open || false);
			this.editing = ko.observable(config.editing || false);
			this.selected = ko.observable(false);
			this.draggable = config.draggable || this.options.node.draggable;
			this.droppable = config.droppable || this.options.node.droppable;
			this.loading = ko.observable(false);

			this.type = config.type || this.options.node.childType || "folder";
			this.nodeType = exports.TreeNode;

			this.level = ko.observable(core.unwrap(config.parent.level) + 1);

			this._super(config);
		},
		toggle: function(value) {
			this.notifySelfAndRoot({
				name: this.options.events.toggle,
				node: this,
				force: value
			})
			.then(function(children) {
				this.open.toggle(value);
				if (children && this.open() && this.children() && !this.nodes().length) {
					this.add(children);
				}
			}.bind(this));
		},
		select: function(deselectAll) {
			this.notifySelfAndRoot({
				name: this.options.events.click,
				node: this
			})
			.then(function () {
				this.selected.toggle();
				if (this.selected()) {
					if (deselectAll) {
						ko.utils.arrayForEach(this.root.selected, function(item) {
							item.selected(false);
						});
						this.root.selected = [];
					}
					this.root.selected.push(this);
				} else {
					ko.utils.arrayRemoveItem(this.root.selected, this);
				}
			}.bind(this));
		},
		context: function() {
			this.notifySelfAndRoot({
				name: this.options.events.context,
				node: this
			});
		},
		dblClick: function() {
			this.notifySelfAndRoot({
				name: this.options.events.dblClick,
				node: this
			});
		},
		move: function(parent) {
			if (this.parent !== parent && !parent.isDescendentOf(this)) {
				this.notifySelfAndRoot({
					name: this.options.events.moved,
					node: this,
					to: parent
				}).then(function() {
					this.parent.nodes.remove(this);
					parent.nodes.push(this);
					this.parent = parent;
					this.level(core.unwrap(this.parent.level) + 1);
				}.bind(this));
			}
		},
		edit: function() {
			this.notifySelfAndRoot({
				name: this.options.events.edit,
				node: this
			})
			.then(function () {
				this.previousValue = this.title();
				this.editing(true);
				this.root.editing = this;
			}.bind(this));
		},
		rename: function() {
			if (this.editing()) {
				this.notifySelfAndRoot({
					name: this.options.events.renamed,
					node: this,
					from: this.previousValue,
					to: this.title()
				})
				.then(function () {
					this.editing(false);
					this.root.editing = null;
				}.bind(this));
			}
		},
		isDescendentOf: function(node) {
			if (node === this) {
				return true;
			}
			var parent = this.parent;
			do {
				if (parent === node) {
					return true;
				}
				parent = parent.parent;
			} while (parent);

			return false;
		}
	});

	exports.Tree = exports.ANode.extend({
		init: function(config) {
			var self = this;
			this.options = core.extend({}, defaults, config.options);

			this.level = -1;
			this.nodeType = exports.TreeNode;
			this.selected = [];

			this._super(config);

			$("body").click(function() {
				if (self.editing) {
					self.editing.rename();
				}
			});
		},
		add: function(nodeDef) {
			if (this.selected.length) {
				this.selected[this.selected.length - 1].add(nodeDef, true);
			} else {
				this._super(nodeDef, true);
			}
		},
		edit: function() {
			if (this.selected.length) {
				this.selected[this.selected.length - 1].edit();
			}
		},
		remove: function() {
			var working = this.selected.slice(0),
				result = [], i, l;
			while (working.length) {
				var selected = working.pop(), child = false;
				for (i = 0, l = working.length; i < l; i += 1) {
					if (selected.isDescendentOf(working[i])) {
						child = true;
						break;
					}
				}
				if (!child) {
					result.push(selected);
				}
			}
			this.notifySelfAndRoot({
				name: this.options.events.removed,
				nodes: result
			})
			.then(function () {
				for (i = 0, l = result.length; i < l; i += 1) {
					result[i].parent.nodes.remove(result[i]);
				}
			});
		}
	});

	ko.bindingHandlers.tree = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var value = core.unwrap(valueAccessor());
			if (!(value instanceof exports.Tree)) {
				throw new Error("The tree binding requires an instance of ko.ui.Tree viewModel");
			}
			ko.renderTemplate(value.options.templates.tree,
				value, { },
				element.appendChild(document.createElement('div')), "replaceNode");

			return { controlsDescendantBindings: true };
        }
    };

    ko.bindingHandlers.UITreeNode = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element),
				actualDrop, actualDrag,
				dragOptions, dropOptions,
				draggable, clickBuster
			;
			ko.proxyBinding.call(this, "init", element, allBindingsAccessor, viewModel, {
				event: function() {
					return {
						click: function(n, e) {
							if (!clickBuster) {
								viewModel.select(!e.metaKey);
							} else {
								clickBuster = false;
							}
						},
						dblclick: viewModel.dblClick,
						contextmenu: function(n, e) {
							viewModel.context();
							clickBuster = true;
							return false;
						}
					};
				}
			});

			ko.utils.domData.set(element, ITEMKEY, viewModel);

			if (core.unwrap(viewModel.draggable)) {
				actualDrag = viewModel.options.draggable.drop;
				dragOptions = core.extend({}, viewModel.options.draggable, {
					start: function(e, ui) {
						if (actualDrag) {
							actualDrag.apply(this, arguments);
						}
					}
				});
				$element.draggable(dragOptions);
			}
			if (core.unwrap(viewModel.droppable)) {
				actualDrop = viewModel.options.droppable.drag;
				dropOptions = core.extend({}, viewModel.options.droppable, {
					drop: function(e, ui) {
						if (actualDrop) {
							actualDrop.apply(this, arguments);
						}
						setTimeout(
							function() {
								ko.utils.domData.get(ui.draggable.get(0), ITEMKEY)
									.move(viewModel);
						}, 0);
					}
				});
				$element.droppable(dropOptions);
			}

			ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
				if ($element.draggable) { $element.draggable("destroy"); }
				if ($element.droppable) { $element.droppable("destroy"); }
			});
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
			ko.proxyBinding.call(this, "update", element, allBindingsAccessor, viewModel, {
				attr: function() {
					return { class: viewModel.options.css.node };
				},
				css: function() {
					var config = {};
					config[viewModel.options.css.selected] = viewModel.selected;
					config[viewModel.options.css.open] = viewModel.open;
					config[viewModel.type] = true;
					return config;
				}
			});
        }
    };

    ko.bindingHandlers.UITreeNodeHandle = {
		init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $el = $(element),
				setIndent = function(newLevel) {
					$el.css("marginLeft", (newLevel * viewModel.options.node.indent));
				}
			;
			viewModel.level.subscribe(setIndent);
			setIndent(viewModel.level());
			ko.bindingHandlers.click.init.call(this, element, function() {
				return function () {
					viewModel.toggle();
				};
			}, allBindingsAccessor, viewModel);
		},
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
			ko.bindingHandlers.attr.update.call(this, element, function() {
				return {
					class: ko.computed({
						read: function() {
							var css = viewModel.options.css.handle;
							css += viewModel.children() ? "" : (" " + viewModel.options.css.emptyHandle);
							return css;
						},
						disposeWhenNodeIsRemoved: element
					})
				};
			}, allBindingsAccessor, viewModel);
		}
    };

    ko.bindingHandlers.UITreeNodeIcon = {
		init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
			ko.bindingHandlers.attr.update.call(this, element, function() {
				return { class: viewModel.options.css.icon };
			}, allBindingsAccessor, viewModel);
		}
    };

    ko.bindingHandlers.UITreeNodeLabel = {
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
			ko.proxyBinding.call(this, "update", element, allBindingsAccessor, viewModel, {
				text: function() {
					return viewModel.title;
				},
				visible: function() {
					return ko.computed(function() {
						return !viewModel.editing();
					});
				}
			});
        }
    };

    ko.bindingHandlers.UITreeNodeTextBox = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel, context) {
			ko.proxyBinding.call(this, "init", element, allBindingsAccessor, viewModel, {
				event: function() {
					return {
						click: function(n, e) {
							e.stopPropagation();
						},
						blur: viewModel.rename
					};
				},
				value: function() {
					return viewModel.title;
				}
			});
			viewModel.editing.subscribe(function(editing) {
				if (editing) {
					setTimeout(function() {
						element.focus();
						element.select();
					}, 0);
				}
			});
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel) {
			ko.proxyBinding.call(this, "update", element, allBindingsAccessor, viewModel, {
				visible: function() {
					return viewModel.editing;
				},
				value: function() {
					return viewModel.title;
				}
			});
        }
    };
}));
