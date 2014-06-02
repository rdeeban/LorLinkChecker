/* GLOBAL VARIABLES */
var template, data, html, db;

//$("#load").hide();
readLinks();

/* HELPER FUNCTIONS */

/**
 * converts timestamp to formatted time string
 * @param UNIX_timestamp
 * @returns {string}
 */
function timeConverter(UNIX_timestamp) {
    var a = new Date(UNIX_timestamp * 1000);
    var year = a.getFullYear();
    var month = a.getMonth() + 1;
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = month + '/' + date + '/' + year + ' ' + hour + ':' + min + ':' + sec;
    return time;
}

/**
 * sorts array by key
 * @param array
 * @param key
 * @returns {*|Array}
 */
function sortByKey(array, key) {
    return array.sort(function (a, b) {
        var x = a[key];
        var y = b[key];
        return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    });
}

/**
 * gets mean of number list
 * @param list
 */
function average(list) {
    var sum = 0.0;
    for (var i in list) {
        sum += list[i];
    }
    return sum / list.length;
}

/**
 * gets standard deviation of number list
 * @param list
 */
function stdDev(list) {
    var mean = average(list);
    var N = list.length;
    var sum = 0.0;
    for (var i in list) {
        sum += Math.pow(list[i] - mean,2);
    }
    var std_dev = (sum != 0) ? Math.sqrt(sum/N) : 0;
    return std_dev;
}

/* APPLICATION-SPECIFIC FUNCTIONS */

/**
 * call thread to extract external links under path
 * @param path
 */
function getLinks(path) {
    var response = {};
    $.ajax({
        type: 'POST',
        url: '/llc/link/data',
        async: true,
        data: {path: path},
        success: function (data) {
            response = data;
            console.log(response);
        }
    });
}

/**
 * get all links from database
 * @returns {Array}
 */
function readLinks() {
    var response = [];
    $("#load").show();
    $.ajax({
        url: '/llc/links',
        async: false,
        success: function (data) {
            //var count = 0;
            data = data.reverse();
            for (var i = 0; i < data.length; i++) {
                data[i].name = (data[i].link.length > 40) ? data[i].link.substring(0, 40) + "..." : data[i].link;
                var segs = data[i].path.split("/");
                segs.shift();
                var txt = segs.toString().replace(/,/g, "/");
                data[i].subpath = txt;
                txt = (txt.length > 40) ? "..." + txt.substring(txt.length - 40, txt.length) : txt;
                data[i].location = txt;
                data[i].timestamp = data[i].date;
                var date = timeConverter(data[i].date);
                data[i].date = date.split(" ")[0];
                data[i].time = date.split(" ")[1];
            }
            db = TAFFY(data);
            response = data;
            $("#load").hide();
        }
    });
    return response;
}

/**
 *
 * @returns {Array}
 */
function readThreads() {
    var response = [];
    $.ajax({
        url: '/llc/threads',
        async: false,
        success: function (data) {
            data = data.reverse();
            for (var i = 0; i < data.length; i ++) {
                data[i].initial = (data[i].initial.length > 100) ? data[i].initial.substring(0,47) + "..." + data[i].initial.substring(data[i].initial.length-50,data[i].initial.length) : data[i].initial;
                data[i].current = (data[i].current.length > 100) ? data[i].current.substring(0,47) + "..." + data[i].current.substring(data[i].current.length-50,data[i].current.length) : data[i].current;
            }
            response = data;
        }
    });
    return response;
}

/**
 * process mustache template for external links
 */
function processTemplate() {
    html = Mustache.render(template, data);
    $('#template-table').html(html);
}

/**
 * process mustache template for threads
 */
function processTemplate2() {
    html = Mustache.render(template, data);
    $('#template-table-thread').html(html);
}

/**
 * tabulate results for external links
 */
function table() {
    $.get("template/linkTemplate.mustache", null, function (linkTemplate) {
        template = linkTemplate;
        processTemplate();
    });
}

/**
 * tabulate results for threads
 */
function table2() {
    $.get("template/threadTemplate.mustache", null, function (threadTemplate) {
        template = threadTemplate;
        processTemplate2();
    });
}

/**
 * search for results in taffy database
 * @param link
 * @param path
 * @param operator
 * @param size
 */
function search(link, path, operator, size) {
    var curPage = 0;
    if(localStorage.getItem('curPage') != null) {
        curPage = localStorage.getItem('curPage');
    }
    else {
        localStorage.setItem('curPage', 0);
    }
    var query = {'path': {'like': path}, 'link': {'like': link}};
    query['size'] = {};
    query['size'][operator] = size;
    var result = db(query).get();
    $("#num-results").html(result.length);
    data = {"links": result.slice(curPage*50, curPage*50+50)};
    table();
    var str = "";
    for (var i = 0; i < result.length; i += 50) {
        str += "<a onclick='changePage("+(i/50)+");'>"+(i/50+1)+"</a> ";
    }
    $("#num-pages").html(str);
    l = link;
    p = path;
    o = operator;
    s = size;
}

var l, p, o, s;

function changePage(target) {
    localStorage.setItem('curPage', target);
    search(l,p,o,s);
}

/**
 * construct analysis graph
 * @param link
 */
function constructGraph(link) {
    var data = db({'link': link}).get();
    data = sortByKey(data, 'timestamp');
    if (data.length >= 2) {
        $("#analysis-graph").show();
        var list = [];
        var coords = [];
        var max = 0;
        var min = 99999999999999;
        for (var i = 0; i < data.length; i++) {
            if (data[i].size > max) {
                max = data[i].size;
            }
            if (data[i].size < min) {
                min = data[i].size;
            }
            var datum = {x: data[i].timestamp, y: data[i].size}
            coords.push(datum);
            list.push(data[i].size);
        }
        var N = data.length;
        var mean = average(list);
        var std_dev= stdDev(list);
        $("#statistic").html('<p>Population: '+N+'</p>'+'<p>Mean: '+mean+'</p>' + '<p>Standard Deviation: '+std_dev+'</p>');
        var chart_data = [
            {
                values: coords,
                key: 'Size',
                color: '#ff7f0e'
            }
        ];
        nv.addGraph(function () {
            var chart = nv.models.lineChart()
                .margin({left: 150})  //Adjust chart margins to give the x-axis some breathing room.
                .transitionDuration(350)  //how fast do you want the lines to transition?
                .showLegend(true)
                .showYAxis(true)        //Show the y-axis
                .showXAxis(true)        //Show the x-axis
                .tooltipContent(function (key, x, y, e, graph) {
                    return '<h3>(Time,' + key + ')</h3>' +
                        '<p>(' + x + ' , ' + y + ')</p>';
                });
            chart.lines.forceY([0, min + max]);
            chart.xAxis
                .axisLabel('Time (unix timestamp)')
                .tickFormat(d3.format(',r'));
            chart.yAxis
                .axisLabel('Size (bytes)')
                .tickFormat(d3.format(',r'));
            var myData = chart_data;
            d3.select('#chart svg')
                .datum(myData)
                .call(chart);
            nv.utils.windowResize(function () {
                chart.update()
            });
            return chart;
        });

    }
}

/**
 * suggest s3 keys
 * @param key
 */
function suggest(key) {
    var response = {};
    $.ajax({
        type: 'GET',
        url: '/llc/s3/children?path=' + key,
        async: true,
        success: function (data) {
            response = data;
            console.log(response);
            var selectList = $("#suggestions");
            selectList.empty();
            for (var i = 0; i < response.length; i++) {
                var option = document.createElement("option");
                option.value = response[i];
                option.text = response[i];
                selectList.append(option);
            }
            selectList.attr('size', response.length);
        }
    });
}

/**
 * log in with key
 * @param key
 * @returns {{}}
 */
function login(key) {
    var response = {};
    $.ajax({
        type: 'GET',
        url: '/llc/login?key=' + key,
        async: false,
        success: function (data) {
            response = data;
        }
    });
    return response;
}

/**
 * log out
 */
function logout() {
    localStorage.removeItem('login');
}

/**
 * view page
 * @param page
 */
function view(target, page) {
    if (localStorage.getItem('login') == 'y') {
        localStorage.setItem('current_page',page);
        $(target).load(page + ".html", function () {
            $(this).hide().fadeIn("fast");
            return false;
        });
    }
    else {
        $(target).load("html/login.html", function () {
            $(this).hide().fadeIn("fast");
            return false;
        });
    }
}