/*global document, window, $, ko, debug, setTimeout, alert */
ko.bindingHandlers.dialog = {
	init: function (element, valueAccessor, allBindings, viewModel) {
		var isInitialized = valueAccessor().isInitialized;

		if (isInitialized != true) {
			// getting options from extender
			var options = valueAccessor().options;

			// dialog initialize
			if (options == undefined)
				$(element).dialog();
			else
				$(element).dialog(options);

			// setting initial state for dialog
			var value = ko.utils.unwrapObservable(valueAccessor());
			//        alert("init: " + value);
			if (value == true)
				$(element).dialog("open");
			else
				$(element).dialog("close");

			// getting actual state for valueAccessor on dialog open/close
			$(element).bind("dialogopen", function () {
				valueAccessor()(true);
			});

			$(element).bind("dialogclose", function () {
				valueAccessor()(false);
			});

			valueAccessor().isInitialized = true;
		}
	},
	update: function (element, valueAccessor, allBindingsAccessor) {
		var isInitialized = valueAccessor().isInitialized;
		if (isInitialized == true) {
			// getting actual valueAccessor value
			var value = ko.utils.unwrapObservable(valueAccessor());

			// getting dialog statge
			var isDialogOpen = $(element).dialog("isOpen");

			// show/close dialog on valueAccessor change
			if ((value == true) && (isDialogOpen == false))
				$(element).dialog("open");
			else if ((value == false) && (isDialogOpen == true))
				$(element).dialog("close");
		}
	}
};

ko.extenders.jqueryUiOptions = function (target, options) {
	target.options = options;
	return target;
};