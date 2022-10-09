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

const baseWidth = 300, baseHeight = 300;
const pixelRatios = [1, 2, 3]

function addCanvas(width, height){

    if(ghosts[width]?.[height]){
        console.log(`already following a ${width} x ${height} canvas`)
        return
    }

    //create canvas element
    const canvas = document.createElement('canvas')
    
    const pixelRatio = Number(width) / baseWidth;

    const doodler = new Doodler(canvas, pixelRatio)

    canvas.style.display = 'none'
    canvas.width = Number(width)
    canvas.height = Number(height)
    canvas.getContext('2d')
    canvases.push(canvas)
    doodlers.push(doodler)

    ghosts[width] ??= {}    //add map for width if it doesn't exist yet
    ghosts[width][height] = {
        doodler,
        canvas
    }

}

//////////////////////////////


let socket;

function connect(){
    console.log('connect')

    socket = io(`http://localhost:${PORT}`, {transports: ['websocket', 'polling']})
    

    socket.on('confirmation', () => {
        console.log('connected to server!')
        socket.emit('ghost', 'BOOOOOOOOOOO')
        console.log(`socket id: ${socket.id}`)        
    })

    // socket.on('pong', () => console.log('YAY!'))

    //process drawing data coming in from other sockets
    socket.on('drawingData', pdata => {        
        const data = JSON.parse(pdata)

        for(const d of doodlers){
            d.consumeDrawingData(data)
        }       
        
        //update timestamp
        socket.emit('timestamp', Date.now().toString())

    })


    socket.on('blob', (dimensions = {}, ack) => {
        try{
            const start = Date.now()

            console.log(`headless client: blob req received`)

            const {width = baseWidth, height = baseHeight} = dimensions
            const cnv = (ghosts[width]?.[height]?.canvas) ?? ghosts[baseWidth][baseHeight].canvas
            cnv.toBlob(blob => {
                console.log(`headless client: generated blob in ${Date.now() - start}ms; blob size: ${blob.size}`)
                //seems like socket.io sends blob just fine w/o converting to arrayBuffer
                
                console.log(`headless client: invoking ack callback with blob...`)
                ack(null, blob)    
            })

        }catch(e){
            console.log(`headless client: error ${Date.now() - start}ms after receiving blob request`)
            console.log(`headless client: invoking ack callback with error...`)
            ack(e, null)
        }                
    })

    
    socket.on('load canvas', async (width, height, buffer, ack) => {
        
        try{
            if(!ghosts[width]?.[height]) addCanvas(width, height);

            const ctx = ghosts[width][height].canvas.getContext('2d');


            const bmp = await createImageBitmap(new Blob([buffer], {type: 'image/png'})); //blob constructor expects array for first arg even though it's only one arraybuffer

            

            ctx.drawImage(bmp, 0, 0);

            bmp.close();

            ack(null, 'ghost client: loaded canvas image from buffer')


        }catch(e){
            console.log('ghost client: error loading canvas', e)
            ack(e, null)
        }        
    })
    

    socket.on('download', options => {
        const {width, height} = options
        
        const cnv = ghosts[width]?.[height]?.canvas

        cnv?.toBlob(blob => {
            const url = URL.createObjectURL(blob)

            const a = document.createElement('a')
            a.href = url;
            a.download = `canvas_${width}x${height}`
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        })
    })

    setInterval(() => {
        socket.emit('ping')
    }, 10000)
}

function runHeadlessClient(){

    console.log('included! ' + PORT)
    console.log('B')

    connect()

    for(const pr of pixelRatios){
        addCanvas(baseWidth * pr, baseHeight * pr)
    }
}

//check if socket io finished loading first
if(typeof io !== 'undefined'){
    runHeadlessClient()
}else{
    //call from other script
}