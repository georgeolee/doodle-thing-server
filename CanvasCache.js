import { getCanvasTimeStamp } from "./index.js";

export class CanvasCache{

    cache;
    shelfLifeMillis;

    constructor(){
        this.cache = {}
        this.shelfLifeMillis = 0;
    }

    // format key
    #key(width, height){
        return `${width}x${height}`
    }

    /**
     * (over)write a cache entry
     * @param {{buffer:Buffer,width:number,height:number,timestamp:string}} fields 
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
            
            this.cache[this.#key(width, height)] = fields;

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
        const entry = this.cache[this.#key(width, height)]

        if(!entry) return null;

        const isStale = Number(getCanvasTimeStamp()) - Number(entry.timestamp) > this.shelfLifeMillis;

        return {...entry, isStale}
    }

}