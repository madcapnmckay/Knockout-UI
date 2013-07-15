/*global document, window, $, ko, debug, setTimeout, alert */
/*
 * Knockout UI Tree
 * 
 * Copyright (c) 2011 Ian Mckay
 *
 * https://github.com/madcapnmckay/Knockout-UI
 *
 * License: MIT http://www.opensource.org/licenses/mit-license.php
 *
 */
(function () {
    // Private function
    var logger = function (log, logTo) {
			if (typeof debug !== 'undefined') {	
				$('<div></div>').appendTo(logTo || '#log').text(new Date().toGMTString() + ' : ui-tree.js - '  + log);
			}
		},
		templateEngine = new ko.jqueryTmplTemplateEngine(),
		typeValueOrDefault = function (param, type, viewModel) {
			var globalDefault = viewModel.defaults[param];
			if (viewModel.defaults[type] === undefined || viewModel.defaults[type][param] === undefined) {
				return ko.utils.unwrapObservable(globalDefault);		
			}
			
			return ko.utils.unwrapObservable(viewModel.defaults[type][param]);
		},
		Node = function (data, parent, viewModel) {
			this.viewModel = viewModel;
			this.parent = ko.observable(parent);
			this.id = ko.observable(data.id);
			this.name = ko.observable(data.name);
			this.contextMenu = viewModel.contextMenu;
			// defaults
			this.cssClass = ko.observable(data.cssClass || 'folder');
			this.isRenaming = ko.observable(false);
			
			this.type = ko.observable(data.type || this.cssClass());	
			// a placeholder for additional custom data
			this.contents = data.contents;
			
			this.level = ko.dependentObservable(function () {
				try {
					var pname = this.parent().name(),
						plevel = this.parent().level();
					return this.parent().level() + 1; 
				} catch (err) { 
					return 0; 
				}
			}, this);
			
			// assign the childrens parent
			var self = this, vm = this.viewModel, openSelfAndParents, i;
			this.children = ko.observableArray([]);
			if (data.children !== undefined) {
				for (i = 0; i < data.children.length; i += 1) {
					if (data.children[i] !== undefined) {
						this.children.push(new Node(data.children[i], self, vm));
					}
				}
			}

			this.unqiueIdentifier = function () {
				return this.viewModel.id() + this.type() + this.id();
			};
			
			// load open status from cookie
			this.isOpen = ko.observable(false);
			var savedOpen = $.cookie(this.unqiueIdentifier() + 'open');
			if (savedOpen !== null) {
				this.isOpen(savedOpen === 'true');
			} else if (data.isOpen !== undefined) {
				this.isOpen(data.isOpen);
			}
			
			this.saveState = function () {
				if ($.cookie === undefined && this.viewModel.remember()) {
					alert('You must include $.cookie in order to use this feature');
				} else if (this.viewModel.remember()) {	
					$.cookie(this.unqiueIdentifier() + 'open', this.isOpen()); 
					if (this.isSelected()) {
						$.cookie(this.viewModel.id() + 'active', this.unqiueIdentifier()); 
					}
				}
			};
			
			this.selectNode = function () {
				var selected = this.viewModel.selectedNode(), that = this;
				
				if (selected !== undefined && selected.isRenaming()) {
					$('.rename > .node input', viewModel.tree).blur();
				}
				this.saveState();
							
				if (selected === undefined || (selected !== undefined && selected !== this)) {
				
					that.viewModel.handlers.selectNode(this, function () {
						if (selected !== undefined) {
							selected.isSelected(false);
							selected.isRenaming(false);
						}
						that.isSelected(true);
						that.viewModel.selectedNode(that);
						that.saveState();
					});
				}
			}.bind(this);
			
			// load selected state from cookie
			this.isSelected = ko.observable(false);
			var savedActive = $.cookie(this.viewModel.id() + 'active');
			if ((savedActive !== null && savedActive === this.unqiueIdentifier()) || data.isSelected) {
				this.selectNode();
			} 

			this.canAddChildren = ko.dependentObservable(function () {
				var typeDefault = typeValueOrDefault('canAddChildren', this.type(), this.viewModel);
				return typeDefault;
			}, this);
			
			this.isDropTarget = ko.dependentObservable(function () {
				var typeDefault = typeValueOrDefault('isDropTarget', this.type(), this.viewModel);

				return typeDefault;
			}, this);
			
			this.connectToSortable = ko.dependentObservable(function () {
				var typeDefault = typeValueOrDefault('connectToSortable', this.type(), this.viewModel);

				return typeDefault;
			}, this);
			
			this.isDraggable = ko.dependentObservable(function () {
				var name = this.name(),
					childRenaming = false,
					typeDefault = typeValueOrDefault('isDraggable', this.type(), this.viewModel);
				
				$.each(this.children(), function (index, child) {
					childRenaming = child.isRenaming();
					if (childRenaming) {
						return false;
					}
				});
				return !this.isRenaming() && !childRenaming && typeDefault;
			}, this);
			
			this.hasChildren = function () {
				return this.children().length > 0;
			}.bind(this);
			
			this.hasContext = function () {
				return this.contextMenu !== undefined;
			}.bind(this);
			
			this.isdragHolder = function (event, element) {
				viewModel.dragHolder(this);
			}.bind(this);
			
			this.dropped = function () {
				return viewModel.dragHolder();
			}.bind(this);
			
			openSelfAndParents = function (node) {
				var current = node;
				do { 
					current.isOpen(true);
					current = current.parent();
				} while (current.parent !== undefined);
			};
			
			this.addChild = function (options) {
				if (this.canAddChildren()) {
					var defaultType = typeValueOrDefault('childType', this.type(), this.viewModel),
						type = options.type !== undefined ? options.type : defaultType,
						defaultName = typeValueOrDefault('name', type, this.viewModel),
						name = options.name !== undefined ? options.name : defaultName,
						rename = options.rename !== undefined ? options.rename : typeValueOrDefault('renameAfterAdd', type, this.viewModel);
				
					// the addNode handler must return an id for the new node
					var that = this;
					viewModel.handlers.addNode(this, type, name, function (data) {
						if (data !== undefined) {
							var newNode = new Node(data, self, that.viewModel);
							that.children.push(newNode);				
							openSelfAndParents(that);
							that.isSelected(false);
							newNode.selectNode();
							if (rename) {
								newNode.isRenaming(true);
							}
							
							viewModel.recalculateSizes();
							that.saveState();
						}
					});
				}
			}.bind(this);
			
			this.setViewModel = function (viewModel) {
				var i;
				for (i = 0; i < this.children().length; i += 1) {
					var child = this.children()[i].setViewModel(viewModel);
				}
				this.viewModel = viewModel;
				this.contextMenu = viewModel.contextMenu;
			}.bind(this);
			
			this.deleteSelf = function (action) {
				var that = this;
				viewModel.handlers.deleteNode(this, action, function () {
					$.each(that.children(), function (idx, child) { 
						child.deleteSelf(action); 
					});
					if (that.parent() !== undefined) {
						that.parent().children.remove(that);
					}
					viewModel.recalculateSizes();
				});
			}.bind(this);
			
			this.rename = function (newName) {
				var that = this;
				viewModel.handlers.renameNode(this, this.name(), newName, function () {
					that.name(newName);
					viewModel.recalculateSizes();
				});
			}.bind(this);
			
			this.move = function (node) {
				var that = this;
				viewModel.handlers.moveNode(node, this, function () {
					
					// check that 'that' is not a descendent of 'node'
					// otherwise abort
					var ancestor = that
					while ( ancestor && ancestor.parent )
					{
						ancestor = ancestor.parent()
						if ( ancestor == node )
							return
					}
					
					node.parent().children.remove(node);
					node.parent(that);
					that.children.push(node);
					that.isOpen(true);
					node.selectNode();
					viewModel.recalculateSizes();
					that.saveState();
				});
			}.bind(this);
			
			this.doubleClick = function (event) {
				viewModel.handlers.doubleClick(this);
			}.bind(this);
			
			this.clicked = function(event) {
				switch (event.which) {
					case 1:
						this.selectNode();
						break;
					case 3:
						viewModel.handlers.rightClick(this);
						break;
				}
			}.bind(this);
			
			this.toggleFolder = function () {
				this.isOpen(!this.isOpen());
				viewModel.recalculateSizes();
				this.saveState();
			}.bind(this);
			
			this.indent = function () {
				return (this.level() * 11) + 'px';
			}.bind(this);
		};
	
    ko.tree = {
        // Defines a view model class you can use to populate a grid
        viewModel: function (configuration) {
			this.selectedNode = ko.observable(undefined);
			
			// default behaviours for the nodes
			this.defaults = {
				isDraggable : true,
				isDropTarget : true,
				canAddChildren : true,
				childType : 'folder',
				renameAfterAdd : true,
				connectToSortable : false,
				dragCursorAt: { left: 28, bottom: 0 },
				dragCursor : 'auto',
				dragHelper : function (event, element) { 
					return $('<div></div>').addClass("drag-icon").append($('<span></span>').addClass(this.cssClass())); 
				}
			};
			
			// handlers that can be overridden to implement custom functionality
			this.handlers = {
				selectNode : function (node, onSuccess) {
					logger('select node ' + node.name(), configuration.logTo); 
					onSuccess();
				},
				addNode : function (parent, type, name, onSuccess) { 
					logger('add new node ', configuration.logTo); 
					// create node data to pass back
					onSuccess({ id: 10, parent: parent, name: name }); 
				},
				renameNode : function (node, from, to, onSuccess) { 
					logger('rename node "' + from + '" to "' + to + '"', configuration.logTo); 
					onSuccess(); 
				},
				deleteNode : function (node, action, onSuccess) { 
					logger('delete node "' + node.name() + '"', configuration.logTo); 
					onSuccess(); 
				},
				moveNode :  function (node, newParent, onSuccess) { 
					logger('move node "' + node.name() + '" to "' + newParent.name() + '"', configuration.logTo); 
					onSuccess(); 
				},
				doubleClick : function (node) {
					logger('doubled clicked ' + node.name(), configuration.logTo); 
				},
				rightClick : function (node) {
					logger('right click ' + node.name(), configuration.logTo); 
				},
				startDrag : function (node) { 
					logger('start drag', configuration.logTo); 
				},
				endDrag : function (node) { 
					logger('stop drag', configuration.logTo); 
				}
			};
			$.extend(this.handlers, configuration.handlers || {});
			
			
			if (configuration.defaults) {
				$.extend(true, this.defaults, configuration.defaults);
			}
			this.id = ko.observable(configuration.id);
			this.remember = ko.observable(configuration.remember || false);		
			this.logTo = configuration.logTo;			
			var self = this;
			if (configuration.contextMenu) {
				this.contextMenu = new ko.contextMenu.viewModel(configuration.contextMenu);
			}
			this.children = ko.observableArray([]);
			var i;
			for (i = 0; i < configuration.children.length; i += 1) {
				var child = configuration.children[i];
				this.children.push(new Node(child, self, self));
			}			
			this.tree = undefined;
			this.dragHolder = configuration.dragHolder || ko.observable(undefined);
			this.recalculateSizes = function () {
				var maxNodeWidth = 0, widestNode;
				$('.node:visible', this.tree).each(function (ind1, node) {
					var newWidth = 0, $this = $(node);
					newWidth = newWidth + $this.children('label').outerWidth(true);
					newWidth = newWidth + $this.children('.icon').outerWidth(true);
					newWidth = newWidth + $this.children('.handle').outerWidth(true);
					
					if (maxNodeWidth < newWidth) {
						maxNodeWidth = newWidth;
						widestNode = $this;
					}
				});
				$('.node', this.tree).css('minWidth', maxNodeWidth + 5);
			}.bind(this);
			this.addNode = function (options) {
				if (options instanceof Node) {
					// if you add a full blown node we do not call the handler to create a new node simply add to the tree
					options.isSelected(false);
					options.setViewModel(self);
					options.parent(self);
					self.children.push(options);
					options.selectNode();
				} else {			
					if ((options !== undefined && options.parent === undefined) || this.children().length === 0) { 
						// add to root
						var type = options.type !== undefined ? options.type : typeValueOrDefault('childType', undefined, this),
							name = options.name !== undefined ? options.name : typeValueOrDefault('name', type, this),
							rename = options.rename !== undefined ? options.rename : typeValueOrDefault('renameAfterAdd', type, this);
							
						this.handlers.addNode(undefined, type, name, function (data) {
							if (data !== undefined) {
								var newNode = new Node(data, self, self);
								self.children.push(newNode);				
								newNode.selectNode();
								if (rename) {
									newNode.isRenaming(true);
								}
								self.recalculateSizes();
								newNode.saveState();
							}
						});
					} else {
						this.selectedNode().addChild(options || {});
					}
				}
			}.bind(this);
			this.deleteNode = function (action) {
				if (this.selectedNode() !== undefined) {
					this.selectedNode().deleteSelf(action);
				}
			}.bind(this);
			this.renameNode = function () {
				if (this.selectedNode() !== undefined) {
					this.selectedNode().isRenaming(true);
				}
			}.bind(this);
        }
    };
	
	ko.addTemplateSafe("nodeTemplate", "\
					{{if hasContext() }}\
						<li class=\"${cssClass}\" data-bind=\"contextMenu : contextMenu, css: { empty: !hasChildren(), open: isOpen, rename: isRenaming }\" data-id=\"${ id() }\">\
					{{else}}\
						<li class=\"${cssClass}\" data-bind=\"css: { empty: !hasChildren(), open: isOpen, rename: isRenaming }\" data-id=\"${ id() }\">\
					{{/if}}\
						<div class=\"node\" data-bind=\"nodeDrag : isDraggable(), nodeDrop: { active : isDropTarget(), onDropComplete: move }, css :{ selected: isSelected }, hover : 'hover', event : { dblclick : doubleClick, mousedown: clicked }\">\
							{{if hasChildren() }}\
								<span class=\"handle\" data-bind=\"click: toggleFolder, bubble : false, style: { marginLeft: indent() }, hover : 'hover'\"></span>{{else}}<span class=\"handle\" data-bind=\"style: { marginLeft: indent() }\"></span>{{/if}}<span class=\"icon\"></span><label data-bind=\"visible: !isRenaming()\" unselectable=\"on\">${ name }</label><input class=\"rename\" type=\"text\" data-bind=\"nodeRename: name, onRenameComplete : rename, nodeSelectVisible: isRenaming\"/>\
						</div>\
						{{if hasChildren() }}\
							<ul data-bind='visible: isOpen, template: { name: \"nodeTemplate\", foreach: children }'></ul>\
						{{/if}}\
					</li>", templateEngine);
	
	ko.addTemplateSafe("containerTemplate", "<ul class=\"tree\" data-bind='template: { name : \"nodeTemplate\", foreach: children }'></ul>", templateEngine);

	ko.bindingHandlers.nodeDrag = {
		init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element),
				node = viewModel,
				dragOptions = {	
					revert: 'invalid',
					revertDuration: 250,
					cancel: 'span.handle',
					cursor: typeValueOrDefault('dragCursor', node.type(), node.viewModel),
					cursorAt: typeValueOrDefault('dragCursorAt', node.type(), node.viewModel),
					appendTo : 'body',
					connectToSortable : viewModel.connectToSortable(),
					helper: function (event, element) { 
						var helper = typeValueOrDefault('dragHelper', node.type(), node.viewModel); 
						return helper.call(viewModel, event, element); 
					},
					zIndex: 200000,
					addClasses: false,
					distance: 10,
					start : function (e, ui) {
						viewModel.isdragHolder();
						viewModel.viewModel.handlers.startDrag(viewModel);
					},
					stop : function (e, ui) {
						viewModel.viewModel.handlers.endDrag(viewModel);
					}
				};
			
			$element.draggable(dragOptions);
		},
		update : function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element),
				active = ko.utils.unwrapObservable(valueAccessor());
			
			if (!active) {
				$element.draggable('disable');
			} else {
				$element.draggable('enable');
			}
		}
	};
	
	ko.bindingHandlers.nodeDrop = {
		init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element),
				value = valueAccessor() || {},
				handler = ko.utils.unwrapObservable(value.onDropComplete),
				dropOptions = {	
					greedy: true,
					tolerance: 'pointer',
					addClasses: false,
					drop: function (e, ui) {
						setTimeout(function () { 
							handler(viewModel.dropped()); 
						}, 0);
					}
				};
			$element.droppable(dropOptions);
		},
		update : function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element),
				active = ko.utils.unwrapObservable(valueAccessor()).active;
			
			if (!active) {
				$element.droppable('disable');
			} else {
				$element.droppable('enable');
			}
		}
	};
					
	ko.bindingHandlers.nodeSelectVisible = {
		'update': function (element, valueAccessor) {
			ko.bindingHandlers.visible.update(element, valueAccessor);
			var isCurrentlyInvisible = element.style.display === "none";
			if (!isCurrentlyInvisible) {
				element.select();
			}
		}
	};
	
	ko.bindingHandlers.nodeRename = {
		updateValue : function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var handler = allBindingsAccessor().onRenameComplete,
				elementValue = ko.selectExtensions.readValue(element);
			handler(elementValue);
			viewModel.isRenaming(false);
		},
		'init': function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element),
				updateHandler = function () { 
					ko.bindingHandlers.nodeRename.updateValue(element, valueAccessor, allBindingsAccessor, viewModel); 
				};
					
			$element.click(function () { return false; }).focus('focus', function () {
				/* add scroll to element on focus http://stackoverflow.com/questions/4217962/scroll-to-an-element-using-jquery*/
			});
			$element.bind('blur', updateHandler);
			$element.bind('keyup', function (e) { 
				if (e.which === 13) {
					updateHandler();
				}
			});
		},
		'update': function (element, valueAccessor, allBindingsAccessor, viewModel) {
			ko.bindingHandlers.value.update(element, valueAccessor);
		}
	};
					
    // The main tree binding
    ko.bindingHandlers.tree = {
        init: function (element, viewModelAccessor, allBindingsAccessor, viewModel) {
			var value = viewModelAccessor(), treeContainer;
			// needed to recalculate node sizes when multiple trees
			value.tree = element;
			
			treeContainer = element.appendChild(document.createElement("DIV"));	
			logger('Initialize tree ' + value.children().length + ' root nodes found', value.logTo);
			
            ko.renderTemplate("containerTemplate", value, { templateEngine: templateEngine }, treeContainer, "replaceNode");
			
			value.recalculateSizes();
        }
    };
}());
