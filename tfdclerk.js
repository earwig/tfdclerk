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

mw.loader.using(["mediawiki.ui", "jquery.ui.core"], function() {
    if (mw.config.get("wgNamespaceNumber") != 4 || (
        mw.config.get("wgTitle") != "Templates for discussion" &&
        mw.config.get("wgTitle").indexOf("Templates for discussion/Log/2") != 0))
        return;

    TFDClerk = {
        sysop: $.inArray("sysop", mw.config.get("wgUserGroups")) >= 0,
        counter: 1
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

    TFDClerk._remove_option_box = function(box) {
        var head = box.prev("h4");
        box.remove();
        TFDClerk._unguard(head);
    };

    TFDClerk._add_option_box = function(head, verb, title, callback, options) {
        var box = $("<div/>", {
            id: "tfdclerk-" + verb + "-box-" + TFDClerk.counter++,
            addClass: "tfdclerk-" + verb + "-box"
        })
            .css("border", "1px solid #AAA")
            .css("background-color", "#F9F9F9")
            .css("margin", "0.5em 0")
            .css("padding", "1em")
            .append($("<h5/>", {text: title, style: "padding-top: 0;"}));
        options(box, head, box.prop("id") + "-");
        box.append($("<button/>", {
                text: verb.charAt(0).toUpperCase() + verb.slice(1),
                addClass: "mw-ui-button mw-ui-progressive",
                style: "margin-right: 0.5em;",
                click: function() {
                    callback(head, box);
                }
            }))
            .append($("<button/>", {
                text: "Cancel",
                addClass: "mw-ui-button",
                click: function() {
                    TFDClerk._remove_option_box(box);
                }
            }))
            .insertAfter(head);
    };

    TFDClerk._add_option_table = function(box, options) {
        var table = $("<table/>");
        $.each(options, function(i, opt) {
            table.append($("<tr/>")
                .append(
                    $("<td/>", {
                        style: "padding: 0 0.5em 0.75em 0;"
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

    TFDClerk._build_close_results = function(box, head, prefix) {
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
                style: "margin-right: 1em;"
            })).appendTo(elems);

        $.each(choices, function(i, choice) {
            $("<label/>").append($("<input/>", {
                    name: "result",
                    type: "radio",
                    value: choice
                })).append($("<span/>", {
                    text: choice,
                    style: "margin-right: 1em;"
                })).appendTo(elems);
        });

        $("<label/>").append($("<input/>", {
                name: "result",
                type: "radio",
                value: "Other"
            })).append($("<span/>", {
                text: "Other: "
            })).append($("<input/>", {
                name: "result-other",
                type: "text"
            })).appendTo(elems);

        return elems;
    };

    TFDClerk._build_close_actions = function(box, head, prefix) {
        // TODO
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
                        TFDClerk._build_close_results(box, head, prefix)
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
                        TFDClerk._build_close_actions(box, head, prefix)
                    ]
                ]);
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
});
