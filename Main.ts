"use strict";
import Deferred = JQuery.Deferred;
import jqXHR = JQuery.jqXHR;
//TODO: refactor this into interfaces
type ajaxInfo = { error: { pageAtError: number }, currentPage: number };
type jsonType = { [key: string]: any }

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
                html += '<input class="form-control" type=\'text\' id=\'findEp\' placeholder=\'Search Select (or use regex) \' />';
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
                        timeOut += 350;
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