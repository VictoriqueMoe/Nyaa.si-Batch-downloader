abstract class AbstractEps {
    private static eps: Array<Episode> = []; // this is the main array that holds all the episodes per anime

    protected static abstractGetEps(skipSeedLimit: boolean): Array<Episode> {
        let minSeeds: number = Number.parseInt(Localstore.getMinSeedsFromStore());
        if (minSeeds > -1 && skipSeedLimit === false) {
            let arrayOfEps: Array<Episode> = [];
            for (let i: number = 0, len: number = AbstractEps.eps.length; i < len; i++) {
                let currentEp: Episode = AbstractEps.eps[i];
                if (currentEp.seeds < minSeeds) {
                    continue;
                }
                arrayOfEps.push(currentEp);
            }
            return arrayOfEps;
        } else {
            return AbstractEps.eps;
        }
    }

    protected static addEp(ep: Episode): void {
        if (Anime.isValidRes(ep.res) === false) {
            throw new TypeError('The Episode supplied does not have a valid resolution');
        }
        for (let i: number = 0, len: number = AbstractEps.eps.length; i < len; i++) {
            let epi: Episode = AbstractEps.eps[i];
            if (epi.equals(ep)) {
                console.warn('The episode supplied already exsists, this episode has been ignored');
                return;
            }
        }
        AbstractEps.eps.push(ep);
    }

    protected static removeEpisodeFromAnime(obj: Episode): void {
        let arr: Array<Episode> = AbstractEps.eps;
        let i: number = arr.length;
        while (i--) {
            if (arr[i] === obj) {
                arr.splice(i, 1);
            }
        }
    }
}
