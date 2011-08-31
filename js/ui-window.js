/*global document, window, $, ko, debug, setTimeout, alert */
/*
 * Knockout UI Window
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
				$('<div></div>').appendTo('#log').text(new Date().toGMTString() + ' : eyepatch-window.js - ' + log);
			}
		},
		templateEngine = new ko.jqueryTmplTemplateEngine(),
		Button = function (data, parentViewModel) {
			this.parentViewModel = parentViewModel;
			this.iconCssClass = ko.observable(data.iconCssClass);
			this.cssClass = ko.observable(data.cssClass || 'title-button');
			this.onClick = data.onClick;
			this.title = ko.observable(data.title || '');
			this.isFirst = ko.observable(data.isFirst);
			this.isLast = ko.observable(data.isLast);
				
			this.clicked = function (node) {
				if (this.onClick !== undefined) {
					if (this.onClick === 'minimize') {
						this.parentViewModel.minimize();
					} else if (this.onClick === 'close') {
						this.parentViewModel.close();
					}
					else if (typeof this.onClick == 'function') {
						this.onClick.call(this.parentViewModel, this);
					} else {
						// last ditch try and eval
						this.onClick = eval(data.onClick);
						this.onClick.call(this.parentViewModel, this);
					}					
				}
			}.bind(this);
		},
		Window = function (data, parentViewModel) {
			this.parentViewModel = parentViewModel;
			this.cssClass = ko.observable(data.cssClass || parentViewModel.cssClass());
			this.id = data.id;
			this.name = ko.observable(data.name);
			this.width = ko.observable(data.width || 500);
			this.height = ko.observable(data.height || 500);
			this.isPinned = ko.observable(data.isPinned || false);
			
			this.contents = data.contents;
			this.create = typeof data.create == 'function' ? data.create : eval(data.create);
			this.taskbarCssClass = data.taskbarCssClass;
			this.buttons = ko.observableArray([]);
			
			var inputPosition = $.cookie(this.id + 'position') || data.position;
			this.position = ko.observable(inputPosition || '10,10');
			var savedMinimized = $.cookie(this.id + 'state');
			this.isLoading = ko.observable(false);
			this.isMinimized = ko.observable(false);
			if (savedMinimized !== null) {
				this.isMinimized(savedMinimized === 'true');
			} 
			else if (data.isMinimized !== undefined) {
				this.isMinimized(data.isMinimized);
			}
			
			this.buttonsChange = function() {
				for (var i = 0; i < data.buttons.length; i += 1) {
					data.buttons[i].isFirst = (i === 0);
					data.buttons[i].isLast = (i === data.buttons.length - 1);
					this.buttons.push(new Button(data.buttons[i], this));
				}
			}.bind(this);
			
			this.buttonsChange();
			this.buttons.subscribe(this.buttonsChange);
			
			this.left = function() {
				return this.position().split(',')[0] + 'px'
			}.bind(this);
			
			this.top = function() {
				return this.position().split(',')[1] + 'px'
			}.bind(this);
			
			this.minimize = function () {
				this.isMinimized(!this.isMinimized());
			}.bind(this);
			
			this.close = function() {
				this.parentViewModel.removeWindow(this.id);
			}
			
			this.saveState = function () {
				if ($.cookie !== undefined) {
					$.cookie(this.id + 'position', this.position());
					$.cookie(this.id + 'state', this.isMinimized());
				}
			}.bind(this);
		};
	
    ko.windowManager = {
        viewModel: function (configuration) {
			this.cssClass = ko.observable(configuration.cssClass || 'ui-window');
			this.taskbarCssClass = ko.observable(configuration.taskbarCssClass || 'ui-taskbar');
			
			this.windows = ko.observableArray([]);
			ko.utils.arrayForEach(configuration.windows, function(data) {
				this.windows.push(new Window(data, this));
			}.bind(this));
			
			this.addWindow = function(data) {
				this.windows.push(new Window(data, this));
			};
			
			this.removeWindow = function(id) {
				var window = this.windows.remove(function(item) { return item.id === id });
			};
        }
    };
	
	ko.addTemplateSafe("windowTemplate", "\
                    <div class=\"ui-window-stack ${cssClass}\" data-bind=\"window : isPinned, windowVisible : !isMinimized(), style : { height: (height()- 35) + 'px', width: width() + 'px' }, css : { loading : isLoading() }\">\
						<div class=\"inner-window\" data-bind=\"style : { width: (width() + 8) + 'px', height : (height() + 3) + 'px' }\">\
							<div class=\"title-bar\" data-bind='template: { name : \"windowButtonTemplate\", foreach: buttons }'><span class=\"loader\"/></div>\
						</div>\
						<div class=\"outer-content\">\
							<div class=\"inner-content\" data-bind=\"style : { height: (height() - 39) + 'px' }\">\
							</div>\
						</div>\
					</div>", templateEngine);
					
	ko.addTemplateSafe("windowButtonTemplate", "\
                    <div class=\"${cssClass}\" data-bind=\"click : clicked, attr: { title: title }, css : { right : isFirst(), left : isLast() }, hover : 'title-button-hover'\"><div class=\"title-button-inner\"><div class=\"icon ${ iconCssClass }\"></div></div></div>", 
					templateEngine);				
			
	ko.addTemplateSafe("koTaskbarItemTemplate", "\
                    <div class=\"taskbar-item\" data-bind=\"click: minimize, hover: 'taskbar-item-hover', taskbarVisible : isMinimized()\" title=\"${ name }\" data-id=\"${ id }\">\
						<div class=\"inner-taskbar-item\">\
							<div class=\"taskbar-icon ${ taskbarCssClass }\">\
							</div>\
						</div>\
					</div>", templateEngine);
						
	ko.addTemplateSafe("windowContainerTemplate", "\
					<div class=\"window-container\" >\
						<div class=\"windows ${ cssClass }\" data-bind='template: { name : \"windowTemplate\", foreach: windows }'></div>\
						<div class=\"${ taskbarCssClass }\">\
							<div class=\"inner-taskbar\" data-bind='template: { name : \"koTaskbarItemTemplate\", foreach: windows }'></div>\
						</div>\
					</div>", templateEngine);
						
    ko.bindingHandlers.windowManager = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var value = valueAccessor();
				windowContainer = element.appendChild(document.createElement("DIV"));
            
			ko.renderTemplate("windowContainerTemplate", value, { templateEngine: templateEngine }, windowContainer, "replaceNode");
        },
		update : function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var value = valueAccessor(), cssClass = value.cssClass();
			
			// render the window bodies
			var windowContainers = $('.' + cssClass + ' .inner-content', element);			
			for (var i = 0; i < value.windows().length; i += 1) {
				var windowVM = value.windows()[i];
				
				if (windowVM.rendered) {
					continue;
				}
					
				windowVM.create(windowContainers[i], windowVM, viewModel);				
				windowVM.rendered = true;
			}
		}
    };
	
	ko.bindingHandlers.window = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element),
				pinned = ko.utils.unwrapObservable(valueAccessor()),
				dragOptions = {
					addClasses: false,
					handle : '.title-bar',
					/*stack: ".ui-window-stack",*/
					scroll : false,
					stop : function (e, ui) { 
						viewModel.position(ui.offset.left + ',' + ui.offset.top);
						// save position and state in cookie
						viewModel.saveState();
						$(this).maxZIndex({ group : '.ui-window-stack', inc : 1, min: 100000}); 
					},
					drag: function(event, ui) {
						$(this).maxZIndex({ group : '.ui-window-stack', inc : 1, min: 100000});
					},
					create: function(event, ui) { 
						// set pinned status
						if (pinned) {
							$element.css('position', 'fixed');
						}
					}
				};
			// bind events
			$element.draggable(dragOptions).bind('mousedown', function () { 
					$(this).maxZIndex({ group : '.ui-window-stack', inc : 1, min: 100000}); 
			});
			
			$element.css({'position' : 'absolute', 'top': viewModel.top(), 'left' : viewModel.left() });
		},
		update : function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element),
				pinned = ko.utils.unwrapObservable(valueAccessor());
				
			if (pinned) {
				$element.css('position','fixed');
			} else {
				$element.css('position','absolute');
			}
		}
    };
	
	ko.bindingHandlers.taskbarVisible = {
		'init': function (element, valueAccessor) {
			var $element = $(element),
				value = ko.utils.unwrapObservable(valueAccessor()),
				isCurrentlyVisible = element.style.display !== "none";
				
			if (value && !isCurrentlyVisible) {
				element.style.display = "";
			}
			else if ((!value) && isCurrentlyVisible) {
				element.style.display = "none";
			}
		},
        'update': function (element, valueAccessor) {
			var $element = $(element),
				value = ko.utils.unwrapObservable(valueAccessor()),
				isCurrentlyVisible = element.style.display !== "none",
				width = $element.outerWidth(true),
				height = $element.outerHeight(true);
				
			if (value && !isCurrentlyVisible) {
				element.style.display = "";
			}
			else if ((!value) && isCurrentlyVisible) {
				$element.fadeOut('slow', 'swing', 
						function () {
							$('<div></div>').width(width).height(height).css('display', 'inline-block').insertAfter($element).animate({ width: 0}, 500, function () { 
								$(this).remove(); 
							});
						});
			}
		}
    };
	
	ko.bindingHandlers.windowVisible = {
		'init': function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element),
				show = ko.utils.unwrapObservable(valueAccessor());
				
			if (show) {
				$element.css({ 'top': viewModel.top(), 'left' : viewModel.left() });
			}
			else {
				// instead of using display none which can mess up the contents of the window
				$element.css({ 'left' : (-viewModel.width() * 2) + 'px' });
			}
		},
        'update': function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element),
				show = ko.utils.unwrapObservable(valueAccessor()),
				visible = $element.offset().left > -viewModel.width(),
				$clone = $element.clone(false),
				taskbarPos = $('.' + viewModel.parentViewModel.taskbarCssClass()).offset(),
				buttonPos = $('.taskbar-item[data-id="' + viewModel.id + '"]').offset();
					
			if (show) {
				if (buttonPos && !visible) {
					// maximise
					$clone.width(55).height(45).css({'opacity' : 0, 'top' : buttonPos.top + 'px', 'left' : buttonPos.left + 'px'}).appendTo('div.window-container .windows');
					$clone.css('position', 'fixed').show().animate(
						{
							opacity: 1,
							left: viewModel.position().split(',')[0],
							top: viewModel.position().split(',')[1],
							width: $element.outerWidth(false),
							height: $element.outerHeight(false)
						}, 
						200,
						function () {
							$(this).remove();
							$element.css({ 'top': viewModel.top(), 'left' : viewModel.left() });
						}
					);
				}
			}
			else if (taskbarPos) {
				// minimise
				$element.css({ 'left' : (-viewModel.width() * 2) + 'px' });
				$clone.css('position', 'fixed').appendTo('div.window-container .windows').animate(
					{
						opacity: 0,
						left: taskbarPos.left,
						top: taskbarPos.top - 40,
						width: 55,
						height: 45
					}, 
					400,
					function () {
						$(this).remove();
					}
				);
			}
			// save the state in the cookie
			viewModel.saveState();
		}
    };
}());
