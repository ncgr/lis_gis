#!/usr/bin/env python

"""
Test add my data tool, via http
(requires CORS header Access-Control-Allow-Origin)
http://stackoverflow.com/questions/12499171/can-i-set-a-header-with-pythons-simplehttpserver

"""

import SimpleHTTPServer


class MyHTTPRequestHandler(SimpleHTTPServer.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_my_headers()

        SimpleHTTPServer.SimpleHTTPRequestHandler.end_headers(self)

    def send_my_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")


if __name__ == '__main__':
    SimpleHTTPServer.test(HandlerClass=MyHTTPRequestHandler)
