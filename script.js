// General helper for converting a key value into a valid ID
function makeId(string) {
    return string.toLowerCase()
        .replace(/[^a-z0-9 ]+/g, '')  // Keep alphanumeric chars and spaces
        .replace(/ /g, '-');  // Replace spaces with dashes
}

// Create image(s) with the src, title, and alt based on item's keys and image
// tags, if present.  Image tags are used to show multiple images.  Stop after
// one if the last argument is false.  Return the images as a jQuery object.
// Use the 4h Clover as the backup image
function makeImgs(item, idKeys, useAllExts = true) {
    function makeImg(title) {
        return $("<img>")
            .prop("src", "images/" + makeId(title) + ".jpg")
            .prop("title", title)
            .prop("alt", title)
            .attr("onerror", "this.src='images/4h-clover.png'");
    }

    var title = "";
    for (var i = 0; i < idKeys.length; i++) {
        title += item[idKeys[i]] + " ";
    }
    title = title.slice(0, -1);
    if ("images" in item && item.images) {
        // Collect results in a jQuery object for use/modification in callers
        var $imgs = $();
        var imageExts = item.images.image;  // Array of image extensions
        for (var i = 0; i < imageExts.length; i++) {
            // Use the item title plus this extension for image title
            $imgs = $imgs.add(makeImg(title + " " + imageExts[i]));
            if (!useAllExts) break;  // Need only one image
        }
        return $imgs;
    }
    // No image tags--use the title
    return makeImg(title);
}


/* Link creation and helpers */

function makeDetailsHref(item, idKeys) {
    // Build the link with URL search params out of item's idKeys values
    var urlParams = new URLSearchParams();
    for (var j = 0; j < idKeys.length; j++) {
        urlParams.set(idKeys[j], makeId(item[idKeys[j]]));
    }
    var urlPath = location.pathname.replace("s.html", "-details.html?")
    return urlPath + urlParams.toString();
}

function makeDetailsText(item, idKeys) {
    // Build the link text out of item's idKeys values
    var text = "";
    for (var j = 0; j < idKeys.length; j++) {
        text += item[idKeys[j]] + " ";
    }
    return text.slice(0, -1);  // Drop the extra " " at the end
}

function makeDetailsLink(item, idKeys) {
    return $("<a>").prop("href", makeDetailsHref(item, idKeys))
        .text(makeDetailsText(item, idKeys));
}


/* Generate details page and related functions */

// Convert key (coming from an XML tag) into a heading
function makeHeading(key) {
    // Upper-case the first character
    return (key.charAt(0).toUpperCase() + key.slice(1))
        .replace(/-/g, ' ');  // Replace dashes with spaces
}

// Recursively display the object and all its values; start at heading level 3
function displayObject(obj, idKeys, $parent, hLevel = 3) {
    for (var prop in obj) {
        if (prop === "images") return;  // Ignore the image tags here
        // Skip over features w/o details or those used in the header
        if (obj[prop] && !idKeys.includes(prop)) {
            if (typeof obj[prop] === "string") {
                $parent
                    // Make a heading out of prop
                    .append($("<h" + hLevel + ">").text(makeHeading(prop)))
                    // Make a paragraph out of prop's value in obj
                    .append($("<p>").text(obj[prop]));
            } else if (Array.isArray(obj[prop])) {
                // Don't make a heading out of prop for arrays
                // It's usually duplicative of the prop higher up
                displayArray(obj[prop], idKeys, $parent, hLevel);
            } else {
                $parent
                    // Make a heading out of prop
                    .append($("<h" + hLevel + ">").text(makeHeading(prop)));
                // Recursively display the object that is prop's value in obj
                displayObject(obj[prop], idKeys, $parent, hLevel + 1);
            }
        }
    }
}

// Recursively display the array and all its elements
function displayArray(arr, idKeys, $parent, hLevel) {
    var $ol = $("<ol>").appendTo($parent);
    for (var i = 0; i < arr.length; i++) {
        var $li = $("<li>").appendTo($ol);
        if (typeof arr[i] === "string") {
            $li.text(arr[i]);  // String: list item
        } else if (Array.isArray(arr[i])) {
            // Recursively display the array in arr[i]
            displayArray(arr[i], idKeys, $li, hLevel);
        } else {
            // Recursively display the object at arr[i]
            displayObject(arr[i], idKeys, $li, hLevel);
        }
    }
}

function generateDetailsPage(data, idKeys) {
    // Find the item requested by search params
    var urlParams = new URLSearchParams(location.search);
    var itemInfo;  // Save the matching object in itemInfo
    dataLoop: for (var i = 0; i < data.length; i++) {
        for (var j = 0; j < idKeys.length; j++) {
            var requestedId = urlParams.get(idKeys[j]);
            if (makeId(data[i][idKeys[j]]) !== requestedId) {
                continue dataLoop;  // A key mismatch, go to next item
            }
        }
        itemInfo = data[i];
        break;
    }

    // Make heading out of the displayed item's keys
    $("#header h1").text(makeDetailsText(itemInfo, idKeys));

    // Fill in the page: recursively display itemInfo
    displayObject(itemInfo, idKeys, $(".column.main"));
    // Make image(s) in the right column
    makeImgs(itemInfo, idKeys).appendTo($(".column.right"));
}


/* Generate links for data items and add to list */

function generateLinks(list, data, idKeys) {
    for (var i = 0; i < data.length; i++) {
        var link = makeDetailsLink(data[i], idKeys);
        $("<li>").append(link).appendTo(list);
    }
}


/* Search (autocomplete in right column) and related functions */

// Return true if match succeeds in this object or recursively in values
function matchInObject(obj, matcher) {
    for (var prop in obj) {
        // Skip over features w/o details
        if (obj[prop]) {
            if (typeof obj[prop] === "string") {
                if (matcher.test(obj[prop])) {
                    return true;
                }
            } else if (Array.isArray(obj[prop])) {
                if (matchInArray(obj[prop], matcher)) {
                    return true;
                }
            } else {
                if (matchInObject(obj[prop], matcher)) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Return true if match succeeds in this array or recursively in elements
function matchInArray(arr, matcher) {
    for (var i = 0; i < arr.length; i++) {
        if (typeof arr[i] === "string") {
            if (matcher.test(arr[i])) {
                return true;
            }
        } else if (Array.isArray(arr[i])) {
            if (matchInArray(arr[i], matcher)) {
                return true;
            }
        } else {
            if (matchInObject(arr[i], matcher)) {
                return true;
            }
        }
    }
    return false;
}

function configureSearch(data, idKeys, column="right") {
    $("#search-" + column).autocomplete({
        source: function(request, response) {
            // Only match the typed text at the start of words
            var pattern = "\\b" + $.ui.autocomplete.escapeRegex(request.term);
            var matcher = new RegExp(pattern, "i");
            response($.grep(data, function(item) {
                // Look for the matching text throughout the object
                return matchInObject(item, matcher);
            }));
        },
        minLength: 0,
        focus: function(event, ui) {
            // Pop up the focused element's image
            $(".search-img").hide();
            $(".column." + column + " img").hide();
            var searchPos = $("#search-" + column).position();
            makeImgs(ui.item, idKeys, false)  // Make only one image
                .addClass("search-img")
                // Place the image in line with search box and below the cursor
                .css({"left": searchPos.left + "px",
                      "top": (event.clientY + 30) + "px"})
                .appendTo($(document.body));
        },
        close: function(event, ui) {
            // Hide the image triggered by focus
            $(".search-img").hide();
            $(".column." + column + " img").show();
        },
        select: function(event, ui) {
            // Setting location and location.href has the same effect, if
            // location isn't set.  Both act as if the link is clicked, so
            // "Back" goes to current page).  location.replace(url) is like
            // HTTP redirect--it skips the current page for back navigation.
            // $(location).prop('href', url) is the jQuery way but it's not
            // an improvement over the below.

            // Navigate to the selected item
            location.href = makeDetailsHref(ui.item, idKeys);
        }
    }).autocomplete( "instance" )._renderItem = function(ul, item) {
        return $("<li>")
            .append("<div><i>" + makeDetailsText(item, idKeys) + "</i>" + "</div>")
            .appendTo(ul);
    };
}


/* Generate category view (image with links on hover) in main column */

function generateCategoryView(data, idKeys) {
    var $mainColumn = $(".column.main");
    for (var i = 0; i < data.length; i++) {
        var category = data[i]["category"];
        var categoryId = makeId(category);
        var $categoryUl = $('#' + categoryId);
        // If we haven't seen this category yet, create an image of this item
        // and pop-up text (header & link list)
        if ($categoryUl.length === 0) {
            $categoryUl = $("<ul>").attr("id", categoryId);
            // Make only one image
            var $img = makeImgs(data[i], idKeys, false).addClass("cat-img");
            $("<div>").addClass("cat-div")
                .append($img)
                .append($("<div>").addClass("cat-text")
                    .append($("<h4>").text(category))
                    .append($categoryUl))
                .appendTo($mainColumn);
        }
        // Make link for the item and add to the category list
        var link = makeDetailsLink(data[i], idKeys);
        $("<li>").append(link).appendTo($categoryUl);
    }
}


/* Set up link to next activity in right column */

// Construct Date object out of item for comparisons
function makeDate(item) {
    var stringDate = item["month"] + " " + item["day"] + " " + item["year"];
    return new Date(stringDate);
}

// Find data item with the closest date in the future and
// make a link to it in the right column
function generateNextActivity(data, idKeys) {
    var nextActivityInfo;
    var today = new Date();
    for (var i = 0; i < data.length; i++) {
        var iDate = makeDate(data[i]);
        if (iDate > today) {
            if (nextActivityInfo == null) {
                nextActivityInfo = data[i];
                continue;
            }
            var nextActivityDate = makeDate(nextActivityInfo);
            if (iDate < nextActivityDate) {
                nextActivityInfo = data[i];
            }
        }
    }
    makeDetailsLink(nextActivityInfo, idKeys).appendTo($(".column.right"));
}


/* Handle events in dropdown filters in main column */

// Tracks the current filter selections {feature: detail, ...}
var curFilters = {};

function clearFilters() {
    curFilters = {};  // Remove all filter settings
    // Clear selected style for all filter buttons
    $("#filter-group").find(".selected").removeClass("selected");
    $(this).hide();  // Hide the clear-all-filters button

    // Empty the list of matching items and make links for all items
    var $frUl = $("#filter-results").empty();
    generateLinks($frUl, xmlData, xmlKeys);
}

function updateFilter() {
    // Get the value for filter (in this node) and the filter
    // (in grandparent's first element child)
    var value = this.textContent.toLowerCase();
    var filterBtn = this.parentNode.parentNode.firstElementChild;
    var filter = filterBtn.textContent.toLowerCase();

    // Clear selected style in buttons of this filter's dropdown-content
    // (in case there was a selection in this filter before)
    $(this.parentNode).find(".selected").removeClass("selected");

    if (curFilters[filter] === value) {
        // Same setting for filter clicked: delete from current
        // filters and clear selected style for filter button
        delete curFilters[filter];
        $(filterBtn).removeClass("selected");
    } else {
        // New or different setting for filter: update current filters
        // and add selected style to the value and filter buttons
        curFilters[filter] = value;
        $(this).addClass("selected");
        $(filterBtn).addClass("selected");
    }

    // Hide the clear-all-filters button, if no filter is set; otherwise show
    if ($.isEmptyObject(curFilters)) {
        $("#clear-filters").hide();
    } else {
        $("#clear-filters").show();
    }

    // Recompute the array of items matching the filters from scratch
    var filteredData = $.grep(xmlData, function(item) {
        // Check item's entries against every filter's selection
        // Populate the results list with links to detail pages 
        for (var filter in curFilters) {
            // Values in curFilters are lowercase
            if (!item[filter].toLowerCase().includes(curFilters[filter]))
                return false;  // Any match fails: skip item
        }
        return true;  // Passed all filters: keep item
    });

    // Empty the list of matching items and make links for matching items
    var $frUl = $("#filter-results").empty();
    generateLinks($frUl, filteredData, xmlKeys);
};


/* Process XML file's data and call appropriate generation routines */

// Globals are only used in updateFilters
var xmlData;  // The data from the XML file
var xmlKeys;  // The keys used for identifying an item (vary by page)

function handleXMLData() {
    // Save names of data files and keys used for identifying items
    if (location.pathname.includes("meeting")) {
        var fileName = "data/meetings.xml";
        xmlKeys = ["month", "day", "year"];
    } else if (location.pathname.includes("garden")) {
        var fileName = "data/gardens.xml";
        xmlKeys = ["name"];
    } else if (location.pathname.includes("recipe")) {
        var fileName = "data/recipes.xml";
        xmlKeys = ["name"];
    } else if (location.pathname.includes("resource")) {
        var fileName = "data/resources.xml";
        xmlKeys = ["kind", "name"];
    }
    $.get(fileName, function(xml) {
        // Convert XML to JSON to allow grepping, etc.
        var x2js = new X2JS();

        var jsObj = x2js.xml2json(xml);
        // Dereference into the first field (such as .meetings)
        jsObj = jsObj[Object.keys(jsObj)[0]];
        // Dereference into the second field (such as .meeting)
        xmlData = jsObj[Object.keys(jsObj)[0]];

        // If the location includes a search entry, we're customizing the
        // details page for the requested item (e.g., meeting-details.html);
        // otherwise,we're setting up the top-level page (e.g., meetings.html)
        if (location.search) {
            generateDetailsPage(xmlData, xmlKeys);
        } else if (location.pathname.includes("gardens.html")) {
            // Set up basic (complete) list of links
            var $ul = $("<ul>").appendTo($(".column.main"));
            generateLinks($ul, xmlData, xmlKeys);
        } else if (location.pathname.includes("recipes.html")) {
            // Create category images that show links on hover
            generateCategoryView(xmlData, xmlKeys);
            // Configure autocomplete-based search
            configureSearch(xmlData, xmlKeys);
        } else if (location.pathname.includes("resources.html")) {
            function kindFilter (kind) {
                return xmlData.filter(function (item) {
                    return item.kind === kind;
                });
            }

            // Configure autocomplete-based search for Topics in main column
            configureSearch(kindFilter("Topic:"), xmlKeys, "main");

            // Configure autocomplete-based search for Warmups in right column
            configureSearch(kindFilter("Warmup:"), xmlKeys, "right");
        } else {  // meetings.html
            // Set up filters for selecting specific meetings by data
            // Register on-click listener for filter selections
            $("#filter-group .dropdown-content button").click(updateFilter);
            // Register on-click listener for clear-all-filters
            var $cf = $("#clear-filters").click(clearFilters);
            $cf.hide();  // hide the clear-all-filters button initially

            // Click on the latest value in the last dropdown (current year)
            // This is the first button under dropdown-content of the last div
            // (a dropdown) under filter-group
            $("#filter-group div:last-child .dropdown-content button:first-child").click();

            // Generate the next meeting's link in the right column
            generateNextActivity(xmlData, xmlKeys);
        }
    });
}

$(function() {  // Call this from DOM's .ready()
    // Define header, topnav, and footer in one place (load.html) and
    // reuse them for every page (for consistency and easier updates)
    var placeholders = ["#header", "#topnav", "#footer"];
    for (var i = 0; i < placeholders.length; i++) {
        var sharedEltUrl = "load.html " + placeholders[i] + "-shared";
        // Call handleXML for all meeting, garden, and recipe pages
        // (e.g., meetings.html & meeting-details.html).
        // Do this after the header load is completed because
        // the header is the only loaded element that may be updated
        if (i == 0 && (location.pathname.includes("meeting") ||
                       location.pathname.includes("garden") ||
                       location.pathname.includes("recipe") ||
                       location.pathname.includes("resource"))) {
            $(placeholders[i]).load(sharedEltUrl, handleXMLData);
        } else {
            $(placeholders[i]).load(sharedEltUrl);
        }
    }
    if (location.pathname.includes("faq") ||
        location.pathname.includes("contact")) {
        // Register slideToggle for buttons on FAQ and contact pages
        var $slideBtn = $(".slide-down-btn");
        $slideBtn.click(function() {
            $(this).next().slideToggle();
        });
    }
});
