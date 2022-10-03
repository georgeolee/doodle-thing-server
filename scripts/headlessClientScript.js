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
    const doodler = new Doodler(canvas)

    canvas.style.display = 'none'
    canvas.width = width
    canvas.height = height
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

    socket.on('pong', () => console.log('YAY!'))

    //process drawing data (not just pointer info -> rename!!)
    socket.on('pointerState', pdata => {
        
        //trace pdata
        //WOOHOOOOOOOOOOOOOOO!! works for now

        const data = JSON.parse(pdata)

        for(const d of doodlers){
            d.consumeDrawingData(data)
        }       
        
        socket.emit('timestamp', Date.now().toString())

    })

    socket.on('canvas request', (dimensions = {}, ack) => {
        const {width = baseWidth, height = baseHeight} = dimensions
        
        const cnv = (ghosts[width]?.[height]?.canvas) ?? ghosts[baseWidth][baseHeight].canvas

        const dataURL = cnv.toDataURL()
        // console.log(dataURL)

        ack(null, {width, height,dataURL, timestamp: Date.now()})        
    })

    socket.on('blob', async (dimensions = {}, ack) => {
        try{
            const {width = baseWidth, height = baseHeight} = dimensions
            const cnv = (ghosts[width]?.[height]?.canvas) ?? ghosts[baseWidth][baseHeight].canvas
            await cnv.toBlob(async blob => {
                
                //seems like socket.io sends blob just fine w/o converting to arrayBuffer
                ack(null, blob)    
            })

        }catch(e){
            ack(e, null)
        }                
    })

    
    

    // socket.on('download', options => {
    //     const {width, height} = options
        
    //     const cnv = ghosts[width]?.[height]?.canvas

    //     const data = cnv.toDataURL()
    //     console.log(data)

    //     socket.emit('cdata', data)
    // })

    setInterval(() => {
        socket.emit('ping')
    }, 1000)
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