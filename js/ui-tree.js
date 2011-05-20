/*global document, window, $, ko, debug, setTimeout, alert */

(function () {
    // Private function
    var logger = function (log, logTo) {
			if (typeof debug !== 'undefined')
			{	
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
			/*this.id = ko.observable(data.id)*/
			this.contextMenu = viewModel.contextMenu;
			
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
			var self = this, vm = this.viewModel, openSelfAndParents, 
				childMapping =  {
					children : {
						create: function (options) {
							return new Node(options.data, self, vm);
						}
					}
				};
			
			// map incoming data
			ko.mapping.fromJS(data, childMapping, this);
			
			// defaults
			this.cssClass = ko.observable(data.cssClass || 'folder');
			this.isRenaming = ko.observable(false);
			
			this.unqiueIdentifier = function() {
				return this.viewModel.id() + '-' + this.id();
			};
			
			// load open status from cookie
			this.isOpen = ko.observable(false);
			var savedOpen = $.cookie(this.unqiueIdentifier() + 'open');
			if (savedOpen !== null) {
				this.isOpen(savedOpen === 'true');
			} 
			else if (data.isOpen !== undefined) {
				this.isOpen(data.isOpen);
			}
			
			// load selected state from cookie
			this.isSelected = ko.observable(false);
			var savedActive = $.cookie(this.viewModel.id() + 'active');
			if (savedActive !== null && savedActive === this.id()) {
				this.isSelected(true);
				this.viewModel.selectedNode(this);
			} 

			this.canAddChildren = ko.dependentObservable(function () {
				var typeDefault = typeValueOrDefault('canAddChildren', this.cssClass(), this.viewModel);
				return typeDefault;
			}, this);
			
			this.isDropTarget = ko.dependentObservable(function () {
				var typeDefault = typeValueOrDefault('isDropTarget', this.cssClass(), this.viewModel);

				return typeDefault;
			}, this);
			
			this.connectToSortable = ko.dependentObservable(function () {
				var typeDefault = typeValueOrDefault('connectToSortable', this.cssClass(), this.viewModel);

				return typeDefault;
			}, this);
			
			this.isDraggable = ko.dependentObservable(function () {
				var name = this.name(),
					childRenaming = false,
					typeDefault = typeValueOrDefault('isDraggable', this.cssClass(), this.viewModel);
				
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
			
			this.isDragging = function (event, element) {
				viewModel.dragging(this);
			}.bind(this);
			
			this.dropped = function () {
				return viewModel.dragging();
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
					var defaultType = typeValueOrDefault('childType', this.cssClass(), this.viewModel),
						type = options.type !== undefined ? options.type : defaultType,
						defaultName = typeValueOrDefault('name', type, this.viewModel),
						name = options.name !== undefined ? options.name : defaultName,
						rename = typeValueOrDefault('renameAfterAdd', type, this.viewModel);
				
					// the addNode handler must return an id for the new node
					var result = viewModel.handlers.addNode(this);
					if (result !== undefined && result !== false && result !== null) {
						var newNode = new Node({ id : result, name : name, children: [], cssClass: type}, self, this.viewModel);
						this.children.push(newNode);				
						openSelfAndParents(this);
						this.isSelected(false);
						newNode.selectNode();
						if (rename) {
							newNode.isRenaming(true);
						}
						
						viewModel.recalculateSizes();
						this.saveState();
						return true;
					}
				}
			}.bind(this);
			
			this.deleteSelf = function () {
				if (viewModel.handlers.deleteNode(this)) {
					$.each(this.children(), function (idx, child) { 
						child.deleteSelf(); 
					});
					if (this.parent() !== undefined) {
						this.parent().children.remove(this);
					}
				}
				viewModel.recalculateSizes();
			}.bind(this);
			
			this.rename = function (newName) {
				if (viewModel.handlers.renameNode(this, this.name(), newName)) {
					this.name(newName);
				}
				viewModel.recalculateSizes();
			}.bind(this);
			
			this.selectNode = function () {
				if (viewModel.selectedNode() !== undefined && viewModel.selectedNode().isRenaming()) {
					$('.rename > .node input', viewModel.tree).blur();
				}
					
				if (viewModel.selectedNode() !== this) {
					if (viewModel.selectedNode() !== undefined) {
						viewModel.selectedNode().isSelected(false);
						viewModel.selectedNode().isRenaming(false);
					}
					this.isSelected(true);
					viewModel.selectedNode(this);
				}
				this.saveState();
			}.bind(this);
			
			this.move = function (node) {
				if (viewModel.handlers.moveNode(node, this)) {
					node.parent().children.remove(node);
					node.parent(this);
					this.children.push(node);
					this.isOpen(true);
					node.selectNode();
				}
				viewModel.recalculateSizes();
				this.saveState();
			}.bind(this);
			
			this.toggleFolder = function () {
				this.isOpen(!this.isOpen());
				viewModel.recalculateSizes();
				this.saveState();
			}.bind(this);
			
			this.indent = function () {
				return (this.level() * 11) + 'px';
			}.bind(this);
			
			this.saveState = function() {
				if ($.cookie === undefined && this.viewModel.remember()) {
					alert('You must include $.cookie in order to use this feature');
				} else if (this.viewModel.remember()) {	
					$.cookie(this.unqiueIdentifier() + 'open', this.isOpen()); 
					if (this.isSelected()) {
						$.cookie(this.viewModel.id() + 'active', this.id()); 
					}
				}
			};
		};
	
    ko.tree = {
        // Defines a view model class you can use to populate a grid
        viewModel: function (configuration) {
			this.selectedNode = ko.observable(undefined);
			this.defaults = {
				isDraggable : true,
				isDropTarget : true,
				canAddChildren : true,
				childType : 'folder',
				renameAfterAdd : true,
				connectToSortable : false
			};
			if (configuration.defaults) {
				$.extend(true, this.defaults, configuration.defaults);
			}
			var self = this, childMapping = {
				children : {
					create: function (options) {
						return new Node(options.data, self, self);
					}
				}
			};
			if (configuration.contextMenu) {
				this.contextMenu = new ko.contextMenu.viewModel(configuration.contextMenu);
			}
			ko.mapping.fromJS(configuration, childMapping, this);
			this.logTo = configuration.logTo;
			this.tree = undefined;
			this.dragging = configuration.dragHolder;
			this.addNode = function (options) {
				if (this.selectedNode() !== undefined) {
					this.selectedNode().addChild(options || {});
				}
			}.bind(this);
			this.deleteNode = function () {
				if (this.selectedNode() !== undefined) {
					this.selectedNode().deleteSelf();
				}
			}.bind(this);
			this.renameNode = function () {
				if (this.selectedNode() !== undefined) {
					this.selectedNode().isRenaming(true);
				}
			}.bind(this);
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
			this.handlers = {
				addNode : function (parent) { 
					logger('add new node ', configuration.logTo); 
					return 10; 
				},
				renameNode : function (node, from, to) { 
					logger('rename node "' + from + '" to "' + to + '"', configuration.logTo); 
					return true; 
				},
				deleteNode : function (node) { 
					logger('delete node "' + node.name() + '"', configuration.logTo); 
					return true; 
				},
				moveNode :  function (node, newParent) { 
					logger('move node "' + node.name() + '" to "' + newParent.name() + '"', configuration.logTo); 
					return true; 
				},
				startDrag : function (node) { 
					logger('start drag', configuration.logTo); 
				},
				endDrag : function (node) { 
					logger('stop drag', configuration.logTo); 
				}
			};
			$.extend(this.handlers, configuration.handlers);
        }
    };
	
	templateEngine.addTemplate("nodeTemplate", "\
					{{if hasContext() }}\
						<li class=\"${cssClass}\" data-bind=\"contextMenu : contextMenu, css: { empty: !hasChildren(), open: isOpen, rename: isRenaming }\">\
					{{else}}\
						<li class=\"${cssClass}\" data-bind=\"css: { empty: !hasChildren(), open: isOpen, rename: isRenaming }\">\
					{{/if}}\
						<div class=\"node\" data-bind=\"nodeDrag : isDraggable(), nodeDrop: { active : isDropTarget(), onDropComplete: move }, css :{ selected: isSelected }, click: selectNode, hover : 'hover'\">\
							{{if hasChildren() }}\
								<span class=\"handle\" data-bind=\"click: toggleFolder, bubble : false, style: { marginLeft: indent() }, hover : 'hover'\"></span>{{else}}<span class=\"handle\" data-bind=\"style: { marginLeft: indent() }\"></span>{{/if}}<span class=\"icon\"></span><label data-bind=\"visible: !isRenaming()\">${ name }</label><input class=\"rename\" type=\"text\" data-bind=\"nodeRename: name, onRenameComplete : rename, nodeSelectVisible: isRenaming\"/>\
						</div>\
						{{if hasChildren() }}\
							<ul data-bind='visible: isOpen, template: { name: \"nodeTemplate\", foreach: children }'></ul>\
						{{/if}}\
					</li>");
	
	templateEngine.addTemplate("containerTemplate", "<ul class=\"tree\" data-bind='template: { name : \"nodeTemplate\", foreach: children }'></ul>");

	ko.bindingHandlers.nodeDrag = {
		init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element),
				dragOptions = {	
					revert: 'invalid',
					revertDuration: 250,
					cancel: 'span.handle',
					cursorAt: { left: 28, bottom: 0 },
					appendTo : 'body',
					connectToSortable : viewModel.connectToSortable(),
					helper: function (event, element) { 
						return $('<div></div>').addClass("drag-icon").append($('<span></span>').addClass(viewModel.cssClass())); 
					},
					/*helper : 'clone',*/
					zIndex: 200000,
					cursor: "pointer",
					addClasses: false,
					distance: 10,
					start : function (e, ui) {
						viewModel.isDragging();
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
			}
			else {
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
			}
			else {
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
					
			$element.focus('focus', function () {
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
			
			treeContainer = element.appendChild(document.createElement("DIV"));	
			logger('Initialize tree ' + value.children().length + ' root nodes found', value.logTo);
			
            ko.renderTemplate("containerTemplate", value, { templateEngine: templateEngine }, treeContainer, "replaceNode");
			
			value.recalculateSizes();
        }
    };
}());
