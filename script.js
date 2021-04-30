"use strict";

/* Process XML file's content and call appropriate generation routines */

function handleXMLContent() {
    $.get("data/activities.xml", function(xml) {
        // Convert XML to JSON to allow grepping, etc.
        var x2js = new X2JS();
        var jsObj = x2js.xml2json(xml);
        // Dereference into the first field (.activities)
        jsObj = jsObj[Object.keys(jsObj)[0]];
        // Dereference into the second field (.activity)
        var content = jsObj[Object.keys(jsObj)[0]];

        var contentDisplay = new ContentDisplay(
            content, ["name"], { x2js: x2js, dropdownCat: true });
        contentDisplay.events.generateUpcomingEvents();

        if (location.pathname.includes("activities.html")) {
            // Create category images that show links on hover
            contentDisplay.categoryView.generate();

            // Configure autocomplete-based search
            // contentDisplay.search.configureSearch("left");
        } else {  // details.html
            contentDisplay.details.generate();
        }
    });
}

$(function() {  // Call this from DOM's .ready()
    // Define header, topnav, and footer in one place (load.html) and
    // reuse them for every page (for consistency and easier updates)
    var placeholders = ["#header", "#topnav", "#footer"];
    for (var i = 0; i < placeholders.length; i++) {
        var sharedEltUrl = "load.html " + placeholders[i] + "-shared";
        // Call handleXML for all pages listed below.
        // Do this after the header load is completed because
        // the header is the only loaded element that may be updated
        if (i == 0 && (location.pathname.includes("activities.html") ||
                       location.pathname.includes("details.html"))) {
            $(placeholders[i]).load(sharedEltUrl, handleXMLContent);
        } else {
            $(placeholders[i]).load(sharedEltUrl);
        }
    }
    if (location.pathname.includes("contact")) {
        // Register slideToggle for buttons on contact page
        var $slideBtn = $(".slide-down-btn");
        $slideBtn.click(function() {
            $(this).next().slideToggle();
        });
    }
});
