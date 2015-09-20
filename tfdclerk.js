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

// <nowiki>

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

mw.util.addCSS(
@TFDCLERK_INCLUDE:main.css@
);

@TFDCLERK_INCLUDE:main.js@
@TFDCLERK_INCLUDE:util.js@
@TFDCLERK_INCLUDE:tfd.js@
@TFDCLERK_INCLUDE:tfd_close.js@
@TFDCLERK_INCLUDE:tfd_relist.js@

$(TFDClerk.install);

/* Main script ends here */

    });
}

// </nowiki>
