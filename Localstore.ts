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