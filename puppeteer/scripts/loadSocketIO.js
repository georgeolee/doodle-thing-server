const scriptElement = document.createElement('script')

scriptElement.src = "https://cdn.socket.io/4.5.0/socket.io.min.js" 
scriptElement.integrity="sha384-7EyYLQZgWBi67fBtVxw60/OWl1kjsfrPFcaU0pp0nAh+i8FD068QogUvg85Ewy1k" 
scriptElement.crossOrigin="anonymous"
scriptElement.setAttribute("async", "")

scriptElement.onerror = function(err){
    console.log(`error loading ${scriptElement.src}`)
    console.log(err)
}

scriptElement.onload = function(){
    console.log(`finished loading ${scriptElement.src}`)

    //check if client script loaded first
    if(typeof runHeadlessClient !== 'undefined'){
        runHeadlessClient()
    }else{
        //call from other script
    }

}

document.head.append(scriptElement);