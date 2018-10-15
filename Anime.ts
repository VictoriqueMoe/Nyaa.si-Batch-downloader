///<reference path="AbstractEps.ts"/>

type resType = { res: number, fullRes: string };
class Anime extends AbstractEps {
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

    public static getEpisodeFromUrl(url:string):Episode {
        let eps:Array<Episode> = super.abstractGetEps(true);
        for (let i:number = 0, len:number = eps.length; i < len; i++)  {
            let ep:Episode = eps[i];
            if(ep.downloadLink === url){
                return ep;
            }
        }
        return null;
    }
}
