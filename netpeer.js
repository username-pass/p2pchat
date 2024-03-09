class NetPeer {
    constructor(id = generateUUID(), options = {}) {
        this.id = id; // actual peer id, may be split into multiple parts
        this.options = options; //options for the peer, may be seperated to raw peer options, and other options for the netPeer
        this.peerOptions = options.peerOptions;
        this.importPeers(this.options.peers);
        this.getDefaultHandlers();
        this.importHandlers(this.options.handlers);
        this.importSettings(this.options.settings);
        this.key = {
            public: "",
            private: ""
        }
        statusLog("debug",this);
        
        
        

    }

    async _blank() {
        //make peer
        //initiate connections
        //get encryption working
        //find network
        //gossip protocol

        //initiate everything
        //upload data from file
        //input data
        //initiate those connections
        //NO GPT!!

        //Methods:
        //init
            //initiate everything, make everything work, and set everything up
        //sendData (peer id)
            //check if peer is known
                //check if connected
                    //if connected, send data directly
                    //create a callback and UUID
                    //add that to the message
                    //when UUID received, run callback associate with it
                    //if not, attempt to connect and send data
                        //if it fails, queue message (?)
                //if not known, then send data using gossip protocol throughout the network
        //addConnection (id and/or connection) 
            /*
            //add id to known peers list with trusted and verified = false
            //attempt to connect
                //if unsuccessful, return
                //if successful, add connection to connections list
                    //add actual peerjs connection, under connection
                    //add peer object
                    //add initial connection time
                    //increment connection counter
                    */
            //add id to known peers
                //attempt to connect
                    //if you can connect, add connection to peers entry, and set .connected = true
                    //otherwise, set .connected = false, and have an empty object
                
        //removeConnection (id) 
            //find connection in peers list
                //send the fact that you are disconnecting, and if there are any last messages
                //record/execute last messages
                //run .disconnect()
                //set connected = false
                //set connection object to blank object
                //broadcast that you are disconnecting through gossip
            //if not found, then return that nothing was removed
        //gossip (receiver, message) 
            //choose random percentage of connections to send message to
                //send the message to them as a gossip, with data being the receiver, and the full message for the receiver to receive
                    //to be encrypted
        //setUpHandlers (peerid)
            //set up default handlers
                //gossip handler
                    //when data is received
                        //if it's for you, deal with data (maybe unencrypt)
                        //if not
                            //if depth > MAX_DEPTH, or you received it already, drop
                            //if not, 
                                //if receiver is one of your peers, send data to that peer
                                //if receiver isn't one of your peers, run gossip with that message, and add yourself to the message chain
                //data
                    //log data
                    //check for special circumstances
            //if peer is the next of kin for a dead peer, move all callbacks to that one
        //add handler (type, handler, default, id)
            //if it's default
                //add handler to default handlers example with the type as the key
            //otherwise look for connection with the the id, and add handler there
        //dealWithData (id, data) 
            //middleware meant to deal with connections, and run the appropriate handlers
                //first, check for uuid, and if found, run the associated handler
                //then, check for default handlers, and run those
    }

    async init () {
        
        await new Promise((resolve, reject) => {
            this.rawPeer = new Peer(this.id, this.peerOptions);
            this.rawPeer.on("open", (id) => {
                this.id = id;
                resolve();
            })
        })
        this.rawPeer.on("connection",(connection) => {
            this.addConnection(connection.peer,true,connection);
        })

        
        

    }
    //getters


    //settings
    getDefaultSettings() {
        this.settings = {
            gossipPercentage: 1,

        }
    }
    importSettings(settings = {}) {
        this.settings = {...this.settings, ...settings};
    }
    

    //data sending 
    sendData(peer, data, callback, isGossip=false) {
        if (typeof peer == "string") {
            if (this.peers[peer]) peer = this.peers[peer];
            else return;
        }
        if (Object.keys(peer).length == 1) {
            if (this.peers[peer.id]) peer = this.peers[peer.id];
            else return;
        }
        if (!peer.connected) return statusLog("debug","peer not connected, but attempted to send data",peer, data,callback);
        statusLog("debug","peer id",peer.id,"peers",this.peers);
        if (this.peers[peer.id]){
            let callbackUUID = generateUUID();
            let handler = {
                type: callbackUUID,
                callback
            };
            data.author = sign(this.id, this.key.private);
            this.addHandler(peer,handler);
            data.callbackUUID = callbackUUID;
            let tmpData = data.data;
            tmpData = encrypt(JSON.stringify(tmpData),this.key.private);
            data.data = tmpData;
            statusLog("debug","sending data",data,peer);
            this.peers[peer.id].connection.send(data);
        } else {
            statusLog("debug","not in peers list");
            if (isGossip) return;
            statusLog("debug","not debug, so sending gossip");
            this.gossip(peer, data, callback);
        }
    }
 
    gossip (peer = newPeer(this.id), data, callback) {
        console.log("debug", {peer,data,callback});
        if (this.peers[peer]) this.sendData(this.peers[peer],data,callback,true);
        let randomPeers = {}; //randomProperties(this.peers,Math.ceil(this.settings.gossipPercentage * Object.keys(this.peers).length),{connected: true});
        Object.keys(this.peers).forEach((peer, i) => {
            if (i < 2 || Math.random() < this.settings.gossipPercentage) randomPeers[peer] = this.peers[peer];

        })
        console.log("debug", {randomPeers});
        let gossipData;
        if (data.type != "gossip"){
            gossipData = {
                type: "gossip",
                data: {
                    recipient: peer.id,
                    depth: 0,
                    path: [sign(this.id,this.key.private)],
                    data
                },
                ok: true,
            } 
        } else {
            gossipData = data;
            gossipData.data.depth++;
            gossipData.data.path.push(sign(this.id,this.key.private));
        }
        Object.keys(randomPeers).forEach(randPeer => {
            statusLog("debug","gossiping to ",randomPeers[randPeer]);
            if (randomPeers[randPeer].connected)
            this.sendData(randomPeers[randPeer], gossipData, callback, true);
        });
    }

    importPeers(peers = {}) {
        this.peers = peers;
    }

    //make a  new peer object, not add a new peer to the peers

    newPeer (id = "") {
        return {id};
    }

    //handler methods
    addConnection(id,hasConnection = false,connection) {
        let newConnection = {};
        let peerObj;
        statusLog("debug",this,this.peers);
        if (this.peers.hasOwnProperty(id)) {
            peerObj = this.peers[id];
        } else {
            peerObj = {
                id,
                known: false,
                trusted: false,
                verified: false,
                connected: false,
                handlers: {}
            };
        }
        if (!hasConnection){
            peerObj.connection = this.rawPeer.connect(id);
            peerObj.connected = true;
        }
        else
            peerObj.connection = connection;
        statusLog(peerObj.connection);
        peerObj.connection.send({type:"default",data:{test: encrypt("test","")}});
        peerObj.connection.on("data", (data) => {
            //statusLog("peerstatus","received data ",data);
            this.doData(peerObj,data);
        });
        peerObj.connection.on("open", () => {
            statusLog("debug","peer",peerObj,"opened, and is now available for connections");
            this.peers[peerObj.id].connected = true;
            //peerObj.connected = true;
        })
        peerObj.connection.on("close", () => {
            this.removeConnection(peerObj.id,true);
        })
        this.setUpHandlers(peerObj);
        this.peers[id] ??= peerObj;
    }
    removeConnection(id,alreadyDisconnected = false) {
        if (!this.peers.hasOwnProperty(id)) return; //no such peer found
        statusLog("peerstatus","connection being removed from ",id);
        let peerObj = this.peers[id];
        if (!alreadyDisconnected) {
            this.sendData(peerObj,{
                type:"status",
                data: {
                    status: "disconnecting",
                    finalRequestsAccepted: true
                },
                ok: true
            }, (finalReq) => {
                this.doData(finalReq);
            });
            peerObj.connection.disconnect();
        }
        peerObj.connected = false;
    }
    setUpHandlers(peerObj) {
        statusLog("debug","inithandler",this.handlers);
        Object.keys(this.handlers).forEach(handler => {
            let handlerObj = {
                type:handler,
                callback:this.handlers[handler]
            }
            statusLog("debug", "handler setting",handlerObj);
            this.addHandler(peerObj,handlerObj);
        });
    }
    addHandler(peerObj, handler,isDefault=false) {
        if (isDefault) {
            this.defaultHandlers[handler.type] = handler.callback;
            this.updateHandlers();
        }
        //peerObj.handlers ??= {};
        peerObj.handlers[handler.type] = handler.callback;
    }
    runHandler(type, peerObj,data) {
        let handler = peerObj.handlers.default;
        if (peerObj.handlers.hasOwnProperty(type)) handler = peerObj.handlers[type];
        this.middleware(data,handler,peerObj);
    }

    importHandlers(toImport, hard=false) {
        if (toImport) {
            this.handlers = {...toImport, ...this.defaultHandlers};
        } else {
            this.handlers = {...this.defaultHandlers};
        }
    }
    updateHandlers() {
        Object.keys(this.peers).forEach(peer => {
            this.setUpHandlers(peer);
        });
    }

    getKey (peerObj) {
        return "";
    }

    getDefaultHandlers() {
        this.middleware = (req, res,peer) => {
            req.id = peer.id;
            req.author = peer;
            req.received = Date.now();
            req.data = JSON.parse(decrypt(req.data,this.getKey(peer)));
            statusLog("middleware","got data ",req);
            res(req,peer);
        }
        this.defaultHandlers = {}
        this.defaultHandlers.default = (req) => {
            statusLog("default","received data from ",req,"data:",req);
            return req.data;
        }
        this.defaultHandlers.gossip = (req) => {
            statusLog("debug","received gossip data ",req);
            if (req.data.recipient.id == this.id) {
                this.runHandler(req.type,undefined,req.data.data);
            } else {
                this.gossip(req.recipient,req,(data) => {
                    this.sendData(req.author, data, (req) => {
                        statusLog("gossip","received and sent gossip data to ",req.data.recipient,"from",req.author);
                    },true)
                })
            }
        }
        return this.defaultHandlers;
    }

    doData(peer, data) {
        //statusLog("peerstatus","received data from",peer,data);
        this.runHandler(data.type, peer, data);
    }

}