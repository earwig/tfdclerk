// Templates for discussion clerk script by [[User:The Earwig]]

// Version: @TFDCLERK_VERSION_FULL@
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
    version: "@TFDCLERK_VERSION@",
    script_url: "https://en.wikipedia.org/wiki/User:The_Earwig/tfdclerk.js",
    author_url: "https://en.wikipedia.org/wiki/User_talk:The_Earwig",
    github_url: "https://github.com/earwig/tfdclerk",
    tfds: [],

    _api: new mw.Api(),
    _sysop: $.inArray("sysop", mw.config.get("wgUserGroups")) >= 0
    // TODO: access time?
};

TFD = function(id, head) {
    this.id = id;
    this.head = head;
    this.box = null;

    this._guard = false;
    this._submit_blockers = [];
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

TFD.prototype._block_submit = function(reason) {
    if (this._submit_blockers.indexOf(reason) < 0)
        this._submit_blockers.push(reason);

    this.box.find(".tfdclerk-submit").prop("disabled", true);
};

TFD.prototype._unblock_submit = function(reason) {
    var index = this._submit_blockers.indexOf(reason);
    if (index >= 0)
        this._submit_blockers.splice(index, 1);

    if (this._submit_blockers.length == 0)
        this.box.find(".tfdclerk-submit").prop("disabled", false);
};

TFD.prototype._error = function(msg, extra) {
    var elem = $("<span/>", {
        html: "<strong>Error:</strong> " + (extra ? msg + ": " : msg),
        style: "color: #A00;"
    });
    if (extra)
        elem.append($("<span/>", {
            text: extra,
            style: "font-family: monospace;"
        }));

    var contact = $("<a/>", {
        href: TFDClerk.author_url,
        title: TFDClerk.author_url.split("/").pop().replace(/_/g, " "),
        text: "contact me"
    }), file_bug = $("<a/>", {
        href: TFDClerk.github_url,
        title: TFDClerk.github_url.split("/").splice(-2).join("/"),
        text: "file a bug report"
    });
    elem.append($("<br/>"))
        .append($("<small/>", {
            html: "This may be caused by an edit conflict or other " +
            "intermittent problem. Try refreshing the page. If the error " +
            "persists, you can " + contact.prop("outerHTML") + " or " +
            file_bug.prop("outerHTML") + "."
        }));
    elem.insertAfter(this.box.find("h5"));
    this._block_submit("error");
};

TFD.prototype._get_discussion_page = function() {
    var url = this.head.find(".mw-editsection a").first().prop("href");
    var match = url.match(/title=(.*?)(\&|$)/);
    return match ? match[1] : null;
};

TFD.prototype._get_section_number = function() {
    var url = this.head.find(".mw-editsection a").first().prop("href");
    var match = url.match(/section=(.*?)(\&|$)/);
    return match ? match[1] : null;
};

TFD.prototype._with_content = function(callback) {
    var title = this._get_discussion_page(),
        section = this._get_section_number();
    if (title === null || section === null)
        return this._error("couldn't find discussion section");

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
        indexpageids: "",
        rvsection: section,
        titles: title
    }, function(data) {
        var pageid = data.query.pageids[0];
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
    this._submit_blockers = [];
};

TFD.prototype._add_option_box = function(verb, title, callback, options) {
    var self = this;
    this.box = $("<div/>", {
        id: "tfdclerk-" + verb + "-box-" + this.id,
        addClass: "tfdclerk-" + verb + "-box"
    })
        .css("position", "relative")
        .css("border", "1px solid #AAA")
        .css("color", "#000")
        .css("background-color", "#F9F9F9")
        .css("margin", "0.5em 0")
        .css("padding", "1em")
        .append($("<div/>")
            .css("position", "absolute")
            .css("right", "1em")
            .css("top", "0.5em")
            .css("font-size", "75%")
            .css("color", "#777")
            .append($("<a/>", {
                href: TFDClerk.script_url,
                title: "tfdclerk.js",
                text: "tfdclerk.js"
            }))
            .append($("<span/>", {text: " version " + TFDClerk.version})))
        .append($("<h5/>", {
            text: title,
            style: "margin: 0; padding: 0 0 0.25em 0;"
        }));

    options.call(this);
    this.box.append($("<button/>", {
            text: verb.charAt(0).toUpperCase() + verb.slice(1),
            addClass: "tfdclerk-submit mw-ui-button mw-ui-progressive",
            style: "margin-right: 0.5em;",
            disabled: this._submit_blockers.length > 0,
            click: function() {
                self._block_submit("submitting");
                self.box.find(".tfdclerk-cancel").prop("disabled", true);
                callback.call(self);
            }
        }))
        .append($("<button/>", {
            text: "Cancel",
            addClass: "tfdclerk-cancel mw-ui-button",
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

TFD.prototype._build_loading_node = function(node, text) {
    return $("<" + node + "/>", {
        text: text + "...",
        style: "font-style: italic; color: #777;"
    });
};

TFD.prototype._do_close = function() {
    // TODO
    // rough mockup:
    // - post-submit ui updates
    //      - result options -> result string
    //      - disable comments box
    //      - collapse/disable/fix actions
    //      - add progress info area
    // - "Closing discussion..."
    //      - add discussion close tags with result and comment, optional nac
    //      - " done ([[diff]])"
    // - interface for closing each template
    // - replace gray buttons with progressive refresh button
};

TFD.prototype._do_relist = function() {
    // TODO
    // rough mockup:
    // - post-submit ui updates
    //      - date input box -> link to new discussion log page
    //      - disable comments box
    //      - add progress info area
    // - "Adding discussion to new date..."
    //      - add discussion to new date, plus relist template
    //      - " done ([[diff]])"
    // - "Removing discussion from old date..."
    //      - replace contents of section with {{relisted}}
    //      - " done ([[diff]])"
    // - "Updating discussion link on template(s):\n* [[Template:A]]..."
    //      - update |link param of {{template for discussion}}
    //      - " done ([[diff]])"
    // - replace gray buttons with progressive refresh button
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
                value: choice.toLowerCase()
            })).append($("<span/>", {
                text: choice,
                style: "margin: 0 1.25em 0 0.25em;"
            })).appendTo(elems);
    });
    $("<label/>").append($("<input/>", {
            name: "result",
            type: "radio",
            value: "other"
        })).append($("<span/>", {
            text: "Other: ",
            style: "margin: 0 0.25em;"
        })).append($("<input/>", {
            name: "result-other",
            type: "text"
        })).appendTo(elems);
    return elems;
};

TFD.prototype._on_backlink_summary = function(tlinfo, ntrans, nmlinks) {
    tlinfo.empty().append($("<li/>").append($("<a/>", {
            href: "/foobar",  // TODO: actual URL here
            title: "Transclusions of " + page,
            text: ntrans + " transclusions"
        })));

    if (nmlinks > 0)
        tlinfo.append($("<li/>").append($("<a/>", {
            href: "/foobar",  // TODO: actual URL here
            title: "Mainspace links to " + page,
            text: nmlinks + " mainspace links"
        })));
};

TFD.prototype._build_close_action_entry = function(page) {
    var redlink = this.head.nextUntil("h4").filter("ul").first()
        .find("a").filter(function() { return $(this).text() == page; })
        .hasClass("new");

    var tlinfo = $("<ul/>", {style: "display: inline;"})
        .append(this._build_loading_node("li", "Fetching transclusions"));
    // TODO: callback to fetch backlink data and call _on_backlink_summary

    return $("<li/>").append($("<a/>", {
        href: mw.util.getUrl(page),
        title: page,
        text: page,
        addClass: redlink ? "new" : "",
        style: "font-weight: bold;"
    })).append($("<span/>", {text: ": "}))
        .append($("<select/>", {disabled: redlink})  // TODO: fully implement
            .append($("<option/>", {
                value: "none",
                text: "Do nothing",
                selected: true
            }))
            .append($("<option/>", {
                value: "holding-cell",
                text: "Move to holding cell"
            })))
        // TODO: action-specific additional options here
        .append($("<span/>", {text: " (?) ("}))  // TODO: action help here
        .append($("<div/>", {addClass: "hlist", style: "display: inline;"})
            .append(tlinfo))
        .append($("<span/>", {text: ")"}));
};

TFD.prototype._add_close_actions = function() {
    this._block_submit("add-close-actions");
    this._with_content(function(content) {
        var regex = /\*\s*\{\{tfd links\|(.*?)(\||\}\})/gi,
            match = regex.exec(content);
        if (match === null)
            return this._error("no templates found in section");

        var list = $("<ul/>", {style: "margin: 0 0 0 1em;"});
        do {
            var page = "Template:" + match[1];
            this._build_close_action_entry(page).appendTo(list);
        } while ((match = regex.exec(content)) !== null);

        this.box.find(".tfdclerk-actions").empty().append(list);
        this._unblock_submit("add-close-actions");
    });
};

TFD.prototype._get_relist_date = function() {
    var months = [
        "January", "February", "March", "April", "May", "June", "July",
        "August", "September", "October", "November", "December"];

    var date = new Date($("#tfdclerk-date-" + this.id).val());
    var month = months[date.getUTCMonth()];
    return date.getUTCFullYear() + " " + month + " " + date.getUTCDate();
};

TFD.prototype._on_date_change = function() {
    var date = this._get_relist_date();
    var this_date = mw.config.get("wgTitle").split("/Log/")[1];

    if (date == null || date == this_date)
        this._block_submit("bad-date");
    else
        this._unblock_submit("bad-date");
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
                    $("<div/>", {addClass: "tfdclerk-actions"})
                        .append(this._build_loading_node("span", "Fetching")),
                ]
            ]);
            this._add_close_actions();
        });
};

TFD.prototype.relist = function() {
    var self = this;
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
                        value: new Date().toDatePickerFormat(),
                        change: function() { self._on_date_change(); }
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
