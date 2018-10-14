type epInfo = { "currentDownloadLink": string, 'seeds': number, 'leech': number, 'title': string, "uid": string, "size": number };
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
