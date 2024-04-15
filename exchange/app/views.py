"""
Definition of views.
"""

from datetime import datetime
from django.shortcuts import render
from django.http import HttpRequest

from django.shortcuts import render

def home(request):
    return render(request, 'app/index.html')

