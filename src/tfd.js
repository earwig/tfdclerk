// @TFDCLERK_HEADER_START@
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
// @TFDCLERK_HEADER_END@

TFD = function(id, head) {
    this.id = id;
    this.head = head;
    this.box = null;

    this._guard = false;
    this._submit_blockers = [];
    this._wikitext = undefined;
    this._wikitext_callbacks = [];
};

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
        addClass: "tfdclerk-error",
        html: "<strong>Error:</strong> " + (extra ? msg + ": " : msg)
    });
    if (extra)
        elem.append($("<span/>", {
            addClass: "tfdclerk-error-extra",
            text: extra
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

    if (this.box.find(".tfdclerk-error"))
        this.box.find(".tfdclerk-error").remove();
    elem.insertAfter(this.box.find("h5"));
    this._block_submit("error");
};

TFD.prototype._get_section_edit_tag = function() {
    return this.head
        .find(".mw-editsection a:not(.mw-editsection-visualeditor)").first();
};

TFD.prototype._get_discussion_page = function() {
    var url = this._get_section_edit_tag().prop("href");
    var match = url.match(/title=(.*?)(\&|$)/);
    return match ? match[1] : null;
};

TFD.prototype._get_section_number = function() {
    var url = this._get_section_edit_tag().prop("href");
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
    }, null, function() {
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
        addClass: "tfdclerk-box tfdclerk-" + verb + "-box"
    })
        .append($("<div/>", {addClass: "tfdclerk-box-info"})
            .append($("<a/>", {
                href: TFDClerk.script_url,
                title: "tfdclerk.js",
                text: "tfdclerk.js"
            }))
            .append($("<span/>", {text: " version " + TFDClerk.version})))
        .append($("<h5/>", {
            addClass: "tfdclerk-box-heading",
            text: title
        }));

    options.call(this);
    this.box.append($("<button/>", {
            text: verb.charAt(0).toUpperCase() + verb.slice(1),
            addClass: "tfdclerk-submit mw-ui-button mw-ui-progressive",
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
    var table = $("<table/>", {addClass: "tfdclerk-options"});
    $.each(options, function(i, opt) {
        table.append($("<tr/>")
            .append(
                $("<td/>", {addClass: "tfdclerk-option-name"}).append(opt[0]))
            .append(
                $("<td/>", {addClass: "tfdclerk-option-value"}).append(opt[1]))
        );
    });
    this.box.append(table);
};

TFD.prototype._build_loading_node = function(node, text) {
    return $("<" + node + "/>", {
        addClass: "tfdclerk-loading",
        text: text + "..."
    });
};

TFD.prototype._build_hook = function(verb, callback) {
    var self = this;
    return $("<a/>", {
        href: "#",
        text: verb,
        title: "tfdclerk: " + verb + " discussion",
        click: function() {
            callback.call(self);
            return false;
        }
    });
};

TFD.prototype._build_hook_divider = function() {
    return $("<span/>", {
        addClass: "tfdclerk-hook-divider mw-editsection-divider",
        text: " | "
    });
};

TFD.prototype.add_hooks = function() {
    $("<span/>", {addClass: "tfdclerk-hooks"})
        .append($("<span/>", {addClass: "mw-editsection-bracket", text: "["}))
        .append(this._build_hook("close", this.close))
        .append(this._build_hook_divider())
        .append(this._build_hook("relist", this.relist))
        .append($("<span/>", {addClass: "mw-editsection-bracket", text: "]"}))
        .appendTo(this.head.find(".mw-editsection"));
};
