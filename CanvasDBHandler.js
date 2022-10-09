import { Canvas } from "./models/canvas.js";
// import mongoose from "mongoose";

export class CanvasDBHandler{
   
    //track current timestamp for each canvas size
    #timestamps;


    constructor(){
        this.#timestamps = {};
    }

    #key(width, height){
        return `${width}x${height}`;
    }

    #stamp(width, height, timestamp){
        const key = this.#key(width, height);
        this.#timestamps[key] = timestamp;
    }

    // async removeDups(){
    //     Canvas.aggregate([
    //         {$group: {'_id': '$width', 'count': {'$sum':1}}},
    //         {$match: {'count': {$gt:1}}},
    //         // {$project: {'height':1, 'timestamp':1, '_id':1}},
    //         {$group: {'_id':null, duplicateWidth: {$push:{width: '$width', height: '$height', id: '$_id', timestamp: '$timestamp'}}}},
    //     ])
    // }

    async removeAll(){
        await Canvas.deleteMany({})
        this.#timestamps = {};
        return
    }

    /**
     * push a new canvas to the database, then remove any older entries for the same size
     * @param {{width:string,height:string,timestamp:string,buffer:Buffer}} fields 
     */
    async updateDBCanvas(fields){

        const {width, height, timestamp} = fields;
        
        try{
    
            const canvas = new Canvas({...fields});
    
            await canvas.save();            
            console.log('saved canvas to db');
    
            this.#stamp(width, height, timestamp);

            const newSaveID = canvas.id;
    
            // delete old backups for the same resolution
            Canvas.deleteMany({width, height, _id:{$ne: newSaveID}}).exec()
            
    
        }catch(e){
            console.log(e)
        }
    }


    async retrieveDBCanvases(){        

        try{
            const results = await Canvas.find({});
            for(const c of results){
                console.log(`db canvas -> width: ${c.width}\theight: ${c.height}\ttimestamp: ${c.timestamp}\tbuffer: ${c.buffer?.length} bytes`)

                this.#stamp(c.width, c.height, c.timestamp);
            }
            return results;
            
        }catch(e){
            console.log(e)
            return null
        }        
    }


    getTimestampOf(width, height){
        return this.#timestamps[this.#key(width, height)];
    }
}