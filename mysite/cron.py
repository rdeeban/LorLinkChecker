from pymongo import MongoClient
import time
from boto.s3.connection import S3Connection
from bs4 import BeautifulSoup
import urllib2
import threading
import math
import smtplib

# global constants
KEY='rkj4Hvhm'
collection = MongoClient('localhost', 27017)['test'].ext_links
threads = MongoClient('localhost', 27017)['test'].threads
s3 = S3Connection('AKIAIUEQRLPVE4FHVLZQ', 'IzbG0hS21X2Ruczqm3YAAp5TRa/sEk6HL48c5hTj')
BUCKET = 'idiglor'
hdr = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11',
       'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
       'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.3',
       'Accept-Encoding': 'none',
       'Accept-Language': 'en-US,en;q=0.8',
       'Connection': 'keep-alive'}

# helper methods
def get_subs(bucket,prefix):
    """
    Return immediate bucket keys under prefix
    """
    bucket = s3.get_bucket(bucket)
    result = []
    keys =  bucket.list(prefix=prefix, delimiter='/')
    for key in keys:
        if key.name.find('$') == -1:
            result.append(key.name)
    return result

def store_links(bucket, prefix, T):
    """
    Recursively go through all paths under bucket prefix and persist external links from object content to database
    """
    T['current'] = prefix
    T['visited'].append(prefix)
    T['num_visited'] = len(T['visited'])
    threads.update({'id':T['id']}, T, upsert=True)
    subs = get_subs(bucket, prefix);
    r = False
    for key in subs:
        if key.find('index.html') != -1:
            r = True
    if r:
        try:
            ext_links = []
            for key in subs:
                if key.find('.html') != -1:
                    ext_links.append(extract_links_from_s3_obj(bucket,key,T))
            ext_links = [item for ext_links in ext_links for item in ext_links]
            collection.insert(ext_links)
        except Exception as e:
            f = open('error.txt', 'a')
            f.write("Time: " + str(time.time()) + "\n" + "\tError with inserting into database: " + str(ext_links) + "\n")
            f.close()
    else:
        for key in get_subs(bucket, prefix):
            if key[len(key)-1:len(key)] == '/' and key != prefix:
                store_links(bucket, key, T)

def extract_links_from_s3_obj(bucket, prefix, T):
    """
    Return [] of External Links in the object content under bucket prefix
    """
    ext_links = []
    try:
        f = s3.get_bucket(bucket).get_key(prefix)
        soup = BeautifulSoup(f.get_contents_as_string())
        for a in soup.find_all('a', href=True):
            if a['href'].find('http://') !=-1 and a['href'].find('.html') !=-1:
                ext_link = {}
                ext_link['link'] = a['href']
                size = size_of_file(ext_link['link'], hdr)
                ext_link['size'] = size
                ext_link['date'] = int(time.time())
                ext_link['path'] = bucket + "/" + prefix
                ext_links.append(ext_link)
                notify(ext_link, T)
    except Exception as e:
        f = open('error.txt', 'a')
        f.write("Time: " + str(time.time()) + "\n" + "\tError with extracting links from s3 object: " + bucket + " " + prefix + "\n")
        f.close()
    return ext_links

def get_z_score(l, d):
    """
    Return z score
    """
    sum = 0.0
    for e in l:
        sum += e['size']
    mean = sum / len(l)
    sum2 = 0.0
    for e in l:
        sq_diff = math.pow((mean - e['size']),2)
        sum2 += sq_diff
    var = sum2 / len(l)
    std_dev = math.sqrt(var)
    test_point = d
    z_score = (test_point-mean)/std_dev if (std_dev != 0) else 0
    return z_score

def send_email(username,password,fromaddr, toaddr, msg):
    """
    send email
    """
    server = smtplib.SMTP('smtp.gmail.com:587')
    server.starttls()
    server.login(username,password)
    server.sendmail(fromaddr, toaddr, msg)
    server.quit()

def notify(ext_link, T):
    """
    send email if z score is greater than or equal to 2
    """
    L = list(collection.find({"link":ext_link['link']}))
    if len(L) >= 5:
        test_point = ext_link['size']
        z_score = get_z_score(L,test_point)
        if z_score >= 1:
            fromaddr = 'intern.deeban.ramalingam@idla.k12.id.us'
            toaddrs  = 'intern.deeban.ramalingam@idla.k12.id.us'
            msg = 'Item: ' + ext_link + ' is ' + z_score + ' standard deviations from the mean. Please look into this.'
            username = 'intern.deeban.ramalingam@idla.k12.id.us'
            password = 'Idla98765'
            send_email(username,password,fromaddr,toaddrs,msg)
            T['errors'].append({'Item':ext_link,'z-score':z_score})

def size_of_file(url,header):
    """
    Return size of file content under url with header
    """
    size = 0
    try:
        size = len(BeautifulSoup(urllib2.urlopen(urllib2.Request(url, headers=header)).read()).prettify())
    except Exception as e:
        f = open('error.txt', 'a')
        f.write("Time: " + str(time.time()) + "\n" + "\tError with getting size of file: " + url + "\n")
        f.close()
    return size

def launch_thread():
    print 'launching thread'
    path = 'unlicensed/'
    T = {'id':int(time.time()),'initial':path,'current':path,'num_visited':0,'visited':[],'errors':[]}
    T['visited'].append(path)
    T['num_visited'] = len(T['visited'])
    threads.insert(T)
    store_links(BUCKET,path,T)

launch_thread()
