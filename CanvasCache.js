// import { getCanvasTimeStamp } from "./index.js";

import { timestamp as latestCanvasTimestamp } from "./canvas.js";

export class CanvasCache{

    #cache;
    #shelfLifeMillis;

    #trackedSizes;

    constructor(){
        this.#cache = {}
        this.#shelfLifeMillis = 0;
        this.#trackedSizes = []
    }

    // format key
    #key(width, height){
        return `${width}x${height}`
    }

    /**
     * (over)write a cache entry
     * @param {{buffer:Buffer,width:string,height:string,timestamp:string}} fields 
     */
    setEntry(fields){
        const {buffer, width, height, timestamp} = fields;

        try{ 
            if(
                (buffer instanceof Buffer) === false|| 
                typeof width !== 'string' || 
                typeof height !== 'string' || 
                typeof timestamp !== 'string'
            ) throw new TypeError('CanvasCache.setEntry(): missing or invalid fields');

            const key = this.#key(width, height);

            if(!this.#cache[key]){
                this.#trackedSizes.push([width, height])
            }

            this.#cache[key] = fields;
            
        }catch(e){
            console.error(`${e.name}: ${e.message}`)
        } 
    }

    /**
     * get cached canvas & timestamp, or null if no entry for given dimensions
     * @param {string} width 
     * @param {string} height 
     * @returns {{buffer:Buffer,width:string,height:string,timestamp:string,isStale:boolean}|null}
     */
    getEntry(width, height){
        const entry = this.#cache[this.#key(width, height)]

        if(!entry) return null;

        const shelfLife = this.#shelfLifeMillis;

        return {
            ...entry, 
            get isStale(){
                return latestCanvasTimestamp.number - Number(entry.timestamp) > shelfLife;
            }}
    }

    getEntries(){
        return this.#trackedSizes.map(size => this.getEntry(...size));
    }

}