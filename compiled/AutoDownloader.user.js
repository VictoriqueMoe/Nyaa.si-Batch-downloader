"use strict";
class Episode {
    constructor(res, downloadLink, seeds, leechers, uid, resides, title, size) {
        this._res = res;
        this._downloadLink = downloadLink;
        this._seeds = seeds;
        this._leechers = leechers;
        this._uid = uid;
        this._resides = resides;
        this._title = title;
        this._size = size;
    }
    get res() {
        return this._res;
    }
    get downloadLink() {
        return this._downloadLink;
    }
    get seeds() {
        return this._seeds;
    }
    get leechers() {
        return this._leechers;
    }
    get uid() {
        return this._uid;
    }
    get resides() {
        return this._resides;
    }
    get title() {
        return this._title;
    }
    get size() {
        return this._size;
    }
    equals(ep) {
        return this.uid === ep.uid;
    }
}
class _AbstractEps {
    static abstractGetEps(skipSeedLimit) {
        let minSeeds = Number.parseInt(Localstore.getMinSeedsFromStore());
        if (minSeeds > -1 && skipSeedLimit === false) {
            let arrayOfEps = [];
            for (let i = 0, len = _AbstractEps.eps.length; i < len; i++) {
                let currentEp = _AbstractEps.eps[i];
                if (currentEp.seeds < minSeeds) {
                    continue;
                }
                arrayOfEps.push(currentEp);
            }
            return arrayOfEps;
        }
        else {
            return _AbstractEps.eps;
        }
    }
    static addEp(ep) {
        if (Anime.isValidRes(ep.res) === false) {
            throw new TypeError('The Episode supplied does not have a valid resolution');
        }
        for (let i = 0, len = _AbstractEps.eps.length; i < len; i++) {
            let epi = _AbstractEps.eps[i];
            if (epi.equals(ep)) {
                console.warn('The episode supplied already exsists, this episode has been ignored');
                return;
            }
        }
        _AbstractEps.eps.push(ep);
    }
    static removeEpisodeFromAnime(obj) {
        let arr = _AbstractEps.eps;
        let i = arr.length;
        while (i--) {
            if (arr[i] === obj) {
                arr.splice(i, 1);
            }
        }
    }
}
_AbstractEps.eps = []; // this is the main array that holds all the episodes per anime
class Anime extends _AbstractEps {
    constructor() {
        super();
    }
    static get currentAnime() {
        return Anime._currentAnime;
    }
    static set currentAnime(value) {
        Anime._currentAnime = value;
    }
    static get currentSubber() {
        return Anime._currentSubber;
    }
    static set currentSubber(value) {
        Anime._currentSubber = value;
    }
    static get supportedRes() {
        return Anime._supportedRes;
    }
    static addSupportedRes(res) {
        Anime._supportedRes.push(res);
    }
    static get availableRes() {
        return Anime._availableRes;
    }
    static addAvailableResolutions(res, fullRes) {
        if (Anime._resExists(res)) {
            return;
        }
        Anime._availableRes.push({ 'res': res, 'fullRes': fullRes });
    }
    static removeAvailableResolutions(resToRemove) {
        for (let i = 0; i < Anime._availableRes.length; i++) {
            let currentRes = Anime._availableRes[i];
            if (currentRes.res === resToRemove || currentRes.fullRes === resToRemove) {
                Anime._availableRes.splice(i, 1);
            }
        }
    }
    static _resExists(_res) {
        for (let i = 0; i < Anime._availableRes.length; i++) {
            let currentRes = Anime._availableRes[i];
            if (currentRes.res === _res || currentRes.fullRes === _res) {
                return true;
            }
        }
        return false;
    }
    static getTdFromTable(table, index) {
        return table.find('td:nth-child(' + index + ')');
    }
    static avgSeedsForRes(res, skipSeedLimit) {
        let seedCount = 0;
        let epCount = Anime.getAmountOfEpsFromRes(res, skipSeedLimit);
        if (epCount === 0) {
            return 0;
        }
        let eps = super.abstractGetEps(skipSeedLimit);
        for (let i = 0, len = eps.length; i < len; i++) {
            let currentEp = eps[i];
            if (currentEp.res === res) {
                seedCount += currentEp.res;
            }
        }
        return Math.round(seedCount / epCount);
    }
    static avgPeersForRes(res, skipSeedLimit) {
        let leechCount = 0;
        let epCount = Anime.getAmountOfEpsFromRes(res, skipSeedLimit);
        if (epCount === 0) {
            return 0;
        }
        let eps = super.abstractGetEps(skipSeedLimit);
        for (let i = 0, len = eps.length; i < len; i++) {
            let currentEp = eps[i];
            if (currentEp.res === res) {
                leechCount += currentEp.leechers;
            }
        }
        return Math.round(leechCount / epCount);
    }
    static getTotalSizeForRes(res, skipSeedLimit, decimals = 3) {
        let eps = Anime.getEpsForRes(res, skipSeedLimit);
        return Utils.getHumanReadableSize(eps, decimals);
    }
    static getAmountOfEpsFromRes(res, skipSeedLimit) {
        return Anime.getEpsForRes(res, skipSeedLimit).length;
    }
    static getEpsForRes(res, skipSeedLimit) {
        let arrayOfEps = [];
        let eps = super.abstractGetEps(skipSeedLimit);
        for (let i = 0, len = eps.length; i < len; i++) {
            let currentEp = eps[i];
            if (currentEp.res === res) {
                arrayOfEps.push(currentEp);
            }
        }
        return arrayOfEps;
    }
    static isValidRes(res) {
        return Anime._resExists(res);
    }
    static addAllEps(eps) {
        for (let i = 0; i < eps.length; i++) {
            super.addEp(eps[i]);
        }
    }
    static getUidFromJqueryObject(obj) {
        if (obj.is('tr')) {
            return (function () {
                let currectTd = Anime.getNameTr(obj);
                let tableRows = currectTd.find('a:not(a.comments)');
                if (tableRows.length > 1) {
                    throw 'Object must be unique';
                }
                return Anime._getUidFromAnchor(tableRows.get(0));
            }());
        }
        return null;
    }
    static getNameTr(obj) {
        return obj.find('td:nth-child(2)');
    }
    static getEpisodeFromAnchor(anchor) {
        let link = (function () {
            if (Utils.isjQueryObject(anchor)) {
                return anchor.get(0);
            }
            return anchor;
        }());
        let uid = Anime._getUidFromAnchor(link);
        return Anime.getEpisodeFromUid(uid, true);
    }
    static getEpisodeFromUid(uid, skipSeedLimit) {
        let eps = super.abstractGetEps(skipSeedLimit);
        for (let i = 0, len = eps.length; i < len; i++) {
            let currentEp = eps[i];
            if (currentEp.uid === uid) {
                return currentEp;
            }
        }
        return null;
    }
    static _getUidFromAnchor(anchor) {
        if (typeof anchor === 'string') {
            if (anchor.indexOf(".torrent") > -1) {
                return anchor.replace(".torrent", "").split("/").pop();
            }
            return anchor.split("/").pop();
        }
        return anchor.href.split("/").pop();
    }
    static getEpisodesFromResidence(resides, exclude, skipSeedLimit) {
        let arrayOfEps = [];
        let eps = super.abstractGetEps(skipSeedLimit);
        for (let i = 0, len = eps.length; i < len; i++) {
            let currentEp = eps[i];
            if (exclude === true) {
                if (currentEp.resides !== resides) {
                    arrayOfEps.push(currentEp);
                }
            }
            else {
                if (currentEp.resides === resides) {
                    arrayOfEps.push(currentEp);
                }
            }
        }
        return arrayOfEps;
    }
    static getPageUrls() {
        function range(start, end) {
            // @ts-ignore
            return Array(end - start + 1).fill().map((_, idx) => start + idx);
        }
        let pages = $(".center > ul.pagination a");
        if (pages.length === 0) {
            return [];
        }
        let firstPage = Utils.getElementFromJqueryArray(pages, 1);
        let lastPage = Utils.getElementFromJqueryArray(pages, pages.length - 2);
        let firstPageNumber = Number.parseInt(firstPage.text());
        let lastPageNumber = Number.parseInt(lastPage.text());
        let rangeBetween = range(firstPageNumber, lastPageNumber);
        let baseUrl = window.location.href;
        let urls = [];
        let currentPage = QueryString.p === undefined ? 1 : QueryString.p;
        for (let i = 0; i < rangeBetween.length; i++) {
            let num = String(rangeBetween[i]);
            if (num == currentPage) {
                continue;
            }
            let newUrl = Utils.addParameter(baseUrl, "p", num.toString());
            urls.push(newUrl);
        }
        return urls;
    }
    static removeEpisodesFromUid(uid) {
        let episode = Anime.getEpisodeFromUid(uid, true);
        super.removeEpisodeFromAnime(episode);
    }
    static removeEpisodesFromResidence(resides, exclude) {
        let eps = Anime.getEpisodesFromResidence(resides, exclude, true);
        for (let i = 0, len = eps.length; i < len; i++) {
            let currentEp = eps[i];
            this.removeEpisodeFromAnime(currentEp);
        }
    }
    static getAmountOfEps() {
        return super.abstractGetEps(true).length;
    }
    static getEpisodeFromUrl(url) {
        let eps = super.abstractGetEps(true);
        for (let i = 0, len = eps.length; i < len; i++) {
            let ep = eps[i];
            if (ep.downloadLink === url) {
                return ep;
            }
        }
        return null;
    }
}
Anime._availableRes = [];
Anime._supportedRes = [{ "res": 1080, "fullRes": "1920x1080" }, {
        "res": 720,
        "fullRes": "1280x720"
    }, { "res": 480, "fullRes": "640x480" }, { "res": 360, "fullRes": "640x360" }];
class Utils {
    constructor() {
    }
    static downloadViaJavaScript(url, data, callBack, _type = "POST", fileName = null) {
        let xhr = new XMLHttpRequest();
        xhr.open(_type, url, true);
        xhr.responseType = "blob";
        xhr.withCredentials = true;
        if (_type == "POST") {
            xhr.setRequestHeader("Content-type", "application/json");
        }
        let hasError = false;
        let mediaType = null;
        xhr.onreadystatechange = function () {
            let error = null;
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (hasError) {
                    if (xhr.response != null && xhr.response.length > 0) {
                        error = xhr.response;
                    }
                    else {
                        error = "internal server error";
                    }
                }
                let contentDispositionHeader = xhr.getResponseHeader("Content-Disposition");
                if (fileName == null && contentDispositionHeader != null && contentDispositionHeader.indexOf("filename") > -1) {
                    fileName = contentDispositionHeader.split("filename").pop();
                    fileName = fileName.replace("=", "");
                    fileName = fileName.trim();
                    fileName = fileName.replace(/"/g, "");
                }
                let mediaTypeHeader = xhr.getResponseHeader("Content-Type");
                if (mediaTypeHeader != null) {
                    mediaType = mediaTypeHeader;
                }
                else {
                    mediaType = "application/octet-stream";
                }
                let blob = xhr.response;
                /*let returnFunction = function save() {
                    if (hasError) {
                        let error:string = "Unable to download file: '" +fileName+ "' Please download this file manually";
                        alert(error);
                        return;
                    }
                }.bind(this, );*/
                let saveAsFunc = saveAs.bind(this, blob, fileName, true);
                callBack.call(this, blob, fileName, hasError, error, saveAsFunc);
            }
            else if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
                if (xhr.status !== 200) {
                    xhr.responseType = "text";
                    hasError = true;
                }
            }
        };
        if (_type === "POST") {
            xhr.send(JSON.stringify(data));
        }
        else {
            xhr.send();
        }
    }
    ;
    static sortSelect(selElem) {
        let tmpAry = [];
        for (let i = 0, length = selElem.options.length; i < length; i++) {
            tmpAry[i] = [];
            tmpAry[i][0] = selElem.options[i].text;
            tmpAry[i][1] = selElem.options[i].dataset.url;
        }
        tmpAry.sort(function (a, b) {
            // @ts-ignore
            return a[0].toUpperCase().localeCompare(b[0].toUpperCase());
        });
        selElem.innerHTML = "";
        for (let i = 0, len = tmpAry.length; i < len; i++) {
            let op = new Option(tmpAry[i][0]);
            op.dataset.url = tmpAry[i][1];
            selElem.options[i] = op;
        }
    }
    static injectCss(css) {
        function _isUrl(url) {
            let matcher = new RegExp(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/);
            return matcher.test(url);
        }
        if (_isUrl(css)) {
            $("<link>").prop({
                "type": "text/css",
                "rel": "stylesheet"
            }).attr("href", css).appendTo("head");
        }
        else {
            $("<style>").prop("type", "text/css").html(css).appendTo("head");
        }
    }
    static addParameter(url, parameterName, parameterValue, atStart = false) {
        let replaceDuplicates = true;
        let urlhash;
        let cl;
        if (url.indexOf('#') > 0) {
            cl = url.indexOf('#');
            urlhash = url.substring(url.indexOf('#'), url.length);
        }
        else {
            urlhash = '';
            cl = url.length;
        }
        let sourceUrl = url.substring(0, cl);
        let urlParts = sourceUrl.split("?");
        let newQueryString = "";
        if (urlParts.length > 1) {
            let parameters = urlParts[1].split("&");
            for (let i = 0; (i < parameters.length); i++) {
                let parameterParts = parameters[i].split("=");
                if (!(replaceDuplicates && parameterParts[0] == parameterName)) {
                    if (newQueryString == "") {
                        newQueryString = "?";
                    }
                    else {
                        newQueryString += "&";
                    }
                    newQueryString += parameterParts[0] + "=" + (parameterParts[1] ? parameterParts[1] : '');
                }
            }
        }
        if (newQueryString == "") {
            newQueryString = "?";
        }
        if (atStart) {
            newQueryString = '?' + parameterName + "=" + parameterValue + (newQueryString.length > 1 ? '&' + newQueryString.substring(1) : '');
        }
        else {
            if (newQueryString !== "" && newQueryString != '?')
                newQueryString += "&";
            newQueryString += parameterName + "=" + (parameterValue ? parameterValue : '');
        }
        return urlParts[0] + newQueryString + urlhash;
    }
    static getElementFromJqueryArray(elm, index) {
        return elm.filter(function (i) {
            return i === index;
        });
    }
    ;
    static getTable() {
        return $('table');
    }
    static getQueryFromUrl(url) {
        return url.split("&").reduce(function (prev, curr, i, arr) {
            let p = curr.split("=");
            prev[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
            return prev;
        }, {});
    }
    static isjQueryObject(obj) {
        return obj instanceof jQuery || 'jquery' in Object(obj);
    }
    static disableButton(button) {
        button.prop('disabled', true);
    }
    static enableButton(button) {
        button.prop('disabled', false);
    }
    // @ts-ignore
    static doDownloads(event) {
        $('#crossPage').prop('disabled', true);
        let type = $(event.target).data('type');
        let html = UI.builDownloadAlert(type);
        let urlsToDownload = [];
        $('#alertUser').html(html).slideDown("slow").show();
        if (type === 'downloadSelected') {
            $.each($('.checkboxes:checked').prev('a'), function () {
                let ep = Anime.getEpisodeFromAnchor(this);
                urlsToDownload.push(ep.downloadLink);
            });
        }
        else if (type === 'downloadSelects') {
            $.each($('#animeSelection option:selected'), function () {
                let url = this.dataset.url;
                urlsToDownload.push(url);
            });
        }
        else {
            let eps = Anime.getEpsForRes(parseInt($('#downloadRes').val()), false);
            for (let i = 0, len = eps.length; i < len; i++) {
                urlsToDownload.push(eps[i].downloadLink);
            }
        }
        bindAlertControls();
        function bindAlertControls() {
            $('#alertButtonCancel').on('click', function () {
                $('#alertUser').slideUp('slow');
                $('#crossPage').prop('disabled', false);
            });
            $('#alertButton').on('click', function () {
                doIt(urlsToDownload, false);
            });
            $("#downloadZip").on("click", function () {
                doIt(urlsToDownload, true);
            });
        }
        function doIt(urls, asZip) {
            let ajaxPromiseMap = new Map();
            let arrayd = [];
            for (let i = 0; i < urls.length; i++) {
                let d = $.Deferred();
                ajaxPromiseMap.set(urls[i], d);
                arrayd.push(d);
            }
            $.when.apply($, arrayd).done(function () {
                if (!asZip) {
                    return;
                }
                // @ts-ignore
                let zip = new JSZip();
                let errors = [];
                for (let i = 0; i < arguments.length; i++) {
                    let arg = arguments[i];
                    let blob = arg[0];
                    let fileName = arg[1];
                    let error = arg[2];
                    if (error !== null) {
                        errors.push(fileName);
                    }
                    if (errors.length > 0) {
                        let errorMessage = "Unable to download the following files: \n" + errors.join("\n") + "\n Please download these files manually";
                        alert(errorMessage);
                    }
                    zip.file(fileName, blob);
                }
                $("#progressStatus").text("Generating zip file...");
                zip.generateAsync({ type: "blob" }).then(function (blob) {
                    saveAs(blob, Anime.currentAnime + ".zip");
                    $("#loadingContainer").hide();
                    $("#progressStatus").text(null);
                    $("#progressBarForZip").width(0);
                    $('#alertUser').slideUp('slow');
                }, function (err) {
                    alert(err);
                });
            });
            let timerOffset = 0;
            if (asZip) {
                $("#loadingContainer").show();
            }
            let count = 0;
            for (let [currentUrl, deferr] of ajaxPromiseMap) {
                let ep = Anime.getEpisodeFromUrl(currentUrl);
                let fileName = ep.title.replace(/ /g, "_") + ".torrent";
                setTimeout(() => {
                    count++;
                    Utils.downloadViaJavaScript(currentUrl, undefined, (blob, fileName, hasError, error, saveFunc) => {
                        if (!asZip) {
                            saveFunc();
                        }
                        else {
                            let percent = Math.floor(100 * count / ajaxPromiseMap.size);
                            let doneAsString = percent + "%";
                            $("#progressStatus").text("Downloading torrents: " + doneAsString);
                            $("#progressBarForZip").width(doneAsString);
                        }
                        if (hasError) {
                            deferr.resolve(blob, fileName, error);
                        }
                        else {
                            deferr.resolve(blob, fileName, null);
                        }
                    }, "GET", fileName);
                }, timerOffset);
                timerOffset += 450;
            }
            if (!asZip) {
                $('#alertUser').slideUp('slow');
            }
            $('#crossPage').prop('disabled', false);
        }
    }
    static checkBoxValid(checkbox) {
        return checkbox.is(':checked');
    }
    static _minSeedsSet() {
        let seeds = Localstore.getMinSeedsFromStore();
        if (seeds !== null && seeds.length > 0) {
            return Number.parseInt(seeds) !== 1;
        }
        return false;
    }
    static getCurrentPageOffset() {
        return parseInt((typeof QueryString.p === 'undefined') ? 1 : QueryString.p);
    }
    static arrayCopy(array, deep = false) {
        return $.extend(deep, [], array);
    }
    static cleanAvailableResolutions() {
        let avRes = Utils.arrayCopy(Anime.availableRes, true);
        for (let i = 0, len = avRes.length; i < len; i++) {
            let currentRes = avRes[i].res;
            if (Anime.getAmountOfEpsFromRes(currentRes, true) === 0) {
                Anime.removeAvailableResolutions(currentRes);
            }
        }
    }
    static sortAllControls() {
        Utils.sortSelect(document.getElementById('animeSelection'));
        Utils.sortSelect(document.getElementById('downloadRes'));
        // @ts-ignore
        $('#info').sortTable(0);
    }
    static reBindSelectFilters() {
        // @ts-ignore
        $('input[name=\'filterSelect\']').offOn('change', handleSelect);
        // @ts-ignore
        $('#clearResOptions').offOn('click', handleSelect);
        // @ts-ignore
        $("#animeSelection").offOn("click", function () {
            UI.autoEnableAcceptSelect();
        });
        // @ts-ignore
        $("#selectAllFromControl").offOn("click", function () {
            let allSelected = $("#animeSelection option:selected").length === $("#animeSelection option").length;
            if (allSelected) {
                $(this).text("Select all");
                $("#animeSelection option").prop("selected", false);
            }
            else {
                $(this).text("deselect all");
                $("#animeSelection option").prop("selected", true);
            }
            UI.autoEnableAcceptSelect();
        });
        function handleSelect(event) {
            let resTOFilter = $(event.target).data('set');
            $('#selectAnime').html(UI.buildSelect(resTOFilter));
            Utils.sortAllControls();
            let searchApplied = UI.getAppliedSearch();
            if (searchApplied !== '') {
                UI.applySearch(searchApplied);
            }
            Utils.reBindSelectFilters();
        }
    }
    static getHumanReadableSize(from, decimals = 3) {
        let bits = 0;
        if (Array.isArray(from)) {
            for (let i = 0; i < from.length; i++) {
                let ep = from[i];
                bits += ep.size;
            }
        }
        else if (typeof from === 'number') {
            bits = from;
        }
        else {
            bits += from.size;
        }
        function formatBytes(bytes, decimals) {
            if (bytes == 0) {
                return '0 Byte';
            }
            let k = 1024;
            let dm = decimals + 1 || 3;
            let sizes = [
                'Bytes',
                'KB',
                'MB',
                'GB',
                'TB',
                'PB',
                'EB',
                'ZB',
                'YB'
            ];
            let i = Math.floor(Math.log(bytes) / Math.log(k));
            return (bytes / Math.pow(k, i)).toPrecision(dm) + ' ' + sizes[i];
        }
        return formatBytes(bits, decimals);
    }
}
class UI {
    constructor() {
    }
    static buildTable() {
        let html = '';
        html += '<table class="table table-bordered table-hover table-striped torrent-list" style=\'width: 100%\' id=\'info\'>';
        html += '<caption>Download infomation</caption>';
        html += '<thead>';
        html += '<tr>';
        html += '<th>resolution</th>';
        html += '<th>Episode count</th>';
        html += '<th>Average seeds</th>';
        html += '<th>Average leechers</th>';
        html += '<th>Total size</th>';
        html += '</tr>';
        html += '</thead>';
        html += '<tbody>';
        let allRes = Anime.availableRes;
        for (let i = 0; i < allRes.length; i++) {
            let currRes = allRes[i];
            let localRes = currRes.res;
            html += '<tr>';
            html += '<td>' + (localRes === -1 ? 'Others' : localRes + 'p') + '</td>';
            html += '<td>' + Anime.getAmountOfEpsFromRes(localRes, true) + '</td>';
            html += '<td>' + Anime.avgSeedsForRes(localRes, true) + '</td>';
            html += '<td>' + Anime.avgPeersForRes(localRes, true) + '</td>';
            html += '<td>' + Anime.getTotalSizeForRes(localRes, true) + ' (aprox)</td>';
            html += '</tr>';
        }
        html += '</tbody>';
        html += '</table>';
        return html;
    }
    static stateChangeAcceptSelect(state) {
        // @ts-ignore
        $("#acceptSelect").enableButton(state);
    }
    static autoEnableAcceptSelect() {
        let selection = $("#animeSelection option:selected");
        UI.stateChangeAcceptSelect(selection.length > 0);
    }
    static buildDropdownSelections() {
        let html = '';
        html += '<select class="form-control" style="margin-right:5px;display: inline;width: auto;" id="downloadRes">';
        let allRes = Anime.availableRes;
        for (let i = 0; i < allRes.length; i++) {
            let currRes = allRes[i];
            let localRes = currRes.res;
            html += '<option value=' + localRes + '>' + (localRes === -1 ? 'Others' : localRes + 'p') + '</option>';
        }
        html += '</select>';
        return html;
    }
    static builDownloadAlert(type) {
        let amountOfAnime = 0;
        let selectedRes = Number.parseInt($('#downloadRes').val());
        let res = null;
        let totalSize = null;
        if (type === 'downloadSelected') {
            amountOfAnime = $('.checkboxes:checked').length;
            res = 'custom';
        }
        else if (type === 'downloadSelects') {
            amountOfAnime = $('#animeSelection option:selected').length;
            totalSize = Utils.getHumanReadableSize((function () {
                let localSize = 0;
                $('#animeSelection option:selected').each(function () {
                    let url = this.dataset.url;
                    localSize += Anime.getEpisodeFromAnchor(url).size;
                });
                return localSize;
            }()));
            res = 'custom';
        }
        else {
            amountOfAnime = Anime.getAmountOfEpsFromRes(selectedRes, false);
            res = selectedRes === -1 ? 'Others' : selectedRes + 'p';
            totalSize = Anime.getTotalSizeForRes(parseInt(res), false);
        }
        let seedLimit = Localstore.getMinSeedsFromStore();
        if (seedLimit === "-1") {
            seedLimit = "none";
        }
        let html = '';
        html += '<div class=\'alert alert-success\'>';
        html += '<div><strong>Download: ' + res + '</strong></div> <br />';
        html += '<div><strong>Seed Limit: ' + seedLimit + '</strong></div>';
        if (totalSize !== null) {
            html += '<br /><div><strong>Total size: ' + totalSize + ' (aprox)</strong></div>';
        }
        html += '<p>You are about to download ' + amountOfAnime + ' ep(s)</p>';
        html += '<p>This will cause ' + amountOfAnime + ' download pop-up(s) Are you sure you want to continue?</p>';
        html += '<p>If there are a lot of eps, your browser might stop responding for a while. This is normal. If you are on Google Chrome, it will ask you to allow multiple-downloads</p>';
        html += '<button type="button" class="btn btn-warning downloadButton" id=\'alertButtonCancel\'>Cancel</button>';
        html += '<button type="button" class="btn btn-success downloadButton" id=\'alertButton\'>Okay</button>';
        html += '<button type="button" class="btn btn-success downloadButton" id=\'downloadZip\'>Download as zip</button>';
        html += "<div class='hidden' id='loadingContainer'>";
        html += "<hr />";
        html += "<div class=\"progress\">";
        html += "<div id='progressBarForZip' class=\"progress-bar progress-bar-striped active\" role=\"progressbar\" aria-valuenow=\"45\" aria-valuemin=\"0\" aria-valuemax=\"100\" style='width: 100%;'>Current status: <span id='progressStatus'></span></div>";
        html += "</div>";
        html += "</div>";
        html += '</div>';
        return html;
    }
    static showAjaxErrorAlert(ajaxInfo) {
        let parseError = $('#parseErrors');
        if (!parseError.is(':hidden')) {
            return null;
        }
        parseError.html('');
        let html = '';
        html += '<div class=\'alert alert-danger\'>';
        html += '<p>There was an error in getting the information from page: \'' + ajaxInfo.error.pageAtError + '\'</p>';
        html += '<p>The last successful page parsed was page number ' + (ajaxInfo.currentPage === null ? 1 : ajaxInfo.currentPage) + ' </p>';
        html += '<button id=\'errorClose\' class="btn btn-primary"> close </button>';
        html += '</div>';
        parseError.show();
        parseError.html(html);
        $('#errorClose').off('click').on('click', function () {
            $('#parseErrors').slideUp('slow', function () {
                $(this).html('');
            });
        });
    }
    static buildSelect(resTOFilter = "none") {
        let html = '';
        UI.epsInSelect = [];
        let minSeeds = Number.parseInt(Localstore.getMinSeedsFromStore());
        html += '<div id=\'selectWrapper\'>';
        html += '<div id=\'selectContainer\'>';
        html += '<p>Or you can select episodes here:</p>';
        html += '<p>Seed limit: ' + (minSeeds === -1 ? 'None' : minSeeds) + '</p>';
        html += '<select class="form-control" id=\'animeSelection\' multiple size=\'20\'>';
        let allRes = Anime.availableRes;
        for (let i = 0; i < allRes.length; i++) {
            let currRes = allRes[i];
            let localRes = currRes.res;
            let eps = Anime.getEpsForRes(localRes, false);
            for (let j = 0, len = eps.length; j < len; j++) {
                let currentEp = eps[j];
                if (resTOFilter == 'none' || currentEp.res == resTOFilter) {
                    html += '<option data-url=\'' + currentEp.downloadLink + '\'>';
                    html += currentEp.title + ' - Seeders: ' + currentEp.seeds;
                    UI.epsInSelect.push(currentEp);
                    html += '</option>';
                }
                else {
                    break;
                }
            }
        }
        html += '</select>';
        html += '<span>Filter select control: </span>';
        let checked = false;
        for (let i = 0; i < allRes.length; i++) {
            if (resTOFilter == allRes[i].res) {
                checked = true;
            }
            html += '<input type=\'radio\' ' + (checked ? 'checked' : '') + ' data-set= \'' + allRes[i].res + '\' name=\'filterSelect\'/>' + '<label class="filterLabel">' + (allRes[i].res === -1 ? 'Others' : allRes[i].res + 'p') + '</label>';
            checked = false;
        }
        html += '<a id=\'clearResOptions\' data-set=\'none\' >clear resolution filter</a>';
        html += '<a id=\'selectAllFromControl\'>Select all</a>';
        html += '</div>';
        html += '</div>';
        // @ts-ignore
        $("#acceptSelect").enableButton(false);
        return html;
    }
    static applySearch(textToFilter) {
        let opts = UI.epsInSelect;
        let rxp = new RegExp(textToFilter);
        let optlist = $('#animeSelection').empty();
        for (let i = 0, len = opts.length; i < len; i++) {
            let ep = opts[i];
            if (rxp.test(ep.title)) {
                optlist.append('<option data-url=\'' + ep.downloadLink + '\'>' + ep.title + ' - Seeders: ' + ep.seeds + '</option>');
            }
        }
        UI.searchApplied = textToFilter;
        Utils.sortSelect(document.getElementById("animeSelection"));
        UI.autoEnableAcceptSelect();
    }
    static getAppliedSearch() {
        return UI.searchApplied;
    }
    static getEpsInSelect() {
        return UI.epsInSelect;
    }
}
UI.epsInSelect = [];
UI.searchApplied = '';
class DataParser {
    constructor(table) {
        this.table = null;
        this.table = table;
    }
    parseTable(currentPage) {
        let trRow = this.table.find('img[src*=\'/static/img/icons/nyaa/1_2.png\']').closest('tr');
        let eps = [];
        $.each($(trRow), function () {
            let resInfo = parseRes(this);
            if (resInfo === null) {
                Anime.addAvailableResolutions(-1, null);
            }
            else {
                Anime.addAvailableResolutions(resInfo.res, resInfo.fullRes);
            }
            let info = getEpisodeInfo(this);
            eps.push(new Episode(typeof resInfo.res === ('undefined') ? -1 : resInfo.res, info.currentDownloadLink, info.seeds, info.leech, info.uid, currentPage, info.title, info.size));
        });
        return eps;
        function parseRes(eventContent) {
            let supportedRes = Anime.supportedRes;
            for (let i = 0; i < supportedRes.length; i++) {
                let currRes = supportedRes[i].res;
                let currFullRes = supportedRes[i].fullRes;
                if ($(eventContent).children('td:nth-child(2)').text().indexOf(currRes + 'p') > -1 || $(eventContent).children('td:nth-child(2)').text().indexOf(currFullRes) > -1) {
                    return supportedRes[i];
                }
            }
        }
        function getEpisodeInfo(eventContent) {
            let _eventContent = $(eventContent);
            let currentDownloadLink = Anime.getTdFromTable(_eventContent, 3).find("a")[0].href;
            function getTextContent(idx) {
                return (isNaN(parseInt(Anime.getTdFromTable(_eventContent, idx).text()))) ? 0 : parseInt(Anime.getTdFromTable(_eventContent, idx).text());
            }
            function convertToString(ev) {
                let sizeValue = Anime.getTdFromTable(ev, 4).text();
                let sizeText = $.trim(sizeValue.split(' ').pop());
                let intValue = parseInt(sizeValue);
                switch (sizeText) {
                    case "MiB":
                        return ((Math.pow(2, 20))) * intValue;
                    case "GiB":
                        return intValue * 1073741824;
                    default:
                        return 0;
                }
            }
            let seeds = getTextContent(6);
            let leech = getTextContent(7);
            let title = Anime.getTdFromTable(_eventContent, 2).text().trim().substring(1).trim();
            let uid = Anime.getUidFromJqueryObject(_eventContent);
            let size = convertToString(_eventContent);
            return {
                'currentDownloadLink': currentDownloadLink,
                'seeds': seeds,
                'leech': leech,
                'title': title,
                'uid': uid,
                "size": size
            };
        }
    }
}
class Localstore {
    constructor() {
    }
    static getMinSeedsFromStore() {
        let lo = localStorage.getItem('minSeeds');
        return lo === null ? "-1" : lo;
    }
    static setMinSeedsFromStore(seeds) {
        localStorage.setItem('minSeeds', seeds.toString());
    }
    static removeMinSeedsFromStore() {
        localStorage.removeItem('minSeeds');
    }
}
let QueryString = (() => {
    if (typeof window == "undefined") {
        return {};
    }
    let query_string = {};
    let query = window.location.search.substring(1);
    let vars = query.split("&");
    for (let i = 0; i < vars.length; i++) {
        let pair = vars[i].split("=");
        if (typeof query_string[pair[0]] === "undefined") {
            query_string[pair[0]] = pair[1];
        }
        else if (typeof query_string[pair[0]] === "string") {
            query_string[pair[0]] = [query_string[pair[0]], pair[1]];
        }
        else {
            query_string[pair[0]].push(pair[1]);
        }
    }
    return query_string;
})();
// Download fix for firefox
HTMLElement.prototype.click = function () {
    let evt = this.ownerDocument.createEvent('MouseEvents');
    evt.initMouseEvent('click', true, true, this.ownerDocument.defaultView, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
    this.dispatchEvent(evt);
};
class Main {
    constructor() {
    }
    static main() {
        Main.setAnimeObj();
        Main.buildUi();
        Main.bindListeners();
    }
    static setAnimeObj() {
        if (QueryString.q !== '') {
            Anime.currentAnime = decodeURIComponent(QueryString.q).split('+').join(' ');
        }
        else {
            Anime.currentAnime = "unknown";
        }
        let paths = window.location.pathname.split("/");
        Anime.currentSubber = paths[2];
        let instance = new DataParser(Utils.getTable());
        let eps = instance.parseTable(Utils.getCurrentPageOffset());
        Anime.addAllEps(eps);
    }
    static buildUi() {
        makeStyles();
        buildPanel();
        afterBuild();
        function makeStyles() {
            let styles = '';
            styles += '.collapsem{cursor: pointer; position: absolute; right: 4px; top: 2px;}';
            styles += '.panel-success > .panel-heading {position: relative;}';
            styles += '.avgSeeds{floar:left; padding-right:10px; color:#3c763d;}';
            styles += '.checkboxes{left:1px; margin:0; padding:0; position: relative; top: 1px; z-index: 1;}';
            styles += '#topbar{z-index: 2 !important;}';
            styles += 'label[for=\'MinSeeds\']{ display: block; margin-top: 10px;}';
            styles += '.filterLabel{margin-right: 10px;}';
            styles += '.alert {position:relative;}';
            styles += '#alertUser, #parseErrors{margin-top: 15px;}';
            styles += ".downloadButton {position:absolute; bottom:5px;}";
            styles += '#alertButton{right:78px;}';
            styles += '#alertButtonCancel{right: 5px;}';
            styles += '#downloadZip{right: 140px;}';
            styles += '#errorClose{position:absolute; bottom:5px; right: 11px;}';
            styles += '#animeSelection{width: 100%;}';
            styles += '#clearResOptions{margin-left: 10px; margin-right: 10px ;cursor: pointer;}';
            styles += '#selectAllFromControl{cursor: pointer;}';
            styles += '#downloadCustomButton{float:right;}';
            styles += '#findEp{float: right; position: relative; bottom: 20px; width: 180px;}';
            styles += "#loadingContainer{margin-top: 15px; margin-bottom: 45px;}";
            Utils.injectCss('https://maxcdn.bootstrapcdn.com/font-awesome/4.4.0/css/font-awesome.min.css');
            Utils.injectCss(styles);
        }
        function buildPanel() {
            let html = '';
            html += '<div class="panel panel-success">';
            html += '<div class="panel-heading">';
            html += '<h3 id="panel-title" class="panel-title"></h3>';
            html += '<i class="fa fa-minus collapsem" id="collapseToggle" title="Hide"></i>';
            html += '</div>';
            html += '<div class="panel-body" id="pannelContent"></div>';
            html += '</div>';
            $('.container > .row > h3').after(html);
            buildPanelContent();
            function buildPanelContent() {
                let html = '';
                html += '<div>';
                $('#panel-title').html('<span> Download "' + Anime.currentAnime + ' (' + Anime.currentSubber + ')"</span>');
                if (Anime.getAmountOfEps() === 0) {
                    html += '<span> No translated anime found or error occured</span>';
                    html += '</div>';
                    $('#pannelContent').html(html);
                    return;
                }
                html += '<span>Pick a resolution: </span>';
                html += '<span id=\'selectDownload\'>';
                html += UI.buildDropdownSelections();
                html += '</span>';
                html += '<button class="btn btn-default" type="button" data-type=\'downloadAll\' id="downloadAll">Download all</button>';
                html += '<button class="btn btn-default" type=\'button\' id=\'downloadCustomButton\' data-type=\'downloadSelected\' >download your selected items</button>';
                html += '</div>';
                html += '<div id=\'options\'>';
                html += '<div class="checkbox">';
                html += "<label>";
                html += '<input type=\'checkbox\' id=\'crossPage\' /> ';
                html += "include Cross pages";
                html += "</label>";
                html += "</div>";
                html += '<div class="input-group">';
                html += '<input placeholder="Minimum seeders" class="form-control" type=\'number\' min=\'0\' id=\'MinSeeds\' title=\'Any episode that is below this limit will be excluded from the download.\'/>';
                html += '<span class="input-group-btn">';
                html += '<button class="btn btn-default" type=\'button\' id=\'SaveMinSeeds\'>Save</button>';
                html += "</span>";
                html += "</div>";
                html += '<div id=\'tableInfo\'>';
                html += UI.buildTable();
                html += '</div>';
                html += '<div id=\'alertUser\' class=\'hide\'></div>';
                html += '<div class=\'selectAnime\' id=\'selectAnime\'>';
                html += UI.buildSelect();
                html += '</div>';
                html += '<input class="form-control" type=\'text\' id=\'findEp\' placeholder=\'Search Select (or use regex) \' />';
                html += '<button class="btn btn-default" disabled id=\'acceptSelect\' data-type=\'downloadSelects\'>Select for download</button>';
                html += '<div id=\'parseErrors\' class =\'hide\'></div>';
                $('#pannelContent').html(html);
            }
        }
        function afterBuild() {
            makeCheckBoxes();
            sortLists();
            function makeCheckBoxes() {
                $('.tlistdownload > a').after('<input class=\'checkboxes\' type=\'checkbox\'/>');
            }
            function sortLists() {
                Utils.sortAllControls();
            }
        }
    }
    static bindListeners() {
        Utils.reBindSelectFilters();
        $('#downloadAll').on('click', function (e) {
            Utils.doDownloads(e);
        });
        $('.checkboxes').on('click', function (e) {
            if (Utils.checkBoxValid($('.checkboxes'))) {
                Utils.enableButton($('#downloadCustomButton'));
            }
            else {
                Utils.disableButton($('#downloadCustomButton'));
            }
        });
        $('#crossPage').on('click', function (e) {
            preformParsing(Anime.getPageUrls());
            function preformParsing(urls) {
                if (urls.length === 0) {
                    return;
                }
                if (Utils.checkBoxValid($('#crossPage'))) {
                    $('#tableInfo').html('<p>Please wait while we parse each page...</p>');
                    $('#selectAnime').html('');
                    $('#acceptSelect').hide();
                    $('#crossPage, #downloadAll').prop('disabled', true);
                    $('#parseErrors').slideUp('fast', function () {
                        $(this).html('');
                    });
                    let AjaxInfo = {
                        error: {
                            pageAtError: null
                        },
                        currentPage: null
                    };
                    let ajaxPromiseMap = new Map();
                    let arrayd = [];
                    for (let i = 0; i < urls.length; i++) {
                        let d = $.Deferred();
                        ajaxPromiseMap.set(urls[i], d);
                        arrayd.push(d);
                    }
                    $.when.apply($, arrayd).done(function () {
                        if (AjaxInfo.error.pageAtError !== null) {
                            UI.showAjaxErrorAlert(AjaxInfo);
                        }
                        $('#tableInfo').html(UI.buildTable());
                        $('#downloadRes').html(UI.buildDropdownSelections());
                        $('#selectAnime').html(UI.buildSelect());
                        Utils.sortAllControls();
                        $('#acceptSelect').show();
                        Utils.reBindSelectFilters();
                        $('#crossPage, #downloadAll').prop('disabled', false);
                    });
                    let timeOut = 0;
                    for (let [cur, deferr] of ajaxPromiseMap) {
                        let currentPage = 0;
                        let queryObjet = Utils.getQueryFromUrl(cur);
                        if (queryObjet.p) {
                            currentPage = queryObjet.p;
                        }
                        else {
                            currentPage = 1;
                        }
                        setTimeout(() => {
                            let ajax = $.ajax(cur);
                            ajax.done(function (data) {
                                AjaxInfo.currentPage = currentPage;
                                let table = $(data).find(("table"));
                                let parser = new DataParser(table);
                                $('#tableInfo').append('<div>Page ' + currentPage + ' Done </div>');
                                Anime.addAllEps(parser.parseTable(currentPage));
                            }).fail(function () {
                                AjaxInfo.error.pageAtError = Number.parseInt(cur.split('=').pop());
                                $('#tableInfo').append('<div>Page ' + currentPage + ' Done </div>');
                            }).always(function () {
                                deferr.resolve();
                            });
                        }, timeOut);
                        timeOut += 300;
                    }
                }
                else {
                    // noinspection JSMismatchedCollectionQueryUpdate
                    let tableInfoElm = $('#tableInfo');
                    tableInfoElm.html('<p>Please wait while we re-calculate the Episodes</p>');
                    let currentPage = Utils.getCurrentPageOffset();
                    Anime.removeEpisodesFromResidence(currentPage, true);
                    Utils.cleanAvailableResolutions();
                    $('#downloadRes').html(UI.buildDropdownSelections());
                    tableInfoElm.html(UI.buildTable());
                    $('#selectAnime').html(UI.buildSelect());
                    Utils.reBindSelectFilters();
                    Utils.sortAllControls();
                }
            }
        });
        $('#SaveMinSeeds').on('click', function (e) {
            if (parseInt($('#MinSeeds').val()) < 0) {
                alert('number cannot be negative');
                return;
            }
            let value;
            value = $('#MinSeeds').val() === '' ? parseInt("-1") : parseInt($('#MinSeeds').val());
            Localstore.setMinSeedsFromStore(value);
            if (value === -1) {
                alert('Minimum seeds have been cleared');
            }
            else {
                alert('Minimum seeds now set to: ' + value);
            }
            $('#selectAnime').html(UI.buildSelect());
            Utils.sortAllControls();
            Utils.reBindSelectFilters();
        });
        $('#collapseToggle').on('click', function () {
            $('#pannelContent').stop(true, true).slideToggle('slow', function () {
                let elm = $('#collapseToggle');
                if ($(this).is(':hidden')) {
                    elm.removeClass('fa-minus').addClass('fa-plus');
                    elm.attr('title', 'Show');
                }
                else {
                    elm.addClass('fa-minus').removeClass('fa-plus');
                    elm.attr('title', 'Hide');
                }
            });
        });
        $('#acceptSelect').on('click', function (e) {
            Utils.doDownloads(e);
        });
        $('#findEp').on('keyup', function () {
            UI.applySearch($(this).val());
        });
    }
}
Main.main();
