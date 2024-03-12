class NetPeer {
  constructor(id = generateUUID(), options = {}) {
    this.id = id; // actual peer id, may be split into multiple parts
    this.options = options; //options for the peer, may be seperated to raw peer options, and other options for the netPeer
    this.peerOptions = options.peerOptions;
    /* Setup */
    this.importPeers(this.options.peers);
    this.getDefaultHandlers();
    this.importHandlers(this.options.handlers);
    this.importSettings(this.options.settings);
    /* Init */
    this.__initphase = 0;
    generateECDSAKeys().then((keys) => {
      this.publicKey = keys.publicKey;
      this.privateKey = keys.privateKey;
      this.__initphase++;
      exportKeys(true, this.publicKey).then((publicKey) => {
        this.publicKeyRaw = publicKey;
        this.__initphase++;
      });
      exportKeys(false, this.privateKey).then((privateKey) => {
        this.privateKeyRaw = privateKey;
        this.__initphase++;
      });
    });
    this.rawPeer = new Peer(this.id, this.peerOptions);
    this.init();
    /* Debug */
    statusLog("debug", this);
  }
  init() {
    this.rawPeer.on("open", (id) => {
      this.id = id;
      this.__initphase++;
    });
    this.rawPeer.on("connection", (connection) => {
      this.addConnection(connection.peer, true, connection);
    });
  }

  async waitForInit() {
    while (this.__initphase < 4) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  //getters

  //settings
  getDefaultSettings() {
    this.settings = {
      gossipPercentage: 1,
    };
  }
  importSettings(settings = {}) {
    this.settings = { ...this.settings, ...settings };
  }

  //data sending
  sendData(peer, data, callback, isGossip = false) {
    this.waitForInit().then(() => {
      const targetPeer = typeof peer === "string" ? this.peers[peer] : peer;
      if (!targetPeer || !targetPeer.connected) {
        return statusLog(
          "debug",
          "Peer not connected, but attempted to send data",
          targetPeer,
          data,
          callback
        );
      }

      const callbackUUID = generateUUID();
      const handler = {
        type: callbackUUID,
        callback,
      };

      data.author = sign(this.id, this.privateKey);
      this.addHandler(targetPeer, handler);
      data.callbackUUID = callbackUUID;
      data.data = encrypt(JSON.stringify(data.data), this.publicKey);

      statusLog("debug", "Sending data", data, targetPeer);
      targetPeer.connection.send(data);
    });
  }
  importPeers(peers = {}) {
    this.peers = peers;
  }

  //make a  new peer object, not add a new peer to the peers

  newPeer(id = "") {
    return { id };
  }

  //handler methods
  addConnection(id, hasConnection = false, connection) {
    this.waitForInit().then(() => {
      let peerObj = this.peers[id] || {
        id,
        known: false,
        trusted: false,
        verified: false,
        connected: false,
        handlers: {},
      };

      if (!hasConnection) {
        peerObj.connection = this.rawPeer.connect(id);
        peerObj.connected = true;
      } else {
        peerObj.connection = connection;
      }

      peerObj.connection.send({
        type: "default",
        data: { test: encrypt("test", "") },
      });

      peerObj.connection.on("data", (data) => {
        this.doData(peerObj, data);
      });

      peerObj.connection.on("open", () => {
        this.peers[peerObj.id].connected = true;
      });

      peerObj.connection.on("close", () => {
        this.removeConnection(peerObj.id, true);
      });

      this.setUpHandlers(peerObj);
      this.peers[id] = peerObj;
    });
  }
  removeConnection(id, alreadyDisconnected = false) {
    this.waitForInit().then(() => {
      if (!this.peers.hasOwnProperty(id)) return; //no such peer found
      statusLog("peerstatus", "connection being removed from ", id);
      let peerObj = this.peers[id];
      if (!alreadyDisconnected) {
        this.sendData(peerObj, {
          type: "status",
          data: {
            status: "disconnecting",
            finalRequestsAccepted: true,
          },
          ok: true,
        }, this.doData);
        peerObj.connection.disconnect();
      }
      peerObj.connected = false;
    });
  }
  setUpHandlers(peerObj) {
    statusLog("debug", "inithandler", this.handlers);
    Object.keys(this.handlers).forEach((handler) => {
      let handlerObj = {
        type: handler,
        callback: this.handlers[handler],
      };
      statusLog("debug", "handler setting", handlerObj);
      this.addHandler(peerObj, handlerObj);
    });
  }
  addHandler(peerObj, handler, isDefault = false) {
    if (isDefault) {
      this.defaultHandlers[handler.type] = handler.callback;
      this.updateHandlers();
    }
    //peerObj.handlers ??= {};
    peerObj.handlers[handler.type] = handler.callback;
  }
  runHandler(type, peerObj, data) {
    let handler = peerObj.handlers.default;
    if (peerObj.handlers.hasOwnProperty(type)) handler = peerObj.handlers[type];
    this.middleware(data, handler, peerObj);
  }

  importHandlers(toImport, hard = false) {
    if (toImport) {
      this.handlers = { ...toImport, ...this.defaultHandlers };
    } else {
      this.handlers = { ...this.defaultHandlers };
    }
  }
  updateHandlers() {
    Object.keys(this.peers).forEach((peer) => {
      this.setUpHandlers(peer);
    });
  }

  getKey(peerObj) {
    return "";
  }

  /**
   * Returns the default handlers for the netpeer object.
   * @returns {Object} The default handlers object.
   */
  getDefaultHandlers() {
    this.middleware = (req, res, peer) => {
      req.id = peer.id;
      req.author = peer;
      req.received = Date.now();
      req.data = JSON.parse(decrypt(req.data, this.getKey(peer)));
      statusLog("middleware", "got data ", req);
      res(req, peer);
    };
    this.defaultHandlers = {};
    this.defaultHandlers.default = (req) => {
      statusLog("default", "received data from ", req, "data:", req);
      return req.data;
    };
    this.defaultHandlers.gossip = (req) => {
      statusLog("debug", "received gossip data ", req);
      if (req.data.recipient.id == this.id) {
        this.runHandler(req.type, undefined, req.data.data);
      } else {
        this.gossip(req.recipient, req, (data) => {
          this.sendData(
            req.author,
            data,
            (req) => {
              statusLog(
                "gossip",
                "received and sent gossip data to ",
                req.data.recipient,
                "from",
                req.author
              );
            },
            true
          );
        });
      }
    };
    return this.defaultHandlers;
  }

  doData(peer, data) {
    //statusLog("peerstatus","received data from",peer,data);
    this.runHandler(data.type, peer, data);
  }

  // this is not needed for now
  //   gossip(peer = newPeer(this.id), data, callback) {
  //     console.log("debug", { peer, data, callback });
  //     if (this.peers[peer]) this.sendData(this.peers[peer], data, callback, true);
  //     let randomPeers = {}; //randomProperties(this.peers,Math.ceil(this.settings.gossipPercentage * Object.keys(this.peers).length),{connected: true});
  //     Object.keys(this.peers).forEach((peer, i) => {
  //       if (i < 2 || Math.random() < this.settings.gossipPercentage)
  //         randomPeers[peer] = this.peers[peer];
  //     });
  //     console.log("debug", { randomPeers });
  //     let gossipData;
  //     if (data.type != "gossip") {
  //       gossipData = {
  //         type: "gossip",
  //         data: {
  //           recipient: peer.id,
  //           depth: 0,
  //           path: [sign(this.id, this.key.private)],
  //           data,
  //         },
  //         ok: true,
  //       };
  //     } else {
  //       gossipData = data;
  //       gossipData.data.depth++;
  //       gossipData.data.path.push(sign(this.id, this.key.private));
  //     }
  //     Object.keys(randomPeers).forEach((randPeer) => {
  //       statusLog("debug", "gossiping to ", randomPeers[randPeer]);
  //       if (randomPeers[randPeer].connected)
  //         this.sendData(randomPeers[randPeer], gossipData, callback, true);
  //     });
  //   }
}
