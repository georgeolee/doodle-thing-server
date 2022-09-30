/*non-module version for including w/ headless pug template*/
class Doodler{

    cnvRef    
    strokeStyle
    lineWidth

    constructor(cnvRef){
        this.cnvRef = cnvRef  
    }

    getCanvas(){
        const cnv = this.cnvRef['getContext'] ? this.cnvRef : this.cnvRef.current        
        return [cnv, cnv.getContext('2d')]
    }

    getDataURL(){
        const [cnv,] = this.getCanvas()
        return cnv.toDataURL()
    }

    line(x0,y0,x1,y1){
        const [, ctx] = this.getCanvas()
           
        ctx.beginPath()
        ctx.moveTo(x0,y0)
        ctx.moveTo(x1,y1)
        ctx.stroke()
    }

    consumePointerStates(...pointerStates){
        const [cnv, ctx] = this.getCanvas()
        // ctx.imageSmoothingEnabled = false
        ctx.beginPath()

        //right now draws newest first
        //not a prob if only one pstate, but otherwise will reverse overlap order?
        //change
        for(let i = pointerStates.length - 1; i >= 0; i--){
            const p = pointerStates[i]
            if(!p.isPressed) continue
            
                        
            if(p.drawingSettings.color !== 'erase'){
                //color over
                ctx.globalCompositeOperation = 'source-over'
                ctx.strokeStyle = p.drawingSettings.color
                ctx.fillStyle = p.drawingSettings.color
            }else{
                //remove source color
                ctx.globalCompositeOperation = 'destination-out'
            }
            
            ctx.lineWidth = p.drawingSettings.lineWidth * devicePixelRatio

            
            if(p.last?.isPressed){
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
}