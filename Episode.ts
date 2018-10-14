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
