// ==UserScript==
// @name        Nyaa.si Batch downloader
// @namespace   Autodownload
// @author      Victorique
// @description Batch download torrents from nyaa.si
// @include     *://nyaa.si/user/*?q=*
// @include     *://nyaa.si/user/*?f=*&c=*&q=*
// @version     7
// @icon        https://i.imgur.com/nx5ejHb.png
// @license     MIT
// @run-at      document-idle
// @grant       none
// @require     https://greasyfork.org/scripts/19117-jsutils/code/JsUtils.js
// @require     https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/1.3.8/FileSaver.min.js
// ==/UserScript==

import Deferred = JQuery.Deferred;
import jqXHR = JQuery.jqXHR;

//TODO: refactor this into interfaces
type resType = { res: number, fullRes: string };
type ajaxInfo = { error: { pageAtError: number }, currentPage: number };
type jsonType = { [key: string]: any }
type epInfo = { "currentDownloadLink": string, 'seeds': number, 'leech': number, 'title': string, "uid": string, "size": number };

class Episode {
    private readonly _res: number;
    private readonly _downloadLink: string;
    private readonly _seeds: number;
    private readonly _leechers: number;
    private readonly _uid: string;
    private readonly _resides: number;
    private readonly _title: string;
    private readonly _size: number;

    constructor(res: number, downloadLink: string, seeds: number, leechers: number, uid: string, resides: number, title: string, size: number) {
        this._res = res;
        this._downloadLink = downloadLink;
        this._seeds = seeds;
        this._leechers = leechers;
        this._uid = uid;
        this._resides = resides;
        this._title = title;
        this._size = size;
    }

    public get res(): number {
        return this._res;
    }

    public get downloadLink(): string {
        return this._downloadLink;
    }

    public get seeds(): number {
        return this._seeds;
    }

    public get leechers(): number {
        return this._leechers;
    }

    public get uid(): string {
        return this._uid;
    }

    public get resides(): number {
        return this._resides;
    }

    public get title(): string {
        return this._title;
    }

    public get size(): number {
        return this._size;
    }

    public equals(ep: Episode): boolean {
        return this.uid === ep.uid;
    }
}

abstract class _AbstractEps {
    private static eps: Array<Episode> = []; // this is the main array that holds all the episodes per anime

    protected static abstractGetEps(skipSeedLimit: boolean): Array<Episode> {
        let minSeeds: number = Number.parseInt(Localstore.getMinSeedsFromStore());
        if (minSeeds > -1 && skipSeedLimit === false) {
            let arrayOfEps: Array<Episode> = [];
            for (let i: number = 0, len: number = _AbstractEps.eps.length; i < len; i++) {
                let currentEp: Episode = _AbstractEps.eps[i];
                if (currentEp.seeds < minSeeds) {
                    continue;
                }
                arrayOfEps.push(currentEp);
            }
            return arrayOfEps;
        } else {
            return _AbstractEps.eps;
        }
    }

    protected static addEp(ep: Episode): void {
        if (Anime.isValidRes(ep.res) === false) {
            throw new TypeError('The Episode supplied does not have a valid resolution');
        }
        for (let i: number = 0, len: number = _AbstractEps.eps.length; i < len; i++) {
            let epi: Episode = _AbstractEps.eps[i];
            if (epi.equals(ep)) {
                console.warn('The episode supplied already exsists, this episode has been ignored');
                return;
            }
        }
        _AbstractEps.eps.push(ep);
    }

    protected static removeEpisodeFromAnime(obj: Episode): void {
        let arr: Array<Episode> = _AbstractEps.eps;
        let i: number = arr.length;
        while (i--) {
            if (arr[i] === obj) {
                arr.splice(i, 1);
            }
        }
    }
}

class Anime extends _AbstractEps {
    private constructor() {
        super();
    }

    private static _currentAnime: string;
    private static _currentSubber: string;
    private static _availableRes: Array<resType> = [];
    private static _supportedRes: Array<resType> = [{"res": 1080, "fullRes": "1920x1080"}, {
        "res": 720,
        "fullRes": "1280x720"
    }, {"res": 480, "fullRes": "640x480"}, {"res": 360, "fullRes": "640x360"}];

    public static get currentAnime(): string {
        return Anime._currentAnime;
    }

    public static set currentAnime(value: string) {
        Anime._currentAnime = value;
    }

    public static get currentSubber(): string {
        return Anime._currentSubber;
    }

    public static set currentSubber(value: string) {
        Anime._currentSubber = value;
    }

    public static get supportedRes(): Array<resType> {
        return Anime._supportedRes;
    }

    public static addSupportedRes(res: resType) {
        Anime._supportedRes.push(res);
    }

    public static get availableRes(): Array<resType> {
        return Anime._availableRes;
    }

    public static addAvailableResolutions(res: number, fullRes: string): void {
        if (Anime._resExists(res)) {
            return;
        }
        Anime._availableRes.push({'res': res, 'fullRes': fullRes});
    }

    public static removeAvailableResolutions(resToRemove: string | number): void {
        for (let i: number = 0; i < Anime._availableRes.length; i++) {
            let currentRes: resType = Anime._availableRes[i];
            if (currentRes.res === resToRemove || currentRes.fullRes === resToRemove) {
                Anime._availableRes.splice(i, 1);
            }
        }
    }

    private static _resExists(_res: string | number): boolean {
        for (let i: number = 0; i < Anime._availableRes.length; i++) {
            let currentRes: resType = Anime._availableRes[i];
            if (currentRes.res === _res || currentRes.fullRes === _res) {
                return true;
            }
        }
        return false;
    }

    public static getTdFromTable(table: JQuery<HTMLElement>, index: number): JQuery<HTMLElement> {
        return table.find('td:nth-child(' + index + ')');
    }

    public static avgSeedsForRes(res: number, skipSeedLimit: boolean): number {
        let seedCount: number = 0;
        let epCount: number = Anime.getAmountOfEpsFromRes(res, skipSeedLimit);
        if (epCount === 0) {
            return 0;
        }
        let eps: Array<Episode> = super.abstractGetEps(skipSeedLimit);
        for (let i: number = 0, len: number = eps.length; i < len; i++) {
            let currentEp: Episode = eps[i];
            if (currentEp.res === res) {
                seedCount += currentEp.res;
            }
        }
        return Math.round(seedCount / epCount);
    }

    public static avgPeersForRes(res: number, skipSeedLimit: boolean): number {
        let leechCount: number = 0;
        let epCount: number = Anime.getAmountOfEpsFromRes(res, skipSeedLimit);
        if (epCount === 0) {
            return 0;
        }
        let eps: Array<Episode> = super.abstractGetEps(skipSeedLimit);
        for (let i: number = 0, len: number = eps.length; i < len; i++) {
            let currentEp: Episode = eps[i];
            if (currentEp.res === res) {
                leechCount += currentEp.leechers;
            }
        }
        return Math.round(leechCount / epCount);
    }

    public static getTotalSizeForRes(res: number, skipSeedLimit: boolean, decimals: number = 3): string {
        let eps: Array<Episode> = Anime.getEpsForRes(res, skipSeedLimit);
        return Utils.getHumanReadableSize(eps, decimals);
    }

    public static getAmountOfEpsFromRes(res: number, skipSeedLimit: boolean): number {
        return Anime.getEpsForRes(res, skipSeedLimit).length;
    }

    public static getEpsForRes(res: number, skipSeedLimit: boolean): Array<Episode> {
        let arrayOfEps: Array<Episode> = [];
        let eps: Array<Episode> = super.abstractGetEps(skipSeedLimit);
        for (let i: number = 0, len: number = eps.length; i < len; i++) {
            let currentEp: Episode = eps[i];
            if (currentEp.res === res) {
                arrayOfEps.push(currentEp);
            }
        }
        return arrayOfEps;
    }

    public static isValidRes(res: number): boolean {
        return Anime._resExists(res);
    }

    public static addAllEps(eps: Array<Episode>): void {
        for (let i: number = 0; i < eps.length; i++) {
            super.addEp(eps[i]);
        }
    }

    public static getUidFromJqueryObject(obj: JQuery<HTMLElement>): string {
        if (obj.is('tr')) {
            return (function () {
                let currectTd: JQuery<HTMLElement> = Anime.getNameTr(obj);
                let tableRows: JQuery<HTMLElement> = currectTd.find('a:not(a.comments)');
                if (tableRows.length > 1) {
                    throw 'Object must be unique';
                }
                return Anime._getUidFromAnchor(tableRows.get(0));
            }());
        }
        return null;
    }

    private static getNameTr(obj: JQuery<HTMLElement>): JQuery<HTMLElement> {
        return obj.find('td:nth-child(2)');
    }

    public static getEpisodeFromAnchor(anchor: HTMLAnchorElement | JQuery<HTMLElement> | string): Episode {
        let link: HTMLAnchorElement = (function () {
            if (Utils.isjQueryObject(anchor)) {
                return <HTMLAnchorElement>(<JQuery<HTMLElement>>anchor).get(0);
            }
            return <HTMLAnchorElement>anchor;
        }());
        let uid: string = Anime._getUidFromAnchor(link);
        return Anime.getEpisodeFromUid(uid, true);
    }

    public static getEpisodeFromUid(uid: string, skipSeedLimit: boolean): Episode {
        let eps: Array<Episode> = super.abstractGetEps(skipSeedLimit);
        for (let i: number = 0, len = eps.length; i < len; i++) {
            let currentEp: Episode = eps[i];
            if (currentEp.uid === uid) {
                return currentEp;
            }
        }
        return null;
    }

    private static _getUidFromAnchor(anchor: string | JQuery<HTMLElement> | HTMLElement): string {
        if (typeof anchor === 'string') {
            if (anchor.indexOf(".torrent") > -1) {
                return anchor.replace(".torrent", "").split("/").pop();
            }
            return anchor.split("/").pop();
        }
        return (<HTMLAnchorElement>anchor).href.split("/").pop();
    }

    public static getEpisodesFromResidence(resides: number, exclude: boolean, skipSeedLimit: boolean): Array<Episode> {
        let arrayOfEps: Array<Episode> = [];
        let eps: Array<Episode> = super.abstractGetEps(skipSeedLimit);
        for (let i: number = 0, len: number = eps.length; i < len; i++) {
            let currentEp: Episode = eps[i];
            if (exclude === true) {
                if (currentEp.resides !== resides) {
                    arrayOfEps.push(currentEp);
                }
            } else {
                if (currentEp.resides === resides) {
                    arrayOfEps.push(currentEp);
                }
            }
        }
        return arrayOfEps;
    }

    public static getPageUrls(): Array<string> {
        function range(start: number, end: number): Array<number> {
            // @ts-ignore
            return Array(end - start + 1).fill().map((_, idx) => start + idx);
        }

        let pages: JQuery<HTMLElement> = $(".center > ul.pagination a");
        if (pages.length === 0) {
            return [];
        }
        let firstPage = Utils.getElementFromJqueryArray(pages, 1);
        let lastPage = Utils.getElementFromJqueryArray(pages, pages.length - 2);
        let firstPageNumber: number = Number.parseInt(firstPage.text());
        let lastPageNumber: number = Number.parseInt(lastPage.text());
        let rangeBetween: Array<number> = range(firstPageNumber, lastPageNumber);
        let baseUrl: string = window.location.href;
        let urls: Array<string> = [];
        let currentPage: string = QueryString.p === undefined ? 1 : QueryString.p;
        for (let i: number = 0; i < rangeBetween.length; i++) {
            let num: string = String(rangeBetween[i]);
            if (num == currentPage) {
                continue;
            }
            let newUrl: string = Utils.addParameter(baseUrl, "p", num.toString());
            urls.push(newUrl);
        }
        return urls;
    }

    public static removeEpisodesFromUid(uid: string): void {
        let episode = Anime.getEpisodeFromUid(uid, true);
        super.removeEpisodeFromAnime(episode);
    }

    public static removeEpisodesFromResidence(resides: number, exclude: boolean): void {
        let eps: Array<Episode> = Anime.getEpisodesFromResidence(resides, exclude, true);
        for (let i: number = 0, len: number = eps.length; i < len; i++) {
            let currentEp: Episode = eps[i];
            this.removeEpisodeFromAnime(currentEp);
        }
    }

    public static getAmountOfEps(): number {
        return super.abstractGetEps(true).length;
    }
}

class Utils {
    private constructor() {
    }

    public static downloadViaJavaScript(url: string, data: any, callBack: (downloadFunc:Function) => void, _type: string = "POST"): void {
        let xhr: XMLHttpRequest = new XMLHttpRequest();
        xhr.open(_type, url, true);
        xhr.responseType = "blob";
        xhr.withCredentials = true;

        if (_type == "POST") {
            xhr.setRequestHeader("Content-type", "application/json");
        }
        let hasError: boolean = false;
        let mediaType: string = null;
        xhr.onreadystatechange = function () {
            let error: string = null;
            if (xhr.readyState === XMLHttpRequest.DONE) {
                if (hasError) {
                    if (xhr.response != null && xhr.response.length > 0) {
                        error = xhr.response;
                    } else {
                        error = "internal server error";
                    }
                }
                let contentDispositionHeader:string = xhr.getResponseHeader("Content-Disposition");
                let fileName:string = "untitled.txt";
                if (contentDispositionHeader != null && contentDispositionHeader.indexOf("filename") > -1) {
                    fileName = contentDispositionHeader.split("filename").pop();
                    fileName = fileName.replace("=", "");
                    fileName = fileName.trim();
                    fileName = fileName.replace(/"/g, "");
                }

                let mediaTypeHeader: string = xhr.getResponseHeader("Content-Type");
                if (mediaTypeHeader != null) {
                    mediaType = mediaTypeHeader;
                } else {
                    mediaType = "application/octet-stream";
                }

                let blob: Blob = xhr.response;

                let returnFunction = function save(blob: Blob, fileName: string, hasError: boolean, error: string) {
                    if (hasError) {
                        alert(error);
                        return;
                    }
                    saveAs(blob, fileName, true);
                }.bind(this, blob, fileName, hasError, error);
                callBack.call(this, returnFunction);
            } else if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
                if (xhr.status !== 200) {
                    xhr.responseType = "text";
                    hasError = true;
                }
            }
        };
        if (_type === "POST") {
            xhr.send(JSON.stringify(data));
        } else {
            xhr.send();
        }
    };

    public static sortSelect(selElem: HTMLSelectElement): void {
        let tmpAry: Array<any> = [];
        for (let i: number = 0, length: number = selElem.options.length; i < length; i++) {
            tmpAry[i] = [];
            tmpAry[i][0] = selElem.options[i].text;
            tmpAry[i][1] = selElem.options[i].dataset.url;
        }
        tmpAry.sort(function (a: HTMLElement, b: HTMLElement) {
            // @ts-ignore
            return a[0].toUpperCase().localeCompare(b[0].toUpperCase());
        });
        selElem.innerHTML = "";
        for (let i: number = 0, len: number = tmpAry.length; i < len; i++) {
            let op: HTMLOptionElement = new Option(tmpAry[i][0]);
            op.dataset.url = tmpAry[i][1];
            selElem.options[i] = op;
        }
    }

    public static injectCss(css: string): void {
        function _isUrl(url: string): boolean {
            let matcher: RegExp = new RegExp(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/);
            return matcher.test(url);
        }

        if (_isUrl(css)) {
            $("<link>").prop({
                "type": "text/css",
                "rel": "stylesheet"
            }).attr("href", css).appendTo("head");
        } else {
            $("<style>").prop("type", "text/css").html(css).appendTo("head");
        }
    }

    public static addParameter(url: string, parameterName: string, parameterValue: string, atStart: boolean = false): string {
        let replaceDuplicates: boolean = true;
        let urlhash: string;
        let cl;
        if (url.indexOf('#') > 0) {
            cl = url.indexOf('#');
            urlhash = url.substring(url.indexOf('#'), url.length);
        } else {
            urlhash = '';
            cl = url.length;
        }
        let sourceUrl: string = url.substring(0, cl);
        let urlParts: string[] = sourceUrl.split("?");
        let newQueryString: string = "";
        if (urlParts.length > 1) {
            let parameters: string[] = urlParts[1].split("&");
            for (let i: number = 0; (i < parameters.length); i++) {
                let parameterParts: string[] = parameters[i].split("=");
                if (!(replaceDuplicates && parameterParts[0] == parameterName)) {
                    if (newQueryString == "") {
                        newQueryString = "?";
                    } else {
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
        } else {
            if (newQueryString !== "" && newQueryString != '?')
                newQueryString += "&";
            newQueryString += parameterName + "=" + (parameterValue ? parameterValue : '');
        }
        return urlParts[0] + newQueryString + urlhash;
    }

    public static getElementFromJqueryArray(elm: JQuery<HTMLElement>, index: number): JQuery<HTMLElement> {
        return elm.filter(function (i) {
            return i === index;
        });
    };


    public static getTable(): JQuery<HTMLTableElement> {
        return $('table');
    }

    public static getQueryFromUrl(url: string): any {
        return url.split("&").reduce(function (prev: any, curr: any, i, arr) {
            let p: any = curr.split("=");
            prev[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
            return prev;
        }, {});
    }

    public static isjQueryObject(obj: Object): boolean {
        return obj instanceof jQuery || 'jquery' in Object(obj);
    }

    public static disableButton(button: JQuery<HTMLButtonElement>): void {
        button.prop('disabled', true);
    }

    public static enableButton(button: JQuery<HTMLButtonElement>): void {
        button.prop('disabled', false);
    }

    // @ts-ignore
    public static doDownloads(event: Event<HTMLElement, null>): void {
        $('#crossPage').prop('disabled', true);
        let type: string = $(event.target).data('type');
        let html: string = UI.builDownloadAlert(type);
        let urlsToDownload: Array<string> = [];
        $('#alertUser').html(html).slideDown("slow").show();
        if (type === 'downloadSelected') {
            $.each($('.checkboxes:checked').prev('a'), function () {
                let ep: Episode = Anime.getEpisodeFromAnchor(<HTMLAnchorElement>this);
                urlsToDownload.push(ep.downloadLink);
            });
        } else if (type === 'downloadSelects') {
            $.each($('#animeSelection option:selected'), function () {
                // @ts-ignore
                let url: string = this.dataset.url;
                urlsToDownload.push(url);
            });
        } else {
            let eps: Array<Episode> = Anime.getEpsForRes(parseInt(<string>$('#downloadRes').val()), false);
            for (let i = 0, len = eps.length; i < len; i++) {
                urlsToDownload.push(eps[i].downloadLink);
            }
        }
        bindAlertControls();

        function bindAlertControls(): void {
            $('#alertButtonCancel').on('click', function () {
                $('#alertUser').slideUp('slow');
                $('#crossPage').prop('disabled', false);
            });
            $('#alertButton').on('click', function () {
                doIt(urlsToDownload);
            });
        }

        function doIt(urls: Array<string>) {
            let timerOffset:number = 0;
            for (let i: number = 0; i < urls.length; i++) {
                let currentUrl: string = urls[i];
                setTimeout(()=>{
                    Utils.downloadViaJavaScript(currentUrl, undefined ,(downloadFunc) =>{
                        downloadFunc();
                    }, "GET");
                }, timerOffset);
                timerOffset += 350;
            }
            $('#alertUser').slideUp('slow');
            $('#crossPage').prop('disabled', false);
        }
    }

    public static checkBoxValid(checkbox: JQuery<HTMLInputElement>): boolean {
        return checkbox.is(':checked');
    }

    private static _minSeedsSet(): boolean {
        let seeds: string = Localstore.getMinSeedsFromStore();
        if (seeds !== null && seeds.length > 0) {
            return Number.parseInt(seeds) !== 1;
        }
        return false;
    }

    public static getCurrentPageOffset(): number {
        return parseInt((typeof QueryString.p === 'undefined') ? 1 : QueryString.p);
    }

    public static arrayCopy<T>(array: Array<T>, deep: boolean = false): Array<T> {
        return $.extend(deep, [], array);
    }

    public static cleanAvailableResolutions(): void {
        let avRes: Array<resType> = Utils.arrayCopy(Anime.availableRes, true);
        for (let i: number = 0, len: number = avRes.length; i < len; i++) {
            let currentRes: number = avRes[i].res;
            if (Anime.getAmountOfEpsFromRes(currentRes, true) === 0) {
                Anime.removeAvailableResolutions(currentRes);
            }
        }
    }

    public static sortAllControls(): void {
        Utils.sortSelect(<HTMLSelectElement>document.getElementById('animeSelection'));
        Utils.sortSelect(<HTMLSelectElement>document.getElementById('downloadRes'));
        // @ts-ignore
        $('#info').sortTable(0);
    }

    public static reBindSelectFilters(): void {
        // @ts-ignore
        $('input[name=\'filterSelect\']').offOn('change', handleSelect);

        // @ts-ignore
        $('#clearResOptions').offOn('click', handleSelect);

        // @ts-ignore
        $("#animeSelection").offOn("click", function () {
            UI.autoEnableAcceptSelect();
        });
        // @ts-ignore
        $("#selectAllFromControl").offOn("click", function (this: HTMLAnchorElement) {
            let allSelected = $("#animeSelection option:selected").length === $("#animeSelection option").length;
            if (allSelected) {
                $(this).text("Select all");
                $("#animeSelection option").prop("selected", false);
            } else {
                $(this).text("deselect all");
                $("#animeSelection option").prop("selected", true);
            }
            UI.autoEnableAcceptSelect();
        });

        function handleSelect(event: Event): void {
            let resTOFilter: string = $(event.target).data('set');
            $('#selectAnime').html(UI.buildSelect(resTOFilter));
            Utils.sortAllControls();
            let searchApplied: string = UI.getAppliedSearch();
            if (searchApplied !== '') {
                UI.applySearch(searchApplied);
            }
            Utils.reBindSelectFilters();
        }
    }

    public static getHumanReadableSize(from: unknown, decimals: number = 3): string {
        let bits: number = 0;
        if (Array.isArray(from)) {
            for (let i: number = 0; i < from.length; i++) {
                let ep: Episode = from[i];
                bits += ep.size;
            }
        } else if (typeof from === 'number') {
            bits = from;
        } else {
            bits += (<Episode>from).size;
        }

        function formatBytes(bytes: number, decimals: number): string {
            if (bytes == 0) {
                return '0 Byte';
            }
            let k: number = 1024;
            let dm: number = decimals + 1 || 3;
            let sizes: Array<string> = [
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
            let i: number = Math.floor(Math.log(bytes) / Math.log(k));
            return (bytes / Math.pow(k, i)).toPrecision(dm) + ' ' + sizes[i];
        }

        return formatBytes(bits, decimals);
    }
}

class UI {
    private constructor() {
    }

    private static epsInSelect: Array<Episode> = [];
    private static searchApplied: string = '';

    public static buildTable(): string {
        let html: string = '';
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
        let allRes: Array<resType> = Anime.availableRes;
        for (let i: number = 0; i < allRes.length; i++) {
            let currRes: resType = allRes[i];
            let localRes: number = currRes.res;
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

    public static stateChangeAcceptSelect(state: boolean): void {
        // @ts-ignore
        $("#acceptSelect").enableButton(state);
    }

    public static autoEnableAcceptSelect(): void {
        let selection: JQuery<HTMLElement> = $("#animeSelection option:selected");
        UI.stateChangeAcceptSelect(selection.length > 0);
    }

    public static buildDropdownSelections(): string {
        let html: string = '';
        html += '<select class="form-control" style="margin-right:5px;display: inline;width: auto;" id="downloadRes">';
        let allRes: Array<resType> = Anime.availableRes;
        for (let i: number = 0; i < allRes.length; i++) {
            let currRes: resType = allRes[i];
            let localRes: number = currRes.res;
            html += '<option value=' + localRes + '>' + (localRes === -1 ? 'Others' : localRes + 'p') + '</option>';
        }
        html += '</select>';
        return html;
    }

    public static builDownloadAlert(type: string): string {
        let amountOfAnime: number = 0;
        let selectedRes: number = Number.parseInt((<string>$('#downloadRes').val()));
        let res: string = null;
        let totalSize: string = null;
        if (type === 'downloadSelected') {
            amountOfAnime = $('.checkboxes:checked').length;
            res = 'custom';
        } else if (type === 'downloadSelects') {
            amountOfAnime = $('#animeSelection option:selected').length;
            totalSize = Utils.getHumanReadableSize((function () {
                let localSize: number = 0;
                $('#animeSelection option:selected').each(function () {
                    let url: string = this.dataset.url;
                    localSize += Anime.getEpisodeFromAnchor(url).size;
                });
                return localSize;
            }()));
            res = 'custom';
        } else {
            amountOfAnime = Anime.getAmountOfEpsFromRes(selectedRes, false);
            res = selectedRes === -1 ? 'Others' : selectedRes + 'p';
            totalSize = Anime.getTotalSizeForRes(parseInt(res), false);
        }
        let seedLimit: string = Localstore.getMinSeedsFromStore();
        let html: string = '';
        html += '<div class=\'alert alert-success\'>';
        html += '<div><strong>Download: ' + res + '</strong></div> <br />';
        html += '<div><strong>Seed Limit: ' + seedLimit + '</strong></div>';
        if (totalSize !== null) {
            html += '<br /><div><strong>Total size: ' + totalSize + ' (aprox)</strong></div>';
        }
        html += '<p>You are about to download ' + amountOfAnime + ' ep(s)</p>';
        html += '<p>This will cause ' + amountOfAnime + ' download pop-up(s) Are you sure you want to continue?</p>';
        html += '<p>If there are a lot of eps, your browser might stop responding for a while. This is normal. If you are on Google Chrome, it will ask you to allow multiple-downloads</p>';
        html += '<button type="button" class="btn btn-success" id=\'alertButton\'>Okay</button>';
        html += '<button type="button" class="btn btn-warning" id=\'alertButtonCancel\'>Cancel</button>';
        html += '</div>';
        return html;
    }

    public static showAjaxErrorAlert(ajaxInfo: ajaxInfo): string {
        let parseError: JQuery<HTMLElement> = $('#parseErrors');
        if (!parseError.is(':hidden')) {
            return null;
        }
        parseError.html('');
        let html: string = '';
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

    public static buildSelect(resTOFilter: string | number = "none"): string {
        let html: string = '';
        UI.epsInSelect = [];
        let minSeeds: number = Number.parseInt(Localstore.getMinSeedsFromStore());
        html += '<div id=\'selectWrapper\'>';
        html += '<div id=\'selectContainer\'>';
        html += '<p>Or you can select episodes here:</p>';
        html += '<p>Seed limit: ' + (minSeeds === -1 ? 'None' : minSeeds) + '</p>';
        html += '<select class="form-control" id=\'animeSelection\' multiple size=\'20\'>';
        let allRes: Array<resType> = Anime.availableRes;
        for (let i: number = 0; i < allRes.length; i++) {
            let currRes: resType = allRes[i];
            let localRes: number = currRes.res;
            let eps: Array<Episode> = Anime.getEpsForRes(localRes, false);
            for (let j: number = 0, len: number = eps.length; j < len; j++) {
                let currentEp: Episode = eps[j];
                if (resTOFilter == 'none' || currentEp.res == resTOFilter) {
                    html += '<option data-url=\'' + currentEp.downloadLink + '\'>';
                    html += currentEp.title + ' - Seeders: ' + currentEp.seeds;
                    UI.epsInSelect.push(currentEp);
                    html += '</option>';
                } else {
                    break;
                }
            }
        }
        html += '</select>';
        html += '<span>Filter select control: </span>';
        let checked: boolean = false;
        for (let i: number = 0; i < allRes.length; i++) {
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

    public static applySearch(textToFilter: string): void {
        let opts: Array<Episode> = UI.epsInSelect;
        let rxp: RegExp = new RegExp(textToFilter);
        let optlist: JQuery<HTMLElement> = $('#animeSelection').empty();
        for (let i: number = 0, len: number = opts.length; i < len; i++) {
            let ep: Episode = opts[i];
            if (rxp.test(ep.title)) {
                optlist.append('<option data-url=\'' + ep.downloadLink + '\'>' + ep.title + ' - Seeders: ' + ep.seeds + '</option>');
            }
        }
        UI.searchApplied = textToFilter;
        Utils.sortSelect(<HTMLSelectElement>document.getElementById("animeSelection"));
        UI.autoEnableAcceptSelect();
    }

    public static getAppliedSearch(): string {
        return UI.searchApplied;
    }

    public static getEpsInSelect(): Array<Episode> {
        return UI.epsInSelect;
    }
}

class DataParser {
    private table: JQuery<HTMLElement> = null;

    public constructor(table: JQuery<HTMLElement>) {
        this.table = table;
    }

    public parseTable(currentPage: number): Array<Episode> {
        let trRow: JQuery<HTMLElement> = this.table.find('img[src*=\'/static/img/icons/nyaa/1_2.png\']').closest('tr');
        let eps: Array<Episode> = [];
        $.each($(trRow), function () {
            let resInfo: resType = parseRes(this);
            if (resInfo === null) {
                Anime.addAvailableResolutions(-1, null);
            } else {
                Anime.addAvailableResolutions(resInfo.res, resInfo.fullRes);
            }
            let info: epInfo = getEpisodeInfo(this);
            eps.push(new Episode(typeof resInfo.res === ('undefined') ? -1 : resInfo.res, info.currentDownloadLink, info.seeds, info.leech, info.uid, currentPage, info.title, info.size));
        });
        return eps;

        function parseRes(eventContent: HTMLElement): resType {
            let supportedRes: Array<resType> = Anime.supportedRes;
            for (let i: number = 0; i < supportedRes.length; i++) {
                let currRes: number = supportedRes[i].res;
                let currFullRes: string = supportedRes[i].fullRes;
                if ($(eventContent).children('td:nth-child(2)').text().indexOf(currRes + 'p') > -1 || $(eventContent).children('td:nth-child(2)').text().indexOf(currFullRes) > -1) {
                    return supportedRes[i];
                }
            }
        }

        function getEpisodeInfo(eventContent: HTMLElement): epInfo {
            let _eventContent = $(eventContent);
            let currentDownloadLink = (<HTMLAnchorElement> Anime.getTdFromTable(_eventContent, 3).find("a")[0]).href;

            function getTextContent(idx: number): number {
                return (isNaN(parseInt(Anime.getTdFromTable(_eventContent, idx).text()))) ? 0 : parseInt(Anime.getTdFromTable(_eventContent, idx).text());
            }

            function convertToString(ev: JQuery<HTMLElement>): number {
                let sizeValue: string = Anime.getTdFromTable(ev, 4).text();
                let sizeText: string = $.trim(sizeValue.split(' ').pop());
                let intValue: number = parseInt(sizeValue);
                switch (sizeText) {
                    case "MiB":
                        return ((Math.pow(2, 20))) * intValue;
                    case "GiB":
                        return intValue * 1073741824;
                    default:
                        return 0;
                }
            }

            let seeds: number = getTextContent(6);
            let leech: number = getTextContent(7);
            let title: string = Anime.getTdFromTable(_eventContent, 2).text().trim().substring(1).trim();
            let uid: string = Anime.getUidFromJqueryObject(_eventContent);
            let size: number = convertToString(_eventContent);
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
    private constructor() {
    }

    public static getMinSeedsFromStore(): string {
        let lo: string = localStorage.getItem('minSeeds');
        return lo === null ? "-1" : lo;
    }

    public static setMinSeedsFromStore(seeds: number): void {
        localStorage.setItem('minSeeds', seeds.toString());
    }

    public static removeMinSeedsFromStore(): void {
        localStorage.removeItem('minSeeds');
    }
}

let QueryString: jsonType = (() => {
    if (typeof window == "undefined") {
        return {};
    }
    let query_string: jsonType = {};
    let query: string = window.location.search.substring(1);
    let vars: Array<string> = query.split("&");
    for (let i: number = 0; i < vars.length; i++) {
        let pair: Array<string> = vars[i].split("=");
        if (typeof query_string[pair[0]] === "undefined") {
            query_string[pair[0]] = pair[1];
        } else if (typeof query_string[pair[0]] === "string") {
            query_string[pair[0]] = [query_string[pair[0]], pair[1]];
        } else {
            query_string[pair[0]].push(pair[1]);
        }
    }
    return query_string;
})();

// Download fix for firefox
HTMLElement.prototype.click = function () {
    let evt: MouseEvent = this.ownerDocument.createEvent('MouseEvents');
    evt.initMouseEvent('click', true, true, this.ownerDocument.defaultView, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
    this.dispatchEvent(evt);
};

class Main {
    private constructor() {
    }

    public static main(): void {
        Main.setAnimeObj();
        Main.buildUi();
        Main.bindListeners();
    }

    private static setAnimeObj(): void {
        if (QueryString.q !== '') {
            Anime.currentAnime = decodeURIComponent(QueryString.q).split('+').join(' ');
        } else {
            Anime.currentAnime = "unknown";
        }
        let paths: Array<string> = window.location.pathname.split("/");
        Anime.currentSubber = paths[2];
        let instance: DataParser = new DataParser(Utils.getTable());
        let eps: Array<Episode> = instance.parseTable(Utils.getCurrentPageOffset());
        Anime.addAllEps(eps);
    }

    private static buildUi(): void {
        makeStyles();
        buildPanel();
        afterBuild();

        function makeStyles(): void {
            let styles: string = '';
            styles += '.collapsem{cursor: pointer; position: absolute; right: 4px; top: 2px;}';
            styles += '.panel-success > .panel-heading {position: relative;}';
            styles += '.avgSeeds{floar:left; padding-right:10px; color:#3c763d;}';
            styles += '.checkboxes{left:1px; margin:0; padding:0; position: relative; top: 1px; z-index: 1;}';
            styles += '#topbar{z-index: 2 !important;}';
            styles += 'label[for=\'MinSeeds\']{ display: block; margin-top: 10px;}';
            styles += '.filterLabel{margin-right: 10px;}';
            styles += '.alert {position:relative;}';
            styles += '#alertUser, #parseErrors{margin-top: 15px;}';
            styles += '#alertButton{position:absolute; bottom:5px; right:5px;}';
            styles += '#alertButtonCancel{position:absolute; bottom:5px; right: 66px;}';
            styles += '#errorClose{position:absolute; bottom:5px; right: 11px;}';
            styles += '#animeSelection{width: 100%;}';
            styles += '#clearResOptions{margin-left: 10px; margin-right: 10px ;cursor: pointer;}';
            styles += '#selectAllFromControl{cursor: pointer;}';
            styles += '#downloadCustomButton{float:right;}';
            styles += '#findEp{float: right; position: relative; bottom: 20px; width: 180px;}'
            Utils.injectCss('https://maxcdn.bootstrapcdn.com/font-awesome/4.4.0/css/font-awesome.min.css');
            Utils.injectCss(styles);
        }

        function buildPanel(): void {
            let html: string = '';
            html += '<div class="panel panel-success">';
            html += '<div class="panel-heading">';
            html += '<h3 id="panel-title" class="panel-title"></h3>';
            html += '<i class="fa fa-minus collapsem" id="collapseToggle" title="Hide"></i>';
            html += '</div>';
            html += '<div class="panel-body" id="pannelContent"></div>';
            html += '</div>';
            $('.container > .row > h3').after(html);
            buildPanelContent();

            function buildPanelContent(): void {
                let html: string = '';
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
                html += '<input class="form-control" type=\'text\' id=\'findEp\' placeholder=\'Search Select (or use regex)\' />';
                html += '<button class="btn btn-default" disabled id=\'acceptSelect\' data-type=\'downloadSelects\'>Select for download</button>';
                html += '<div id=\'parseErrors\' class =\'hide\'></div>';
                $('#pannelContent').html(html);
            }
        }

        function afterBuild(): void {
            makeCheckBoxes();
            sortLists();

            function makeCheckBoxes(): void {
                $('.tlistdownload > a').after('<input class=\'checkboxes\' type=\'checkbox\'/>');
            }

            function sortLists(): void {
                Utils.sortAllControls();
            }
        }
    }

    private static bindListeners(): void {
        Utils.reBindSelectFilters();
        $('#downloadAll').on('click', function (e) {
            Utils.doDownloads(e);
        });
        $('.checkboxes').on('click', function (e) {
            if (Utils.checkBoxValid($('.checkboxes'))) {
                Utils.enableButton($('#downloadCustomButton'));
            } else {
                Utils.disableButton($('#downloadCustomButton'));
            }
        });


        $('#crossPage').on('click', function (e) {
            preformParsing(Anime.getPageUrls());

            function preformParsing(urls: Array<string>): void {
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
                    let AjaxInfo: ajaxInfo = {
                        error: {
                            pageAtError: null
                        },
                        currentPage: null
                    };
                    let ajaxPromiseMap: Map<string, Deferred<any, any, any>> = new Map();
                    let arrayd: Array<Deferred<any, any, any>> = [];
                    for (let i: number = 0; i < urls.length; i++) {
                        let d: Deferred<any, any, any> = $.Deferred();
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
                    let timeOut: number = 0;
                    for (let [cur, deferr] of ajaxPromiseMap) {
                        let currentPage: number = 0;
                        let queryObjet: any = Utils.getQueryFromUrl(cur);
                        if (queryObjet.p) {
                            currentPage = queryObjet.p;
                        } else {
                            currentPage = 1;
                        }
                        setTimeout(() => {
                            let ajax: jqXHR<any> = $.ajax(cur);
                            ajax.done(function (data: string) {
                                AjaxInfo.currentPage = currentPage;
                                let table: JQuery<HTMLElement> = $(data).find(("table"));
                                let parser: DataParser = new DataParser(table);
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
                } else {
                    // noinspection JSMismatchedCollectionQueryUpdate
                    let tableInfoElm: JQuery<HTMLElement> = $('#tableInfo');
                    tableInfoElm.html('<p>Please wait while we re-calculate the Episodes</p>');
                    let currentPage: number = Utils.getCurrentPageOffset();
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
            if (parseInt(<string>$('#MinSeeds').val()) < 0) {
                alert('number cannot be negative');
                return;
            }
            let value: number;
            value = <string>$('#MinSeeds').val() === '' ? parseInt("-1") : parseInt(<string>$('#MinSeeds').val());
            Localstore.setMinSeedsFromStore(value);
            if (value === -1) {
                alert('Minimum seeds have been cleared');
            } else {
                alert('Minimum seeds now set to: ' + value);
            }
            $('#selectAnime').html(UI.buildSelect());
            Utils.sortAllControls();
            Utils.reBindSelectFilters();
        });

        $('#collapseToggle').on('click', function () {
            $('#pannelContent').stop(true, true).slideToggle('slow', function () {
                let elm: JQuery<HTMLElement> = $('#collapseToggle');
                if ($(this).is(':hidden')) {
                    elm.removeClass('fa-minus').addClass('fa-plus');
                    elm.attr('title', 'Show');
                } else {
                    elm.addClass('fa-minus').removeClass('fa-plus');
                    elm.attr('title', 'Hide');
                }
            });
        });
        $('#acceptSelect').on('click', function (e) {
            Utils.doDownloads(e);
        });
        $('#findEp').on('keyup', function () {
            UI.applySearch(<string>$(this).val());
        });
    }
}

Main.main();