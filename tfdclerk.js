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
};

if (is_tfd_page()) {
    mw.loader.using(dependencies, function() {

/* Main script starts here */

TFDClerk = {
    sysop: $.inArray("sysop", mw.config.get("wgUserGroups")) >= 0,
    tfds: [],
    _api: new mw.Api()
    // TODO: access time?
};

TFD = function(id, head) {
    this.id = id;
    this.head = head;
    this.box = null;
    // TODO: pending conditions for submit button
    this._guard = false;
    this._wikitext = undefined;
    this._wikitext_callbacks = [];
};

TFDClerk.api_get = function(tfd, params, done, fail, always) {
    TFDClerk._api.get(params)
        .done(function(data) {
            if (done !== undefined)
                done.call(tfd, data);
        })
        .fail(function(error) {
            if (done !== undefined)
                fail.call(tfd, error);
        })
        .always(function() {
            if (always !== undefined)
                always.call(tfd);
        });
};

TFDClerk.install = function() {
    $("h4").each(function(i, elem) {
        var head = $(elem);
        if (head.next().hasClass("tfd-closed"))
            return;
        if (head.find(".mw-editsection").length == 0)
            return;

        var tfd = new TFD(TFDClerk.tfds.length, head);
        TFDClerk.tfds.push(tfd);
        tfd.add_hooks();
    });
};

Date.prototype.toDatePickerFormat = function() {
    return this.toISOString().slice(0, 10);
}

TFD.prototype._error = function(msg, extra) {
    var elem = $("<span/>", {
        text: "Error: " + (extra ? msg + ": " : msg),
        style: "color: #A00;"
    });
    if (extra)
        elem.append($("<span/>", {
            text: extra,
            style: "font-family: monospace;"
        }));
    // TODO: more - advise refreshing, reporting persistent errors
    elem.insertAfter(this.box.find("h5"));
    this.box.find(".tfdclerk-submit").prop("disabled", true);
};

TFD.prototype._get_section_number = function() {
    var url = this.head.find(".mw-editsection a").first().prop("href");
    var match = url.match(/section=(.*?)(\&|$)/);
    return match ? match[1] : null;
};

TFD.prototype._with_content = function(callback) {
    var section = this._get_section_number();
    if (section === null)
        return this._error("couldn't get section number");

    if (this._wikitext !== undefined) {
        if (this._wikitext === null)
            this._wikitext_callbacks.push(callback);
        else
            callback.call(this, this._wikitext);
        return;
    }
    this._wikitext = null;

    TFDClerk.api_get(this, {
        action: "query",
        prop: "revisions",
        rvprop: "content",
        rvsection: section,
        revids: mw.config.get("wgRevisionId")
    }, function(data) {
        var pageid = mw.config.get("wgArticleId");
        var content = data.query.pages[pageid].revisions[0]["*"];
        this._wikitext = content;
        callback.call(this, content);
        for (var i in this._wikitext_callbacks)
            this._wikitext_callbacks[i].call(this, content);
    }, function(error) {
        this._error("API query failure", error);
    }, function() {
        this._wikitext_callbacks = [];
    });
};

TFD.prototype._remove_option_box = function() {
    this.box.remove();
    this.box = null;
    this._guard = false;
};

TFD.prototype._add_option_box = function(verb, title, callback, options) {
    var self = this;
    this.box = $("<div/>", {
        id: "tfdclerk-" + verb + "-box-" + this.id,
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

    options.call(this);
    this.box.append($("<button/>", {
            text: verb.charAt(0).toUpperCase() + verb.slice(1),
            addClass: "tfdclerk-submit mw-ui-button mw-ui-progressive",
            style: "margin-right: 0.5em;",
            click: function() { callback.call(self); }
        }))
        .append($("<button/>", {
            text: "Cancel",
            addClass: "mw-ui-button",
            click: function() { self._remove_option_box(); }
        }))
        .insertAfter(this.head);
};

TFD.prototype._add_option_table = function(options) {
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
    this.box.append(table);
};

TFD.prototype._do_close = function() {
    // TODO
    this._remove_option_box();
};

TFD.prototype._do_relist = function() {
    // TODO
    this._remove_option_box();
};

TFD.prototype._is_merge = function() {
    return this.head.nextUntil("h4").filter("p").first().find("b")
        .text() == "Propose merging";
};

TFD.prototype._build_close_results = function() {
    if (this._is_merge())
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

TFD.prototype._add_close_actions = function() {
    this._with_content(function(content) {
        var regex = /\{\{tfd links\|(.*?)(\||\}\})/gi,
            match = regex.exec(content);
        if (match === null)
            return this._error("no templates found in section");

        var actions = this.box.find(".tfdclerk-actions"),
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

TFD.prototype.close = function() {
    if (this._guard)
        return;
    this._guard = true;

    this._add_option_box("close", "Closing discussion", this._do_close,
        function() {
            this._add_option_table([
                [
                    $("<span/>", {text: "Result:"}),
                    this._build_close_results()
                ],
                [
                    $("<label/>", {
                        for: "tfdclerk-comments-" + this.id,
                        text: "Comments:"
                    }),
                    $("<textarea/>", {
                        id: "tfdclerk-comments-" + this.id,
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
            this._add_close_actions();
        });
};

TFD.prototype.relist = function() {
    if (this._guard)
        return;
    this._guard = true;

    this._add_option_box("relist", "Relisting discussion", this._do_relist,
        function() {
            this._add_option_table([
                [
                    $("<label/>", {
                        for: "tfdclerk-date-" + this.id,
                        text: "New date:"
                    }),
                    $("<input/>", {
                        id: "tfdclerk-date-" + this.id,
                        name: "date",
                        type: "date",
                        value: new Date().toDatePickerFormat()
                    })
                ],
                [
                    $("<label/>", {
                        for: "tfdclerk-comments-" + this.id,
                        text: "Comments:"
                    }),
                    $("<textarea/>", {
                        id: "tfdclerk-comments-" + this.id,
                        name: "comments",
                        rows: 2,
                        cols: 60,
                        placeholder: "Optional. Do not sign."
                    })
                ]
            ]);
        });
};

TFD.prototype._build_hook = function(verb, callback) {
    var self = this;
    return $("<span/>", {style: "margin-left: 1em;"})
        .append($("<span/>", {addClass: "mw-editsection-bracket", text: "["}))
        .append($("<a/>", {
            href: "#",
            text: verb,
            title: "tfdclerk: " + verb + " discussion",
            click: function() {
                callback.call(self);
                return false;
            }
        }))
        .append($("<span/>", {addClass: "mw-editsection-bracket", text: "]"}));
};

TFD.prototype.add_hooks = function() {
    $("<span/>", {addClass: "tfdclerk-hooks"})
        .append(this._build_hook("close", this.close))
        .append(this._build_hook("relist", this.relist))
        .appendTo(this.head.find(".mw-editsection"));
};

$(TFDClerk.install);

/* Main script ends here */

    });
}
