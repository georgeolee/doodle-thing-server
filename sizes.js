// take a comma-separated string CANVAS_SIZES
// in the form "w,h,w,h,w,h ..."" or "w,h  w,h  w,h ...""

/** map of width : [ ...height] pairs */
export const sizeMap = new Map()


export function initSizeMap(){
    try{
        for(const size of parseCSV(process.env.CANVAS_SIZES)){
            const [w, h] = size
            if(!sizeMap.has(w)){
                sizeMap.set(w, [h])
            }
            else if(!sizeMap.get(w).includes(h)){
                sizeMap.get(w).push(h);
            }
        }
        console.log(sizeMap)
    }catch(e){
        console.log('initSizeMap(): error initializing from csv', e)
    }    
}


function parseCSV(str){
    const pattern = /\d+,\d+/g
    return str.match(pattern).map(width_comma_height => width_comma_height.split(','))
}