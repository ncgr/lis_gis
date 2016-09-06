"""
A decorator to ensure cache busting headers always exist on views responses.

usage as decorator:

@ensure_nocache
def viewname(request):
    ...
"""

from django.utils.http import http_date
import time

def ensure_nocache(view):
    def wrapper(request, *args, **kwargs):
        response = view(request, *args, **kwargs)
        response['Cache-Control'] = 'max-age=3600, must-revalidate'
        response['Expires'] = http_date(time.time() + 3600)
        return response
    return wrapper
