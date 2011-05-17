/*global document, window, $, ko, debug, setTimeout, alert */
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
			this.width = ko.observable(data.width || 190);
			var self = this;
			var itemMapping =  {
				items : {
					create: function (options) {
						return new MenuItem(options.data, self);
					}
				}
			};			
			ko.mapping.fromJS(data, itemMapping, this);
		},
		MenuItem = function (data, container) {
			this.dataItem = {};
			this.container = container;
			this.text = ko.observable(data.text || '');
			this.iconClass = ko.observable(data.iconClass);
			this.separator = ko.observable(data.separator || false);
			this.run = data.run;
			this.items = ko.observableArray(data.items || []);
			this.width = ko.observable(container.width());
			this.disabled = ko.observable(false);
			
			if (data.items !== undefined && data.items.length > 0) {
				this.subMenu = new Menu({ items : data.items }, this);
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
			this.build = configuration.build;
			
			var self = this;
			var menuMapping =  {
				contextMenus : {
					create: function (options) {
						return new Menu(options.data, self);
					}
				}
			};
			
			ko.mapping.fromJS(configuration, menuMapping, this);
        }
    };
	
	templateEngine.addTemplate("contextItemTemplate", "\
					<li data-bind=\"subContext: hasChildren(), click : onClick, bubble : false, css : { separator : separator, disabled : disabled }, style : { width : itemWidth() }\">\
						<span class=\"inner\"><span class=\"icon ${iconClass}\"></span><label data-bind=\"css : { parent : hasChildren() }, style : { width : labelWidth() }\">\
							${ text }</label></span>\
						{{if hasChildren() }}\
							<div class=\"ui-context nocontext\" style=\"position:absolute;\" >\
								<ul data-bind='template: { name: \"contextItemTemplate\", foreach: subMenu.items }'></ul>\
							</div>\
						{{/if}}\
					</li>");
	
	templateEngine.addTemplate("contextMenuTemplate", "\
					<div class=\"ui-context nocontext\" style=\"position:absolute;\" data-bind=\"position: { width: menu.width(), of : mousePosition }, style : { zIndex : zIndex }\">\
						<ul data-bind='template: { name: \"contextItemTemplate\", foreach: menu.items }'></ul>\
					</div>");

	ko.bindingHandlers.contextMenu = {
		'init': function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element), menuContainer, item, config, menu,
				value = ko.utils.unwrapObservable(valueAccessor());
				
			$element
				.addClass('nocontext')
				.mousedown(function (e) {
					if (e.which === 3) {
						config = value.build(e, viewModel);
						menu = value.contextMenus().filter(function (x) { 
								return x.name() === config.name; 
							})[0];
						// remove any existing menus active
						$('.ui-context').remove();
						
						if (menu !== undefined)	{
							config.menu = menu;
							config.mousePosition = e;
							menuContainer = $('<div></div>').appendTo('body');
							// assign the disabled items
							if (config.disable !== undefined && config.disable.length > 0) {
								for (var i = 0; i < config.menu.items().length; i += 1) {
									item = config.menu.items()[i];
									item.disabled(config.disable.indexOf(item.text()) !== -1);
								}
							}
							// assign the data item
							for (var j = 0; i < config.menu.items().length; j += 1) {
								config.menu.items()[j].addDataItem(viewModel);
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
			
			$('body').click(function () {
				$('.ui-context').remove();
			});
		}
    };

	ko.bindingHandlers.subContext = {
		'init': function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element),
				value = ko.utils.unwrapObservable(valueAccessor()),
				width = ko.utils.unwrapObservable(viewModel.width());
			
			if (value) {
				$('.ui-context', $element).hide();
				$element.hover(function () {
					var $parent = $(this);
					$('.ui-context', $parent).first().toggle()
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
