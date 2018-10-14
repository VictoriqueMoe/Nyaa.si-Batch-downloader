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
        if (seedLimit === "-1") {
            seedLimit = "none";
        }
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

    public static showAjaxErrorAlert(ajaxInfo: ajaxInfo): string {
        let parseError: JQuery<HTMLElement> = $('#parseErrors');
        if (!parseError.is(':hidden')) {
            return null;
        }
        parseError.html('');
        let html: string = '';
        html += '<div class=\'alert alert-danger\'>';
        html += '<p>There was an error in getting the information from page: \'' + ajaxInfo.error.pageAtError + '\'</p>';
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
