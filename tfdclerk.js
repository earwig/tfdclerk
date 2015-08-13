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

mw.loader.using(["mediawiki.api"], function() {
    if (mw.config.get("wgNamespaceNumber") != 4 || (
        mw.config.get("wgTitle") != "Templates for discussion" &&
        mw.config.get("wgTitle").indexOf("Templates for discussion/Log/2") != 0))
        return;

    TFDClerk = {
        // TODO
        sysop: $.inArray("sysop", mw.config.get("wgUserGroups")) >= 0
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
    }

    TFDClerk._add_option_box = function(head, verb) {
        var box = $("<div/>", { addClass: "tfdclerk-" + verb + "-box" })
            .css("border", "1px solid #AAA")
            .css("background-color", "#F5F5F5")
            .css("margin", "0.5em 0")
            .css("padding", "1em");
        box.append(
            $("<button/>", {
                text: "Cancel",
                click: function(b) {
                    return function() { TFDClerk._remove_option_box(b); };
                }(box)
            }))
            .insertAfter(head);
    };

    TFDClerk.close = function(head) {
        if (!TFDClerk._guard(head))
            return;

        TFDClerk._add_option_box(head, "close");
        // TODO
    };

    TFDClerk.relist = function(head) {
        if (!TFDClerk._guard(head))
            return;

        TFDClerk._add_option_box(head, "relist");
        // TODO
    };

    TFDClerk._build_hook = function(head, verb, callback) {
        return $("<span/>", {style: "margin-left: 1em;"})
            .append($("<span/>", {addClass: "mw-editsection-bracket", text: "["}))
            .append($("<a/>", {
                href: "#",
                text: verb,
                title: "tfdclerk: " + verb + " discussion",
                click: function(h) {
                    return function() { callback($(h)); return false; };
                }(head)
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
