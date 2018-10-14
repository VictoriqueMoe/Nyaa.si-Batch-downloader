class Utils {
    private constructor() {
    }

    public static downloadViaJavaScript(url: string, data: any, callBack: (blob: Blob, fileName: string, hasError: boolean, error: string, saveFunc: Function) => void, _type: string = "POST", fileName: string = null): void {
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
                let contentDispositionHeader: string = xhr.getResponseHeader("Content-Disposition");
                if (fileName == null && contentDispositionHeader != null && contentDispositionHeader.indexOf("filename") > -1) {
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

                /*let returnFunction = function save() {
                    if (hasError) {
                        let error:string = "Unable to download file: '" +fileName+ "' Please download this file manually";
                        alert(error);
                        return;
                    }
                }.bind(this, );*/
                let saveAsFunc: Function = saveAs.bind(this, blob, fileName, true);
                callBack.call(this, blob, fileName, hasError, error, saveAsFunc);
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
                doIt(urlsToDownload, false);
            });

            $("#downloadZip").on("click", function () {
                doIt(urlsToDownload, true);
            });
        }

        function doIt(urls: Array<string>, asZip: boolean) {
            let ajaxPromiseMap: Map<string, Deferred<any, any, any>> = new Map();
            let arrayd: Array<Deferred<any, any, any>> = [];
            for (let i: number = 0; i < urls.length; i++) {
                let d: Deferred<any, any, any> = $.Deferred();
                ajaxPromiseMap.set(urls[i], d);
                arrayd.push(d);
            }
            $.when.apply($, arrayd).done(function () {
                if (!asZip) {
                    return;
                }
                // @ts-ignore
                let zip: JSZip = new JSZip();
                let errors:Array<String> = [];
                if(arrayd.length === 1){
                    let blob:Blob = arguments[0];
                    let fileName: string = arguments[1];
                    let error:string = arguments[2];
                    if(error !== null){
                        errors.push(fileName);
                    }else{
                        zip.file(fileName, blob);
                    }
                }else{
                    for (let i: number = 0; i < arguments.length; i++) {
                        let arg: Array<any> = arguments[i];
                        let blob: Blob = arg[0];
                        let fileName: string = arg[1];
                        let error:string = arg[2];
                        if(error !== null){
                            errors.push(fileName);
                        }else{
                            zip.file(fileName, blob);
                        }
                    }
                }

                if(errors.length > 0){
                    let errorMessage = "Unable to download the following files: \n" + errors.join("\n") + "\n Please download these files manually";
                    alert(errorMessage);
                }
                $("#progressStatus").text("Generating zip file...");
                zip.generateAsync({type: "blob"}).then(function (blob: Blob) {
                    saveAs(blob, Anime.currentAnime + ".zip");
                    $("#loadingContainer").hide();
                    $("#progressStatus").text(null);
                    $("#progressBarForZip").width(0);
                    $('#alertUser').slideUp('slow');
                }, function (err: string) {
                    alert(err);
                });
            });
            let timerOffset: number = 0;
            if(asZip){
                $("#loadingContainer").show()
            }
            let count:number = 0;
            for (let [currentUrl, deferr] of ajaxPromiseMap) {
                let ep: Episode = Anime.getEpisodeFromUrl(currentUrl);
                let fileName: string = ep.title.replace(/ /g, "_") + ".torrent";
                setTimeout(() => {
                    count++;
                    Utils.downloadViaJavaScript(currentUrl, undefined, (blob: Blob, fileName: string, hasError: boolean, error: string, saveFunc: Function) => {
                        if (!asZip) {
                            saveFunc();
                        }else{
                            let percent:number = Math.floor(100 * count / ajaxPromiseMap.size);
                            let doneAsString:string = percent + "%";
                            $("#progressStatus").text("Downloading torrents: " + doneAsString);
                            $("#progressBarForZip").width(doneAsString);
                        }
                        if(hasError){
                            deferr.resolve(blob, fileName, error);
                        }else{
                            deferr.resolve(blob, fileName, null);
                        }
                    }, "GET", fileName);
                }, timerOffset);
                timerOffset += 450;
            }
            if(!asZip){
                $('#alertUser').slideUp('slow');
            }
            $('#crossPage').prop('disabled', false);
        }
    }

    public static checkBoxValid(checkbox: JQuery<HTMLInputElement>): boolean {
        return checkbox.is(':checked');
    }
    //TODO: check this
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
