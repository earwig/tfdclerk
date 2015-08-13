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
    };

    TFDClerk.close = function(head) {
        // TODO
        console.log("closing");
        console.log(head);
    };

    TFDClerk.relist = function(head) {
        // TODO
        console.log("relisting");
        console.log(head);
    };

    TFDClerk._build_hook = function(head, name, callback) {
        return $("<span/>", {style: "margin-left: 1em;"})
            .append($("<span/>", {addClass: "mw-editsection-bracket", text: "["}))
            .append($("<a/>", {
                href: "#",
                text: name,
                click: function(h) {
                    return function() { callback(h); return false; }
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
