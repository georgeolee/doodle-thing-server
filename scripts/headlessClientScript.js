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
        for(const d of doodlers){
            d.consumePointerStates(JSON.parse(pdata))
        }
    })

    

    socket.on('download', options => {
        const {width, height} = options
        
        const cnv = ghosts[width]?.[height]?.canvas

        const data = cnv.toDataURL()
        console.log(data)

        socket.emit('cdata', data)
    })

    setInterval(() => {
        socket.emit('ping')
    }, 1000)
}

function runHeadlessClient(){

    console.log('included! ' + PORT)
    console.log('B')

    connect()
    addCanvas(300,300)
    addCanvas(900,900)
}

//check if socket io finished loading first
if(typeof io !== 'undefined'){
    runHeadlessClient()
}else{
    //call from other script
}