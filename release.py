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
import time

import earwigbot
import git

SCRIPT_SITE = "https://en.wikipedia.org"
SCRIPT_USER = "The Earwig"
SCRIPT_FILE = "tfdclerk.js"
COOKIE_FILE = ".cookies"
VERSION_TAG = "@TFDCLERK_VERSION@"
EDIT_SUMMARY = "Updating script with latest version. ({version})"

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
    Return the current script version as a human-readable string.
    """
    commit = REPO.commit()
    date = time.gmtime(commit.committed_date)
    datefmt = time.strftime("%H:%M, %-d %B %Y (UTC)", date)
    return "{hash} ({date})".format(hash=commit.hexsha[:10], date=datefmt)

def _get_script():
    """
    Return the complete script.
    """
    with open(path.join(SCRIPT_ROOT, SCRIPT_FILE), "r") as fp:
        text = fp.read().decode("utf8")

    return text.replace(VERSION_TAG, _get_version())

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

def _get_site():
    """
    Return the EarwigBot Site object where the script will be saved.

    This is hacky, but it allows us to upload the script without storing the
    user's password in a config file like EarwigBot normally does.
    """
    site = earwigbot.wiki.Site(base_url=SCRIPT_SITE, script_path="/w",
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
    if not _is_clean():
        print("Uncommitted changes in working directory. Stopping.")
        exit(1)

    print("Uploading script to [[{page}]]...".format(page=SCRIPT_PAGE))
    script = _get_script()
    site = _get_site()
    page = site.get_page(SCRIPT_PAGE)
    summary = EDIT_SUMMARY.format(version=REPO.commit().hexsha[:10])

    page.edit(script, summary, minor=False, bot=False)
    print("Done!")

if __name__ == "__main__":
    main()