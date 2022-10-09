import { Canvas } from "./models/canvas.js";
import mongoose from "mongoose";

export class CanvasDBHandler{
   
    async removeAll(){
        await Canvas.deleteMany({})

        return
    }

    async updateDBCanvas(fields){

        const {width, height} = fields;
        
        try{
    
            const canvas = new Canvas({...fields});
    
            await canvas.save();
            console.log('saved canvas to db');
    

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
            }
            return results;
            
        }catch(e){
            console.log(e)
            return null
        }        
    }
}