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
        return response
    return wrapper
