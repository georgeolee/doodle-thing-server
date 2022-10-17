import {Socket} from 'socket.io'

let count = 0;

//generate a new user id ; no critical or long-lasting data attached to user (only for display), so not going overboard to guarantee unique a value
function generateId(){
    return `U-${Date.now()}-${count}`;
}


/**
 * validate socket id; only does type checking – if a string is passed in, doesn't check if a socket with the matching id actually exists
 * @param {Socket|string} socket a Socket instance or a Socket's id property
 * @param {function} fn the calling function, for error logging
 * @returns {string} the socket id
 */
function getSocketId(socket, fn){
    const socketId = (socket instanceof Socket) ? socket.id : socket;
    if(typeof socketId !== 'string') throw new TypeError(`expected Socket instance or Socket id (string) in ${fn.name}; got ${typeof socket}`);
    return socketId;
}


export class User{
    
    /**map of current users according to socket id */
    static #all = new Map();
    
    /**
     * adds a new user or updates an existing one
     * @param {Socket | string} socket a Socket instance or Socket id
     * @param {{name?:string,id?:string,status?:string,color?:string}} userData data to create or update the user with – name, status, session id, color
     * @returns {User} the updated user
     */
    static set(socket, userData){

        try{
            const socketId = getSocketId(socket, this.set);
    

            let u = User.get(socketId);
            if(!u) u = new User({...userData, socketId});
            else u.data = userData;
    
            if(typeof u.id !== 'string') u.assignNewId();
    
            this.#all.set(socket.id, u);

            return u;
    
        }catch(e){
            console.error(e)
        }           
    }

    /**
     * remove a User instance from the class's internal map ; call this when a socket disconnects
     * @param {Socket | string} socket a Socket instance or Socket id
     * @returns {User} the removed user instance
     */
    static delete(socket){

        try{
            const socketId = getSocketId(socket, this.delete);
            const removedUser = this.#all.get(socketId);
            this.#all.delete(socketId);
            return removedUser;

            
        }catch(e){
            console.error(e)
        }
    }

    /**
     * get a serializeable array representing current users ; send to new users on connect
     * @param  {...Socket|string} excludeSockets 
     * @returns {{id:null|string,name:string,status:string,color:string}[]}
     */
    static getUserList(...excludeSockets){

        const excludeIds = new Set(excludeSockets.map(s => getSocketId(s, this.getUserList)));

        const results = [];

        for(const [socketId, user] of this.#all.entries()){
            if(excludeIds.has(socketId)) continue;
            results.push(user.data);
        }

        return results;
    }

    // does this need to be exposed?
    static get(socket){
        try{
            const socketId = getSocketId(socket, this.get);
            return this.#all.get(socketId);
        }catch(e){
            console.log('error getting user')
            throw e;
        }
    }

    /**a session id that clients can use to identify each other across socket connections & disconnections */
    id;

    /**current socket id attached to the user */
    socketId;

    /**user display name */
    name;

    /**user display status */
    status;

    /**user display color */
    color;

    /**
     * don't call this constructor externally ; use static User.set() instead
     * @param {{id:null|string,socketId:string,name:string,status:string,color:string}} userData 
     */
    constructor(userData){
        this.id = userData.id;
        this.socketId = userData.socketId;
        this.name = userData.name;
        this.status = userData.status;
        this.color = userData.color;

    }

    /**assigns a new id to user and returns the new value */
    assignNewId(){        
        this.id = generateId();
        return this.id;
    }

    /**
     * user data properties ; undefined values are ignored when used as a setter
     * @param {{id?:string,name?:string,status?:string,color?:string}} data
     */
    set data(data){
        
        for(const prop of 
            [
                'name', 
                'color', 
                'status', 
                'id'
            ]
        ){
            if(data[prop] !== undefined) this[prop] = data[prop]
        }        
    }

    /**
     * get a shallow copy of the user data that should be sent out to clients
     * @returns {{id:null|string,name:string,status:string,color:string}}
     */
    get data(){
        const data = {...this};
        delete data.socketId; //clients don't need this (use session id instead)
        return data;
    }    

}