/*global document, window, $, ko, debug, setTimeout, alert */
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
			this.iconClass = ko.observable(data.iconClass);
			this.onClick = ko.observable(data.onClick);
			this.position = data.position;
			this.isFirst = ko.observable(data.isFirst);
			this.isLast = ko.observable(data.isLast);
				
			this.clicked = function (node) {
				if (this.onClick() !== undefined) {
					this.parentViewModel[this.onClick()]();
				}
			}.bind(this);
		},
		Window = function (data, parentViewModel) {
			this.parentViewModel = parentViewModel;
			this.cssClass = ko.observable(data.cssClass || parentViewModel.cssClass());
			this.isVisible = ko.observable(data.isVisible || true);
			this.name = ko.observable(data.name);
			this.width = ko.observable(500);
			this.height = ko.observable(500);
			
			this.contents = data.contents;
			this.create = data.create;
			this.taskbarClass = data.taskbarClass;
			this.buttons = ko.observableArray([]);
			
			var inputPosition = $.cookie(this.name() + 'position') || data.position;
			this.position = ko.observable(inputPosition || '10,10');
			var savedMinimized = $.cookie(this.name() + 'state');
			this.isMinimized = ko.observable(false)
			if (savedMinimized !== null) {
				this.isMinimized(savedMinimized === 'true');
			} 
			else if (data.isMinimized !== undefined) {
				this.isMinimized(data.isMinimized);
			}
			
			for (var i = 0; i < data.buttons.length; i += 1) {
				data.buttons[i].position = i;
				data.buttons[i].isFirst = (i === 0);
				data.buttons[i].isLast = (i === data.buttons.length - 1);
				this.buttons.push(new Button(data.buttons[i], this));
			}
			
			this.show = function () {
				
			}.bind(this);
			
			this.minimize = function () {
				this.isMinimized(!this.isMinimized());
			}.bind(this);
			
			this.togglePin = function () {
				alert('pinned');
			}.bind(this);
			
			this.saveState = function () {
				if ($.cookie !== undefined) {
					$.cookie(this.name() + 'position', this.position());
					$.cookie(this.name() + 'state', this.isMinimized());
				}
			}.bind(this);
		};
	
    ko.koWindowManager = {
        viewModel: function (configuration) {
			this.cssClass = ko.observable('ui-window');
			this.taskbarClass = ko.observable('ui-taskbar');
			
			this.windows = ko.observableArray([]);
			ko.utils.arrayForEach(configuration.windows, function(data) {
				this.windows.push(new Window(data, this));
			}.bind(this));
        }
    };
	
	templateEngine.addTemplate("koWindowTemplate", "\
                    <div class=\"${cssClass}\" data-bind=\"koWindow : {}, koWindowVisible : !isMinimized(), style : { height: (height()- 35) + 'px', width: width() + 'px' }\">\
						<div class=\"inner-window\" data-bind=\"style : { width: (width() + 8) + 'px', height : (height() + 3) + 'px' }\">\
							<div class=\"title-bar\" data-bind='template: { name : \"koWindowButtonTemplate\", foreach: buttons }'></div>\
						</div>\
						<div class=\"outer-content\">\
							<div class=\"inner-content\" data-bind=\"style : { height: (height() - 39) + 'px' }\">\
							</div>\
						</div>\
					</div>");
					
	templateEngine.addTemplate("koWindowButtonTemplate", "\
                    <div class=\"title-button\" data-bind=\"click : clicked, css : { right : isFirst(), left : isLast() }, hover : 'title-button-hover'\"><div class=\"title-button-inner\"><div class=\"icon ${ iconClass }\"></div></div></div>");				
			
	templateEngine.addTemplate("koTaskbarItemTemplate", "\
                    <div class=\"taskbar-item\" data-bind=\"click: minimize, hover: 'taskbar-item-hover', epTaskbarVisible : isMinimized()\" title=\"${ name }\">\
						<div class=\"inner-taskbar-item\">\
							<div class=\"taskbar-icon ${ taskbarClass }\">\
							</div>\
						</div>\
					</div>");
						
	templateEngine.addTemplate("koWindowContainerTemplate", "\
					<div class=\"window-container\" >\
						<div class=\"windows\" data-bind='template: { name : \"koWindowTemplate\", foreach: windows }'\"></div>\
						<div class=\"${ taskbarClass }\">\
							<div class=\"inner-taskbar\" data-bind='template: { name : \"koTaskbarItemTemplate\", foreach: windows }'></div>\
						</div>\
					</div>");
						
    ko.bindingHandlers.koWindowManager = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var value = valueAccessor(),
				length = value.windows().length,
				cssClass = value.cssClass(),
				tabsContainer = element.appendChild(document.createElement("DIV"));
            
			ko.renderTemplate("koWindowContainerTemplate", value, { templateEngine: templateEngine }, tabsContainer, "replaceNode");
			
			// render the window bodies
			var windowContainers = $('.' + cssClass + ' .inner-content', element);			
			for (var i = 0; i < value.windows().length; i += 1) {
				var windowVM = value.windows()[i],
					body = windowContainers[i],
					parent = $(body).closest('.' + cssClass);
					
				parent.get(0).style.display = "";
				windowVM.create(body, windowVM, viewModel);
				//alert('visible '+ windowVM.isVisible() + ' min ' + windowVM.isMinimized());
				
				if (!windowVM.isVisible() || windowVM.isMinimized()) {
					parent.get(0).style.display = "none";	
				}
			}
        }
    };
	
	ko.bindingHandlers.koWindow = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
				var $element = $(element),
				dragOptions = {
					addClasses: false,
					handle : '.title-bar',
					stack: "." + viewModel.cssClass(),
					scroll : false,
					stop : function (e, ui) { 
						viewModel.position(ui.offset.left + ',' + ui.offset.top);
						// save position and state in cookie
						viewModel.saveState();
					}
				};
				// bind events
				$element.draggable(dragOptions).bind('mousedown', function () { 
						$(this).maxZIndex({ group : '.' + viewModel.cssClass(), inc : 1}); 
					});
				$element.css({'position' : 'absolute', 'top': viewModel.position().split(',')[1] + 'px', 'left' : viewModel.position().split(',')[0] + 'px'});
			}
    };
	
	ko.bindingHandlers.epTaskbarVisible = {
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
	
	ko.bindingHandlers.koWindowVisible = {
		'init': function (element, valueAccessor, allBindingsAccessor, viewModel) {
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
        'update': function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var $element = $(element),
				value = ko.utils.unwrapObservable(valueAccessor()),
				isCurrentlyVisible = element.style.display !== "none",
				$clone = $element.clone(false),
				taskbarPos = $('.' + viewModel.parentViewModel.taskbarClass()).offset(),
				buttonPos = $('.' + viewModel.taskbarClass).offset();
					
			if (value && !isCurrentlyVisible) {
				// maximise
				$clone.width(55).height(45).css({'opacity' : 0, 'top' : buttonPos.top + 'px', 'left' : buttonPos.left + 'px'}).appendTo('body');
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
						$element.show();
					}
				);
			}
			else if ((!value) && isCurrentlyVisible) {
				// minimise
				$element.hide();
				$clone.css('position', 'fixed').appendTo('body').animate(
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
