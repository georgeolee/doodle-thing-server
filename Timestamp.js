export class Timestamp{
    #ts;

    constructor(init = true){
        this.#ts = null;
        if(init) this.set(Date.now());
    }


    get string(){
        if(this.#ts === null) return null;
        return String(this.#ts);
    }

    get number(){
        if(this.#ts === null) return null;
        return Number(this.#ts);
    }

    /**
     * updates timestamp value; defaults to Date.now()
     * @param {string|number} val
     */
    set(val = Date.now()){
        const timestamp = String(val);
        if(!timestamp.match(/^\d+$/)) throw new TypeError('Timestamp.get(): arg not an integer number or string');
        this.#ts = timestamp;
    }

}