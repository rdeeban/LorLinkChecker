from django.conf.urls import patterns, url
from llc import views

urlpatterns = patterns('',
        url(r'^login', views.login),
        url(r'^threads', views.get_threads),
     	url(r'^links', views.get_links),
        url(r'^link/data', views.get_data),
        url(r'^s3/children', views.get_children),
        url(r'^csv/links', views.get_csv),
     	)