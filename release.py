#! /usr/bin/env python
# -*- coding: utf-8  -*-
#
# Copyright (C) 2015 Ben Kurtovic <ben.kurtovic@gmail.com>
#
# Permission is hereby granted, free of charge, to any person obtaining a copy
# of this software and associated documentation files (the "Software"), to deal
# in the Software without restriction, including without limitation the rights
# to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
# copies of the Software, and to permit persons to whom the Software is
# furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in
# all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.

"""
This Python script updates the on-wiki copy of tfdclerk.

You need to have EarwigBot and GitPython installed:
$ pip install earwigbot gitpython

Then, simply:
$ python release.py
"""

from __future__ import print_function, unicode_literals
from cookielib import LWPCookieJar, LoadError
import errno
from getpass import getpass
from os import chmod, path
import stat
import re
from sys import argv
import time
from urllib import urlencode

import earwigbot
import git

SCRIPT_SITE = "en.wikipedia.org"
SCRIPT_TEST = "test.wikipedia.org"
SCRIPT_USER = "The Earwig"
SCRIPT_FILE = "tfdclerk.js"
SCRIPT_SDIR = "src"
COOKIE_FILE = ".cookies"
REPLACE_TAG = "@TFDCLERK_{tag}@"
EDIT_SUMMARY = "Updating script with latest version ({version})"

SCRIPT_PAGE = "User:{user}/{file}".format(user=SCRIPT_USER, file=SCRIPT_FILE)
SCRIPT_ROOT = path.dirname(path.abspath(__file__))
REPO = git.Repo(SCRIPT_ROOT)

def _is_clean():
    """
    Return whether there are uncommitted changes in the working directory.
    """
    return not REPO.git.status(porcelain=True, untracked_files="no")

def _get_version():
    """
    Return the current script version as a hex ID.
    """
    return REPO.commit().hexsha[:10]

def _get_full_version():
    """
    Return the current script version as a human-readable string.
    """
    date = time.gmtime(REPO.commit().committed_date)
    datefmt = time.strftime("%H:%M, %-d %B %Y (UTC)", date)
    return "{hash} ({date})".format(hash=_get_version(), date=datefmt)

def _do_include(text, include):
    """
    Replace an include directive inside the script with a source file.
    """
    with open(path.join(SCRIPT_ROOT, SCRIPT_SDIR, include), "r") as fp:
        source = fp.read().decode("utf8")

    hs_tag = REPLACE_TAG.format(tag="HEADER_START")
    he_tag = REPLACE_TAG.format(tag="HEADER_END")
    if hs_tag in source and he_tag in source:
        lines = source.splitlines()
        head_start = [i for i, line in enumerate(lines) if hs_tag in line][0]
        head_end = [i for i, line in enumerate(lines) if he_tag in line][0]
        del lines[head_start:head_end + 1]
        source = "\n".join(lines)

    tag = REPLACE_TAG.format(tag="INCLUDE:" + include)
    if text[:text.index(tag)][-2:] == "\n\n" and source.startswith("\n"):
        source = source[1:]  # Remove extra newline

    if include.endswith(".css"):
        lines = ['"' + line.ljust(75) + '" +'
                 for line in source.strip().splitlines()]
        if lines and lines[-1]:
            lines[-1] = lines[-1][:-2]  # Strip off last +
        source = "\n".join(lines)

    return text.replace(tag, source)

def _get_script():
    """
    Return the complete script.
    """
    with open(path.join(SCRIPT_ROOT, SCRIPT_FILE), "r") as fp:
        text = fp.read().decode("utf8")

    re_include = REPLACE_TAG.format(tag=r"INCLUDE:(.*?)")
    includes = re.findall(re_include, text)
    for include in includes:
        text = _do_include(text, include)

    replacements = {
        "VERSION": _get_version(),
        "VERSION_FULL": _get_full_version()
    }

    for tag, value in replacements.iteritems():
        text = text.replace(REPLACE_TAG.format(tag=tag), value)
    return text

def _get_cookiejar():
    """
    Return a cookiejar to store the user's login info in.
    """
    cookiejar = LWPCookieJar(COOKIE_FILE)
    try:
        cookiejar.load()
    except LoadError:
        pass
    except IOError as err:
        if err.errno != errno.ENOENT:
            raise
        open(COOKIE_FILE, "w").close()
        chmod(COOKIE_FILE, stat.S_IRUSR|stat.S_IWUSR)

    return cookiejar

def _get_site(site_url=SCRIPT_SITE):
    """
    Return the EarwigBot Site object where the script will be saved.

    This is hacky, but it allows us to upload the script without storing the
    user's password in a config file like EarwigBot normally does.
    """
    site = earwigbot.wiki.Site(
        base_url="https://" + site_url, script_path="/w",
        cookiejar=_get_cookiejar(), assert_edit="user")

    logged_in_as = site._get_username_from_cookies()
    if not logged_in_as or logged_in_as != SCRIPT_USER:
        password = getpass("Password for {user}: ".format(user=SCRIPT_USER))
        site._login((SCRIPT_USER, password))

    return site

def main():
    """
    Main entry point for script.
    """
    if len(argv) > 1 and argv[1].lstrip("-").startswith("c"):
        print(_get_script(), end="")
        return

    if not _is_clean():
        print("Uncommitted changes in working directory. Stopping.")
        exit(1)

    if len(argv) > 1 and argv[1].lstrip("-").startswith("t"):
        site_url = SCRIPT_TEST
    else:
        site_url = SCRIPT_SITE

    print("Uploading script to [[{page}]] on {site}...".format(
        page=SCRIPT_PAGE, site=site_url))
    script = _get_script()
    site = _get_site(site_url)
    page = site.get_page(SCRIPT_PAGE)
    summary = EDIT_SUMMARY.format(version=_get_version())

    page.edit(script, summary, minor=False, bot=False)

    params = {
        "title": page.title.replace(" ", "_"),
        "oldid": "prev",
        "diff": "cur"
    }
    print("Done!")
    print(site.url + "/w/index.php?" + urlencode(params))

if __name__ == "__main__":
    main()
