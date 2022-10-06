/*non-module version for including w/ headless pug template*/



/**
     * 
     * @param  {...{
 *  xNorm:number,
 *  yNorm:number,
 *  isPressed:boolean,
 *  last: {
 *      xNorm:number,
 *      yNorm:number,
 *      isPressed:boolean,
 * },
 *  drawingSettings:{
 *      color: string,
 *      lineWidth: number,
 *      eraser: boolean,
 *  }      
 * } drawingData 
 */
class Doodler{

    cnvRef;    
    pixelRatio;

    constructor(cnvRef, pixelRatio = devicePixelRatio){
        this.cnvRef = cnvRef  

        this.pixelRatio = pixelRatio;
    }

    getCanvasContext(){
        const cnv = this.cnvRef['getContext'] ? this.cnvRef : this.cnvRef.current        
        return [cnv, cnv.getContext('2d')]
    }

    consumeDrawingData(...drawingData){
        const [cnv, ctx] = this.getCanvasContext()
        // ctx.imageSmoothingEnabled = false
        ctx.beginPath()

        //right now draws newest first
        //not a prob if only one pstate, but otherwise will reverse overlap order?
        //change
        for(let i = drawingData.length - 1; i >= 0; i--){
            const p = drawingData[i]
            if(!p.isPressed) continue
            
                        
            if(!p.drawingSettings.eraser){
                //color over
                ctx.globalCompositeOperation = 'source-over'
                ctx.strokeStyle = p.drawingSettings.color
                ctx.fillStyle = p.drawingSettings.color
            }else{
                //remove source color
                ctx.globalCompositeOperation = 'destination-out'
            }
            
            ctx.lineWidth = p.drawingSettings.lineWidth * this.getPixelRatio()

            
            if(p.last?.isPressed){
                ctx.lineCap = 'round'
                ctx.moveTo(...this.scaleXY(cnv, p.xNorm, p.yNorm))
                ctx.lineTo(...this.scaleXY(cnv, p.last.xNorm ?? p.xNorm, p.last.yNorm ?? p.yNorm))
                ctx.stroke()
            }else{
                ctx.arc(...this.scaleXY(cnv, p.xNorm, p.yNorm), ctx.lineWidth * 0.5, 0, Math.PI * 2)                
                ctx.fill()
            }
        }

    }

    scaleXY(cnv, normalizedX, normalizedY){    
        return [normalizedX * cnv.width, normalizedY * cnv.height]
    }

    getPixelRatio(){
        return this.pixelRatio ?? devicePixelRatio;
    }
}