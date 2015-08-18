// Templates for discussion clerk script by [[User:The Earwig]]

// Development and bug reports: https://github.com/earwig/tfdclerk

// To install, add:
//     importScript("User:The Earwig/tfdclerk.js");  // [[User:The Earwig/tfdclerk.js]]
// to [[Special:MyPage/common.js]] or [[Special:MyPage/skin.js]]

/*
Copyright (C) 2015 Ben Kurtovic <ben.kurtovic@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

var dependencies = [
    "mediawiki.api",
    "mediawiki.ui",
    "mediawiki.util",
    "jquery.ui.core"
];

var is_tfd_page = function() {
    return mw.config.get("wgAction") == "view" &&
           mw.config.get("wgIsProbablyEditable") == true &&
           mw.config.get("wgRevisionId") == mw.config.get("wgCurRevisionId") &&
           mw.config.get("wgNamespaceNumber") == 4 && (
           mw.config.get("wgTitle") == "Templates for discussion" ||
           mw.config.get("wgTitle").indexOf("Templates for discussion/Log/2") == 0);
}

if (is_tfd_page()) {
    mw.loader.using(dependencies, function() {

/* Main script starts here */

TFDClerk = {
    api: new mw.Api(),
    sysop: $.inArray("sysop", mw.config.get("wgUserGroups")) >= 0,
    // TODO: access time?
    _counter: 1,
    _wikitext_cache: {},
    _wikitext_cache_extra: {}
};

TFDClerk._get_today = function() {
    return new Date().toISOString().slice(0, 10);
};

TFDClerk._guard = function(head) {
    if (head.data("guard"))
        return false;
    head.data("guard", true);
    return true;
};

TFDClerk._unguard = function(head) {
    head.removeData("guard");
};

TFDClerk._get_section_number = function(head) {
    var url = head.find(".mw-editsection a").first().prop("href");
    var match = url.match(/section=(.*?)(\&|$)/);
    return match ? match[1] : null;
};

TFDClerk._error = function(box, msg, extra) {
    var elem = $("<span/>", {
        text: "Error: " + (extra ? msg + ": " : msg),
        style: "color: #A00;"
    });
    if (extra)
        elem.append($("<span/>", {
            text: extra,
            style: "font-family: monospace;"
        }));
    elem.insertAfter(box.find("h5"));
    box.find(".tfdclerk-submit").prop("disabled", true);
};

TFDClerk._with_section_content = function(head, box, callback) {
    var section = TFDClerk._get_section_number(head);
    if (section === null)
        return TFDClerk._error(box, "couldn't get section number");

    var cache = TFDClerk._wikitext_cache,
        extra_cache = TFDClerk._wikitext_cache_extra;
    if (section in cache) {
        if (cache[section] === null) {
            if (section in extra_cache)
                extra_cache[section].push(callback);
            else
                extra_cache[section] = [callback];
        } else
            callback(cache[section]);
        return;
    }
    cache[section] = null;

    TFDClerk.api.get({
        action: "query",
        prop: "revisions",
        rvprop: "content",
        rvsection: section,
        revids: mw.config.get("wgRevisionId")
    }).done(function(data) {
        var pageid = mw.config.get("wgArticleId");
        var content = data.query.pages[pageid].revisions[0]["*"];
        cache[section] = content;
        callback(content);
        if (section in extra_cache) {
            for (var i in extra_cache[section])
                extra_cache[section][i](content);
        }
    }).fail(function(err) {
        TFDClerk._error(box, "API query failure", err);
    }).always(function() {
        if (section in extra_cache)
            delete extra_cache[section];
    });
};

TFDClerk._remove_option_box = function(box) {
    var head = box.prev("h4");
    box.remove();
    TFDClerk._unguard(head);
};

TFDClerk._add_option_box = function(head, verb, title, callback, options) {
    var box_id = "tfdclerk-" + verb + "-box-" + TFDClerk._counter++;
    var box = $("<div/>", {
        id: box_id,
        addClass: "tfdclerk-" + verb + "-box"
    })
        .css("border", "1px solid #AAA")
        .css("color", "#000")
        .css("background-color", "#F9F9F9")
        .css("margin", "0.5em 0")
        .css("padding", "1em")
        .append($("<h5/>", {
            text: title,
            style: "margin: 0; padding: 0 0 0.25em 0;"
        }));
    options(box, head, box_id + "-");
    box.append($("<button/>", {
            id: box_id + "-submit",
            text: verb.charAt(0).toUpperCase() + verb.slice(1),
            addClass: "tfdclerk-submit mw-ui-button mw-ui-progressive",
            style: "margin-right: 0.5em;",
            click: function() {
                callback(head, box);
            }
        }))
        .append($("<button/>", {
            id: box_id + "-cancel",
            text: "Cancel",
            addClass: "mw-ui-button",
            click: function() {
                TFDClerk._remove_option_box(box);
            }
        }))
        .insertAfter(head);
};

TFDClerk._add_option_table = function(box, options) {
    var table = $("<table/>", {style: "border-spacing: 0;"});
    $.each(options, function(i, opt) {
        table.append($("<tr/>")
            .append(
                $("<td/>", {
                    style: "padding-bottom: 0.75em; padding-right: 0.5em;"
                }).append(opt[0]))
            .append(
                $("<td/>", {
                    style: "padding-bottom: 0.75em;"
                }).append(opt[1]))
        );
    });
    box.append(table);
};

TFDClerk._do_close = function(head, box) {
    // TODO
    TFDClerk._remove_option_box(box);
};

TFDClerk._do_relist = function(head, box) {
    // TODO
    TFDClerk._remove_option_box(box);
};

TFDClerk._is_merge = function(head) {
    return head.nextUntil("h4").filter("p").first().find("b")
        .text() == "Propose merging";
};

TFDClerk._build_close_results = function(head) {
    if (TFDClerk._is_merge(head))
        var choices = ["Merge", "Do not merge", "No consensus"];
    else
        var choices = ["Delete", "Keep", "Redirect", "No consensus"];

    var elems = $("<div/>");
    $("<label/>").append($("<input/>", {
            name: "result-speedy",
            type: "checkbox",
            value: "true"
        })).append($("<span/>", {
            text: "Speedy",
            style: "margin: 0 1.25em 0 0.25em;"
        })).appendTo(elems);
    $.each(choices, function(i, choice) {
        $("<label/>").append($("<input/>", {
                name: "result",
                type: "radio",
                value: choice
            })).append($("<span/>", {
                text: choice,
                style: "margin: 0 1.25em 0 0.25em;"
            })).appendTo(elems);
    });
    $("<label/>").append($("<input/>", {
            name: "result",
            type: "radio",
            value: "Other"
        })).append($("<span/>", {
            text: "Other: ",
            style: "margin: 0 0.25em;"
        })).append($("<input/>", {
            name: "result-other",
            type: "text"
        })).appendTo(elems);
    return elems;
};

TFDClerk._add_close_actions = function(box, head) {
    TFDClerk._with_section_content(head, box, function(content) {
        var regex = /\{\{tfd links\|(.*?)(\||\}\})/gi,
            match = regex.exec(content);
        if (match === null)
            return TFDClerk._error(box, "no templates found in section");

        var actions = box.find(".tfdclerk-actions"),
            list = $("<ul/>", {style: "margin: 0 0 0 1em;"});
        do {
            var page = "Template:" + match[1];
            $("<li/>").append($("<a/>", {
                href: mw.util.getUrl(page),
                title: page,
                text: page
            })).appendTo(list);
        } while ((match = regex.exec(content)) !== null);
        actions.empty();
        actions.append(list);
    });
};

TFDClerk.close = function(head) {
    if (!TFDClerk._guard(head))
        return;

    TFDClerk._add_option_box(
        head, "close", "Closing discussion", TFDClerk._do_close,
        function(box, head, prefix) {
            TFDClerk._add_option_table(box, [
                [
                    $("<span/>", {text: "Result:"}),
                    TFDClerk._build_close_results(head)
                ],
                [
                    $("<label/>", {
                        for: prefix + "comments",
                        text: "Comments:"
                    }),
                    $("<textarea/>", {
                        id: prefix + "comments",
                        name: "comments",
                        rows: 2,
                        cols: 60,
                        placeholder: "Optional. Do not sign."
                    })
                ],
                [
                    $("<span/>", {text: "Actions:"}),
                    $("<div/>", {addClass: "tfdclerk-actions"}).append(
                        $("<span/>", {
                            text: "Fetching...",
                            style: "font-style: italic; color: #777;"
                        })),
                ]
            ]);
            TFDClerk._add_close_actions(box, head);
        });
};

TFDClerk.relist = function(head) {
    if (!TFDClerk._guard(head))
        return;

    TFDClerk._add_option_box(
        head, "relist", "Relisting discussion", TFDClerk._do_relist,
        function(box, head, prefix) {
            TFDClerk._add_option_table(box, [
                [
                    $("<label/>", {
                        for: prefix + "date",
                        text: "New date:"
                    }),
                    $("<input/>", {
                        id: prefix + "date",
                        name: "date",
                        type: "date",
                        value: TFDClerk._get_today()
                    })
                ],
                [
                    $("<label/>", {
                        for: prefix + "comments",
                        text: "Comments:"
                    }),
                    $("<textarea/>", {
                        id: prefix + "comments",
                        name: "comments",
                        rows: 2,
                        cols: 60,
                        placeholder: "Optional. Do not sign."
                    })
                ]
            ]);
        });
};

TFDClerk._build_hook = function(head, verb, callback) {
    return $("<span/>", {style: "margin-left: 1em;"})
        .append($("<span/>", {addClass: "mw-editsection-bracket", text: "["}))
        .append($("<a/>", {
            href: "#",
            text: verb,
            title: "tfdclerk: " + verb + " discussion",
            click: function() {
                callback($(head));
                return false;
            }
        }))
        .append($("<span/>", {addClass: "mw-editsection-bracket", text: "]"}));
};

TFDClerk.install = function() {
    $("h4").each(function(i, head) {
        if ($(head).next().hasClass("tfd-closed"))
            return;

        $("<span/>", {addClass: "tfdclerk-hooks"})
            .append(TFDClerk._build_hook(head, "close", TFDClerk.close))
            .append(TFDClerk._build_hook(head, "relist", TFDClerk.relist))
            .appendTo($(head).find(".mw-editsection"));
    });
};

$(TFDClerk.install);

/* Main script ends here */

    });
}
