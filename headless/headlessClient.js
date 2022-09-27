import { Doodler } from "../../doodle-thing-client/src/components/Canvas/Doodler.mjs";

const doodlers = []
const canvases = []

//map canvas / doodler pairs by dimensions
const ghosts = {/*
    width: {
        height: {},
        height: {},        
    },
    width: {
        height: {},
        height: {},        
    }
*/}

function addCanvas(width, height){

    if(ghosts[width]?.[height]){
        console.log(`already following a ${width} x ${height} canvas`)
        return
    }

    //create canvas element
    const cnv = document.createElement('canvas')
    const doodler = new Doodler(cnv)

    cnv.style.display = 'none'
    cnv.width = width
    cnv.height = height

    canvases.push(cnv)
    doodlers.push(doodler)

    ghosts[width] ??= {}
    ghosts[width][height]

}

