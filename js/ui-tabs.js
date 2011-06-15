/*global document, window, $, ko, debug, setTimeout, alert */
/*
 * Knockout UI Tabs
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
			if (typeof debug !== 'undefined') {
				console.debug(new Date().toGMTString() + ' : '  + log);
				$('<div></div>').appendTo('#log').text(new Date().toGMTString() + ' : eyepatch-tabs.js - '  + log);
			}
		},
		Tab = function (data, parentViewModel) {
			this.parentViewModel = parentViewModel;
			this.name = ko.observable(data.name);
			this.iconCssClass = ko.observable(data.iconCssClass || 'icon');
			this.bodyCssClass = ko.observable(data.bodyCssClass || '');
			this.cssClass = ko.observable(data.cssClass || 'tab');
			this.isVisible = ko.observable(true);
			this.contents = data.contents;
			
			if (data.create === undefined) {
				throw new Error('You must supply a create function for each tab');
			}
			this.create = typeof data.create == 'function' ? data.create : eval(data.create);
			
			this.isActive = ko.observable(false);
			var savedActive = $.cookie(this.parentViewModel.id() + 'tabactive');
			if (savedActive !== null) {
				this.isActive(savedActive === this.name());
			} 
			else if (data.isActive !== undefined) {
				this.isActive(data.isActive);
			}
		
			this.show = function (node) {
				$.each(parentViewModel.tabs(), 
					function (index, element) { 
						element.isActive(false);
					});
				this.isActive(true);
				this.saveState();								
			}.bind(this);
			
			this.saveState = function () {
				if ($.cookie === undefined && this.parentViewModel.remember()) {
					alert('You must include $.cookie in order to use this feature');
				} else if (this.parentViewModel.remember()) {	
					logger('saving tab position');
					$.cookie(this.parentViewModel.id() + 'tabactive', this.name()); 
				}
			}
		},
		templateEngine = new ko.jqueryTmplTemplateEngine();
	
    ko.tabs = {
        viewModel: function (configuration) {
			this.id = ko.observable(configuration.id);
			this.remember = ko.observable(configuration.remember || false);
			this.cssClass = ko.observable(configuration.cssClass || 'ui-tabs');
			this.tabs = ko.observableArray([]);
			var self = this;
			for (var i in configuration.tabs) {
				this.tabs.push(new Tab(configuration.tabs[i], self));
			}
        }
    };
	
	ko.addTemplateSafe("tabTemplate", "\
                    <div class=\"${cssClass}\" data-bind=\"click: show, css: { 'tab-active' : isActive }, visible : isVisible, hover : 'tab-hover'\">\
						<span class=\"inner-tab\">\
							<span class=\"${iconCssClass}\"></span> ${ name }\
						</span>\
					</div>", templateEngine);
	
	ko.addTemplateSafe("tabBodyTemplate", "\
                    <div data-bind=\"visible: isActive\" class=\"tab-body-inner ${ bodyCssClass }\">\
					</div>", templateEngine);
						
	ko.addTemplateSafe("tabsContainerTemplate", "\
					<div class=\"${ cssClass }\" >\
						<div class=\"tab-strip\">\
							<div class=\"inner-strip\" data-bind='template: { name : \"tabTemplate\", foreach: tabs }'></div>\
						</div>\
						<div class=\"tab-body ${ bodyCssClass }\" data-bind='template: { name : \"tabBodyTemplate\", foreach: tabs }'></div>\
					</div>", templateEngine);
					
    // The main tabs binding
    ko.bindingHandlers.tabs = {
        init: function (element, valueAccessor, allBindingsAccessor, viewModel) {
			var value = valueAccessor(),
				tabsContainer = element.appendChild(document.createElement("DIV"));
            ko.renderTemplate("tabsContainerTemplate", value, { templateEngine: templateEngine }, tabsContainer, "replaceNode");
			
			// render the tab bodies
			var tabContainers = $('.tab-body-inner', element);			
			for (var i = 0; i < value.tabs().length; i += 1) {
				var tabVM = value.tabs()[i];
				var tab = tabContainers[i];
				tab.style.display = "";	
				tabVM.create(tab, tabVM, viewModel);
				if (!tabVM.isActive()) {
					tab.style.display = "none";	
				}
			}
			
			// call save state on the active tab
			var active = value.tabs().filter(function (i) { return i.isActive() == true; })[0];
			if (active !== undefined) {
				active.saveState();
			}
        }
    };
}());
