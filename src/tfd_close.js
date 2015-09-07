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

TFD.prototype._is_merge = function() {
    return this.head.nextUntil("h4").filter("p").first().find("b")
        .text() == "Propose merging";
};

TFD.prototype._get_close_action_choices = function() {
    // TODO
    return [{
        id: "none",
        name: "Do nothing",
        help: "The script will not modify this template or pages related to " +
              "it. You will need to carry out the closure yourself.",
        on_select: null,
        on_close: null,
        default: true
    }, {
        id: "holding-cell",
        name: "Move to holding cell",
        help: "The script will add {{being deleted}} to the template and " +
              "add an entry to the holding cell ([[WP:TFD/H]]).",
        on_select: null,
        on_close: null
    }];
};

TFD.prototype._on_close_result_change = function() {
    this._unblock_submit("no-close-result");
    // TODO: possibly disable/enable individual close actions
};

TFD.prototype._build_close_results = function() {
    if (this._is_merge())
        var choices = ["Merge", "Do not merge", "No consensus", "Other"];
    else
        var choices = ["Delete", "Keep", "Redirect", "No consensus", "Other"];

    var self = this;
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
                value: choice.toLowerCase(),
                change: function() { self._on_close_result_change(); }
            })).append($("<span/>", {
                text: choice,
                style: "margin: 0 1.25em 0 0.25em;"
            })).appendTo(elems);
    });

    var other = elems.children().last();
    other.find("span").text("Other:").css("margin", "0 0.25em");
    other.append($("<input/>", {
        name: "result-other",
        type: "text"
    }));

    this._block_submit("no-close-result");
    return elems;
};

TFD.prototype._on_backlink_summary = function(page, tlinfo, ntrans, nmtrans,
                                              nlinks) {
    tlinfo.empty().append($("<li/>").append($("<a/>", {
            href: mw.util.getUrl("Special:WhatLinksHere/" + page, {
                namespace: "",
                hidelinks: 1,
                hideredirs: 1,
                hidetrans: 0
            }),
            title: "Transclusions of " + page,
            text: ntrans + " transclusions"
        })));

    if (ntrans != 0)
        tlinfo.append($("<li/>").append($("<a/>", {
            href: mw.util.getUrl("Special:WhatLinksHere/" + page, {
                namespace: 0,
                hidelinks: 1,
                hideredirs: 1,
                hidetrans: 0
            }),
            title: "Mainspace transclusions of " + page,
            text: nmtrans + " in mainspace"
        })));

    if (nlinks != 0)
        tlinfo.append($("<li/>").append($("<a/>", {
            href: mw.util.getUrl("Special:WhatLinksHere/" + page, {
                namespace: "",
                hidelinks: 0,
                hideredirs: 0,
                hidetrans: 1
            }),
            title: "Mainspace links to " + page,
            text: nlinks + " mainspace links"
        })));
};

TFD.prototype._load_backlink_summary = function(page, tlinfo) {
    var limit = TFDClerk._sysop ? 5000 : 500;
    TFDClerk.api_get(this, {
        action: "query",
        list: "embeddedin|backlinks",
        eititle: page,
        eilimit: limit,
        bltitle: page,
        blnamespace: "0|10",
        bllimit: limit,
        blredirect: ""
    }, function(data) {
        var ntrans = data.query.embeddedin.length;
        var nmtrans = data.query.embeddedin.filter(function(pg) {
            return pg.ns == 0;
        }).length;
        var nlinks = data.query.backlinks.reduce(function(acc, pg) {
            var c = 0;
            if (pg.ns == 0)
                c++;
            if (pg.redirlinks)
                c += pg.redirlinks.filter(function(rl) {
                    return rl.ns == 0;
                }).length;
            return acc + c;
        }, 0);

        if (data["continue"]) {
            if (data["continue"].eicontinue) {
                ntrans += "+";
                nmtrans += "+";
            }
            if (data["continue"].blcontinue)
                nlinks += "+";
        }

        this._on_backlink_summary(page, tlinfo, ntrans, nmtrans, nlinks);
    });
};

TFD.prototype._build_close_action_entry = function(page) {
    var self = this;
    var redlink = this.head.nextUntil("h4").filter("ul").first()
        .find("a").filter(function() { return $(this).text() == page; })
        .hasClass("new");

    var tlinfo = $("<ul/>", {style: "display: inline;"})
        .append(this._build_loading_node("li", "Fetching transclusions"));
    this._load_backlink_summary(page, tlinfo);

    var select_extra = $("<span/>");
    var help = $("<abbr/>", {text: "?"});
    var select = $("<select/>", {
        disabled: redlink,
        change: function() {
            var option = select.find("option:selected");
            help.prop("title", option.data("help"));
            if (option.data("select"))
                option.data("select").call(self, select_extra);
        }
    });

    $.each(this._get_close_action_choices(), function(i, choice) {
        select.append($("<option/>", {
            value: choice.id,
            text: choice.name,
            selected: choice.default
        }).data({
            help: choice.help,
            select: choice.on_select,
            close: choice.on_close
        }));
        if (choice.default)
            help.prop("title", choice.help);
    });

    return $("<li/>").append($("<a/>", {
        href: mw.util.getUrl(page),
        title: page,
        text: page,
        addClass: redlink ? "new" : "",
        style: "font-weight: bold;"
    })).append($("<span/>", {text: ": "}))
        .append(select)
        .append(select_extra)
        .append($("<span/>", {text: " ("}))
        .append(help)
        .append($("<span/>", {text: ") ("}))
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
