LorLinkChecker
==============

The LOR Link Checker allows IDLA LOR administrators to launch threads that will navigate through the LOR and extract external links from S3 Objects and persist those links in a database. The application allows administrators to search for external links and launch threads to execute the above-mentioned job. If repeat external links are statistically different from previously-persisted, identical links, the application will notify the administrator via email.

Web Server:

* Nginx + Gunicorn (Green Unicorn)

Front-end:

* Bootstrap

Back-end:

* Django
* MongoDB

Versioning

* 1.0 Implemented interface
* 1.1 Fixed bugs
* 1.2 Fixed bugs
* 2.0 Ready for testing
