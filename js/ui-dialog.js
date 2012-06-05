/*global document, window, $, ko, debug, setTimeout, alert */
ko.bindingHandlers.dialog = {
    init: function (element, valueAccessor, allBindings, viewModel) {
        $(element).dialog();

        var value = ko.utils.unwrapObservable(valueAccessor());
        if (value == true)
            $(element).dialog("open");
        else
            $(element).dialog("close");
    },
    update: function (element, valueAccessor, allBindingsAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());
        var isDialogOpen = $(element).dialog("isOpen");

        if ((value == true) && (isDialogOpen == false))
            $(element).dialog("open");
        else if ((value == false) && (isDialogOpen == true))
            $(element).dialog("close");
    }
};