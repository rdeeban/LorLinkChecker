from django.db import models
import time
from mongoengine import *

# Create your models here.

class Thread(Document):
    date = IntField(default=int(time.time()))
    bucket = StringField(max_length=300)
    prefix = StringField(max_length=300)

class External_Link(Document):
    date = IntField(default=int(time.time()))
    path = StringField(max_length=300)
    link = StringField(max_length=300)
    size = IntField(default=0)