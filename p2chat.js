class chatNetwork {
    constructor(fs) {
        this.fs = fs;
        this.peer;
        this.currentConnection;
        this.id;
        this.othersSeperator = String.fromCharCode(8);
        this.key = {
            public,
            private
        }
        this.connections = {

        }
        this.channels = {

        };
        this.knownUsers = {

        }
        this.callbacks = {
            
        }
        this.DEFAULT_MSG = {
            type: "default",
            status: "none",
            ok: true,
            statusCode: 200,
            data: {},
            comment: ""
        }
        this.ERRORS = {
            NO_CALLBACK: {
                type: "error",
                status: "no callback detected, dropping request",
                statusCode: 500,
                data: {},
                ok: false

            }
        }
        this.init();
    }
    init() {
        [this.key.public,this.key.private,[this.channels,this.knownUsers]] = this.fs.parseData();
        this.peer = new Peer(this.key.public);
        this.peer.on("open", (id) => {
            this.id = id;
            document.getElementById("your-id").value = id;
        });
        this.peer.on("connection", (connection) => {

            this.addConnection(connection, connection.peer, {trusted: false, known: false});
            this.attemptHandshake(connection, (status) => {
                this.changeStatus(connection, status);
            })
            
        })
    }

    attemptHandshake(connection, callback) {
        let randVal = newUUID();
        this.sendData(connection, {
            type: "handshake",
            data: randVal,
            
        }, (returnData) => {
            let stat = {};
            stat.success = returnData.data == randVal;
            stat.userData = returnData.userData;
            stat.known 
            
            callback(stat);
        })
        
    }

    sendData(connection, data, callback) {
        if (!this.connections[connection.peer]) return false;
        let UUID = newUUID();
        this.callbacks[UUID] = callback;
        data.UUID = UUID;
        connection.send(data);
        return true;
    }

    testConnection(connection) {
        let status = {
            known = false,
            trusted = false,
            handshake
        };
        let id = connection.peer;
        if (this.knownUsers[id]) {
            status.known = true;
            status.trusted = this.knownUsers[id].isTrusted;
            this.attemptHandshake(connection, (data))
            if (status.trusted) {
                this.attemptHandshake(connection,(success) => {
                    status.handshake = success;
                });
            }
            
        }
        
    }

    addConnection(connection, id, status) {
        if (!this.connections[id])
        this.connections[id] = {connection,status};
        connection.on("data", (data) => {
            if (this.callbacks[data.UUID]){
                connection.send(this.callbacks[data.UUID](data));
            }
            else{
                connection.send(this.ERRORS.NO_CALLBACK);
                console.log(data);
            }
        })
    }

}

class P2chat {
    constructor(fs) {
        this.fs = fs;
        this.peer;
        this.conn;
        this.connections = {};
        this.othersSeperator = String.fromCharCode(8);
        this.id;
        this.publicKey;
        this.privateKey;
        this.others;
    }
    init() {
        [this.publicKey, this.privateKey, this.others] = fs.parseData();
        console.log([this.publicKey, this.privateKey, this.others]);
        this.peer = new Peer(this.publicKey);
        this.peer.on("open", (id) => {
            //display id
            document.getElementById("your-id").value = id;
            this.id = id;
        });
        this.peer.on("connection", (connection) => {
            this.addConnection(connection.peer, connection);
            this.displayMessage(
                "status",
                "",
                "connected to: " + this.conn.peer
            );
        });
        this.peer.on("disconnected", () => {
            this.setConnectionIndicator(false);
        });
        this.peer.on("close", () => {
            this.setConnectionIndicator(false);
        });
        this.peer.on("error", (error) => {
            this.displayMessage("error", "", error);
            this.setConnectionIndicator(false);
        });
        document
            .getElementById("other-id")
            .addEventListener("input", function (event) {
                var otherPeerId = event.target.value;
                if (otherPeerId) {
                    console.log(this);
                    let peer = p2chat.peer;
                    console.log(peer);
                    p2chat.switchConnection(
                        otherPeerId,
                        peer.connect(otherPeerId)
                    );
                }
            });
        this.parseOthers();
        /*this.addOther(
            "30820222300d06092a864886f70d01010105000382020f003082020a0282020100c66e2a20062da2f9b66805d38e5a1543f6d7175c89452e0ce7d21a2a8343d1b59714aea958de9c9f4eb5895757b2880b0eea11f998c4a33bc88fcdfdc8ba815a8d612378740e205734150a9a3ca75f361748092f67166b84135bf279c9da269cd37d13763056357810b1eb0143c78373cdb7c4ce04ded591a4fe42e3cc819391136fc3300300287981193656c3546668aa379502bde117fe16b04d3a7283ba086ab909dd7429c7ebe2f730ecf641918cd448ff86444ee2876ffecc8f971e31e94d588cc69c048ac93ebd1b8db22f2ab41d42f8f24a0e73c8bd96a9d8aae77eb5181bcf52b64b8dca094c368afb3006ceafa883a5ddb3d5ada85df9835caef5933f36c0e56b71f61381f4b2e1319c4ad130e7ea0810522de7fc2c733ab1f129a09bc0ae519ed6d584d5dcfc4ae497b3ea23c424716f7c25a4c00c9e72c3edf6215d97b5718407a50f0ca2690a56a869a9c1d8c4270717097f34fd0db88e24c0fd72a5a11d29320caec78255e81c8088d2d8f32725e894b3352b986d4fc5b553289ec44d246c1e640a448df00ad910e905c526ce6cc63ca31f5dcad77fdecd6df0f80b6cb126df9f97a291ae2e5a57d1315842a3467fb81a5644311c55d8c57c0d6cf4a7a1f2ab829ff92bc0d1f960886f112f29b203d78cf93c45c80fd009640f26f7da63d934cadad88560aa73e48a375adb480a154b730dcb8c7dc1da8321d50203010001",
            {},
            "TestUser"
        );*/
        this.updateOthers();

        setInterval(this.updateFile, 5000);
    }
    resetPeerId(newId) {
        this.peer.destroy();
        this.peer = new Peer(newId);
    }

    copyIdToClipboard() {
        let copyText = document.getElementById("your-id");
        copyText.select();
        document.execCommand("copy");
        alert("ID copied to clipboard!");
    }

    sendMessage(e) {
        if (e.key != "Enter") return;
        let message = document.getElementById("message").value;
        if (p2chat.conn && message) {
            p2chat.sendData({
                type: "message",
                ok: true,
                status: "200 message sent",
                message: message,
            });
            p2chat.displayMessage("message", "you", message);
            document.getElementById("message").value = "";
        }
    }

    sendData(data) {
        if (!this.conn) return;
        let toSend = data || statuses["500"];
        toSend.sender = this.sender;
        this.conn.send(toSend);
    }

    doData(data, conn) {
//        if (this.conn != conn) return;
        console.log(this);
        console.log("received data", data);
        if (p2chat.conn != this) return;
        if (typeof data == "String") {
            p2chat.displayMessage("data", "unkown", data);
            return;
        }
        switch (data.type) {
            case "command":
                p2chat.execCommand(data.command);
                break;
            default:
                p2chat.displayMesssage(data.type, data.sender, data[data.type]);
                break;
        }
    }

    displayMessage(type = "data", sender = "unknown", data = "") {
        let chatHistory = document.getElementById("chat-history");
        let messageContainer = document.createElement("div");
        messageContainer.classList.add("message-element-container");
        let senderElement = document.createElement("span");
        senderElement.classList.add("message-sender-element");
        senderElement.textContent = sender.senderString;
        let messageTypeElement = document.createElement("span");
        messageTypeElement.classList.add("message-type-element");
        messageTypeElement.textContent = type;
        let messageElement = document.createElement("span");
        messageElement.classList.add("message-element");
        messageElement.textContent = data;
        messageElement.appendChild(messageTypeElement);
        messageElement.appendChild(senderElement);
        messageContainer.appendChild(messageElement);
        chatHistory.appendChild(messageContainer);
    }

    setConnectionIndicator(status) {
        document.getElementById("connection-indicator").checked = status;
    }

    parseOthers() {
        this.others ??= "W10=";
        console.log(this.others);
        this.others = JSON.parse(atob(this.others));
        return this.others;
    }

    combineOthers(others) {
        others ??= this.others;
        let out = [];
        others.forEach((other) => {
            out.push(JSON.stringify(other));
        });
        out = out.join(this.othersSeperator);
        return out;
    }

    updateOthers() {
        let otherscontainer = document.querySelector(".others-container");
        otherscontainer.innerHTML = "";

        this.others.forEach(async (other) => {
            let otherEl = document.createElement("div");
            otherEl.classList.add("other-user");
            otherEl.setAttribute("id", other.publicKey);
            let onlineIndicator = document.createElement("input");
            onlineIndicator.type = "checkbox";
            let usernameEl = document.createElement("span");
            usernameEl.innerText =
                other.nickname || (await createHash(other.publicKey));
            otherEl.appendChild(onlineIndicator);
            otherEl.appendChild(usernameEl);
            otherEl.addEventListener("click", () => {
                console.log(this);
                console.log(otherEl);
                console.log(p2chat);
                console.log(p2chat.switchConnection);
                p2chat.switchConnection(this.id);
            });
            otherscontainer.appendChild(otherEl);
        });

        this.updateFile();
    }

    addOther(publicKey, chats, nickname) {
        let newOther = { publicKey, nickname, chats };
        console.log(this.others);
        this.others.push(newOther);
        this.updateOthers();
    }

    async updateFile() {
        await fs.writeData(
            fs.convertJSON({
                public: p2chat.publicKey,
                private: p2chat.privateKey,
                others: p2chat.stringifyOthers(p2chat.others),
            })
        );
    }

    stringifyOthers(others) {
        return btoa(JSON.stringify(others));
    }

    switchConnection(id) {
        this.conn = this.connections[id] || this.conn;
        console.log(id);
    }

    addConnection(id, connection, change = true) {
        let oldCon = this.conn;
        this.conn = connection;
        this.conn ??= this.peer.connect(id);
        if (this.conn) this.connections[id] = this.conn;
        this.conn.on("open", function () {
            this.displayMessage(
                "status",
                "",
                "Connection established with " + id
            );
        });
        this.conn.on("data", this.doData);
        if (!change) this.conn = oldCon;
    }
}
