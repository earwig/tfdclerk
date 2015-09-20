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

TFD.prototype._get_relist_date = function() {
    return new Date(this.box.find(".tfdclerk-date").val()).toLogDateFormat();
};

TFD.prototype._on_date_change = function() {
    var date = this._get_relist_date();
    var title = "Wikipedia:Templates for discussion/Log/" + date;
    var info = this.box.find(".tfdclerk-discussion-info");
    info.empty();

    if (mw.config.get("wgTitle") == "Templates for discussion")
        var this_date = this.head.prevAll().filter("h3").first().find("a")
            .prop("title").split("/Log/")[1];
    else
        var this_date = mw.config.get("wgTitle").split("/Log/")[1];

    if (date == null || date == this_date) {
        this._block_submit("bad-date");
        info.append($("<span/>", {
            addClass: "tfdclerk-bad-date",
            text: date == this_date ? "Same as current date" : "Invalid date"
        }));
        return;
    }

    this._unblock_submit("bad-date");
    this._block_submit("checking-discussion");
    info.append(this._build_loading_node("span", "Checking discussion"));

    TFDClerk.api_get(this, {
        action: "query",
        indexpageids: "",
        titles: title
    }, function(data) {
        this._unblock_submit("checking-discussion");
        info.empty().append($("<span/>", {text: "Log: "})).append($("<a/>", {
            href: mw.util.getUrl(title),
            title: title,
            text: date,
            addClass: data.query.pageids[0] < 0 ? "new" : ""
        }));
        if (date == (new Date().toLogDateFormat()))
            info.append($("<span/>", {text: " (today)"}));
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
                        addClass: "tfdclerk-date",
                        name: "date",
                        type: "date",
                        value: new Date().toDatePickerFormat(),
                        change: function() { self._on_date_change(); }
                    }).add($("<span/>", {
                        addClass: "tfdclerk-discussion-info"
                    }))
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
            this._on_date_change();
        });
};
