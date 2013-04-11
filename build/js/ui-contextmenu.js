/*!
 * Knockout-UI v0.5.0
 * A home for rich UI components based on KnockoutJS
 * Copyright (c) 2013 Ian Mckay
 * https://github.com/madcapnmckay/Knockout-UI.git
 * License: MIT (http://opensource.org/licenses/mit-license.php)
**/
/*
 * Knockout UI Content Menu
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
    var logger = function (log) {
			if (typeof debug !== 'undefined')
			{
				$('<div></div>').appendTo('#log').text(new Date().toGMTString() + ' : ' + log);
			}
		},
		templateEngine = new ko.jqueryTmplTemplateEngine(),
		Menu = function (data, viewModel) {
			this.viewModel = viewModel;
			this.cssClass = ko.observable(data.cssClass || viewModel.cssClass());
			this.width = ko.observable(data.width || 190);
			this.name = ko.observable(data.name);
			var self = this;
			this.items = ko.observableArray([]);
			for(var i in data.items)
			{
				var item = data.items[i];
				this.items.push(new MenuItem(item, self));
			}
		},
		MenuItem = function (data, container) {
			this.dataItem = {};
			this.container = container;
			this.text = ko.observable(data.text || '');
			this.iconCssClass = ko.observable(data.iconCssClass || '');
			this.separator = ko.observable(data.separator || false);
			this.run = typeof data.run === 'function' ? data.run : eval(data.run);
			this.items = ko.observableArray(data.items || []);
			this.width = ko.observable(container.width());
			this.disabled = ko.observable(false);
			
			if (data.items !== undefined && data.items.length > 0) {
				this.subMenu = new Menu({ items : data.items }, container);
			}
					
			this.hasChildren = function () {
				return this.subMenu !== undefined;
			}.bind(this);
			
			this.addDataItem = function (dataItem) {
				this.dataItem = dataItem;
				if (this.hasChildren()) {
					for (var i = 0; i < this.subMenu.items().length; i += 1) {
						this.subMenu.items()[i].addDataItem(dataItem);
					}
				}
			}.bind(this);
			
			this.itemWidth = function () {
				return (this.separator() ? (this.width() - 4) : (this.width() - 6)) + 'px';
			}.bind(this);
			
			this.labelWidth = function () {
				return (this.width() - 41) + 'px'; // icon + borders + padding
			}.bind(this);
			
			this.onClick = function (e) {
				if (this.disabled() || this.run === undefined) {
					return false;
				}

				this.run(this.dataItem);
				$('.ui-context').remove();
			}.bind(this);
		};
		
    ko.contextMenu = {
        viewModel: function (configuration) {
			this.cssClass = ko.observable(configuration.cssClass || 'ui-context');
			this.build = typeof configuration.build === 'function' ? configuration.build : eval(configuration.build);
			
			var self = this;
			this.contextMenus = ko.observableArray([]);
			for(var i in configuration.contextMenus)
			{
				var menu = configuration.contextMenus[i];
				this.contextMenus.push(new Menu(menu, self));
			}
        }
    };
	
	ko.addTemplateSafe("contextItemTemplate", "\
					<li data-bind=\"subContext: hasChildren(), click : onClick, bubble : false, css : { separator : separator, disabled : disabled }, style : { width : itemWidth() }\">\
						<span class=\"inner\"><span class=\"icon ${iconCssClass}\"></span><label data-bind=\"css : { parent : hasChildren() }, style : { width : labelWidth() }\">\
							${ text }</label></span>\
						{{if hasChildren() }}\
							<div class=\"${ container.cssClass() } nocontext\" style=\"position:absolute;\" >\
								<ul data-bind='template: { name: \"contextItemTemplate\", foreach: subMenu.items }'></ul>\
							</div>\
						{{/if}}\
					</li>", templateEngine);
	
	ko.addTemplateSafe("contextMenuTemplate", "\
					<div class=\"${ menu.cssClass() } ui-context nocontext\" style=\"position:absolute;\" data-bind=\"position: { width: menu.width(), of : mousePosition }, style : { zIndex : zIndex }\">\
						<ul data-bind='template: { name: \"contextItemTemplate\", foreach: menu.items }'></ul>\
					</div>", templateEngine);

	ko.bindingHandlers.contextMenu = {
		'init': function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element), menuContainer, item, config, menu, parentVM = viewModel,
				value = ko.utils.unwrapObservable(valueAccessor()),
				builder = value.build;
				
			$element
				.addClass('nocontext')
				.mousedown(function (e) {
					if (e.which === 3) {
						config = value.build(e, parentVM);
						menu = value.contextMenus().filter(function (x) { 
								return x.name() === config.name; 
							})[0];
						// remove any existing menus active
						$('.ui-context').remove();
						
						if (menu !== undefined)	{
							config.menu = menu;
							config.mousePosition = e;
							menuContainer = $('<div></div>').appendTo('body');
							
							// disable items
							for (var i = 0; i < config.menu.items().length; i += 1) {
								item = config.menu.items()[i];				
								item.disabled(config.disable !== undefined && config.disable.indexOf(item.text()) !== -1);
							}
							
							// assign the data item
							for (var j = 0; j < config.menu.items().length; j += 1) {
								var menuItem = config.menu.items()[j];
								menuItem.addDataItem(parentVM);
							}
							
							// calculate z-index
							var maxZ = 1;
							$element.parents().each(function() {
								var z = $(this).css('zIndex');
								if (z !== 'auto') {
									z = parseInt(z, 10);
									if (z > maxZ) {
										maxZ = z;
									}
								}
							});
							config.zIndex = maxZ;

							ko.renderTemplate("contextMenuTemplate", config, { templateEngine: templateEngine }, menuContainer, "replaceNode");
						}
						return false;
					}
				});
			
			$('.nocontext').live('contextmenu', function (e) { 
					return false; 
				});
			
			$('html').click(function () {
				$('.ui-context').remove();
			});
		}
    };

	ko.bindingHandlers.subContext = {
		'init': function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element),
				value = ko.utils.unwrapObservable(valueAccessor()),
				width = ko.utils.unwrapObservable(viewModel.width()),
                cssClass;
			
			if (value) {
				cssClass = '.' + viewModel.container.cssClass()
				$(cssClass, $element).hide();
				$element.hover(function () {
					var $parent = $(this);
					$(cssClass, $parent).first().toggle()
						.position({ my : 'left top', at : 'right top', of : $parent, collision : 'flip' });
						
				});
			}
		}
    };
	
	ko.bindingHandlers.position = {
		'init': function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element),
				value = ko.utils.unwrapObservable(valueAccessor()),
				width = ko.utils.unwrapObservable(value.width),
				options = { my: value.my || 'left top', at: value.at || 'right', of : value.of, offset: value.offset || '0 0', collision : value.collision || 'fit'};
			
			// if the element does not have a width then we must set one in the options
			// otherwise collision doesn't work
			if ($element.width() === 0) {
				$element.width(width);
			}

			$element.position(options); 
		}
    };
}());
