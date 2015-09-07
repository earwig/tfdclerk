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

TFDClerk.api_get = function(tfd, params, done, fail, always) {
    TFDClerk._api.get(params)
        .done(function(data) {
            if (done)
                done.call(tfd, data);
        })
        .fail(function(error) {
            if (fail)
                fail.call(tfd, error);
            else
                tfd._error("API query failure", error);
        })
        .always(function() {
            if (always)
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
