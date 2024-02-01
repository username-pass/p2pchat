class P2chat {
    constructor(fs) {
        this.fs = fs;
        this.peer;
        this.conn;
        [this.publicKey, this.privateKey, this.others] = fs.parseData();
        this.othersSeperator = String.fromCharCode(8);
        this.internalOthersSeperator = String.fromCharCode(9);

        this.id;
    }
    init() {
        this.peer = new Peer(this.publicKey);
        this.peer.on("open", (id) => {
            //display id
            document.getElementById("your-id").value = id;
            this.id = id;
        });
        this.peer.on("connection", (connection) => {
            console.log(typeof this, this);
            this.conn = connection;
            this.setConnectionIndicator(true);
            this.displayMessage(
                "status",
                "",
                "connected to: " + this.conn.peer
            );
            this.conn.on("data", this.doData);
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
                    p2chat.conn = peer.connect(otherPeerId);
                    p2chat.conn.on("open", function () {
                        p2chat.displayMessage(
                            "status",
                            "",
                            "Connection established with " + otherPeerId
                        );
                    });
                    p2chat.conn.on("data", function (data) {
                        p2chat.doData(data);
                    });
                }
            });
        this.parseOthers();
        this.findOthers();
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

    doData(data) {
        console.log("received data", data);
        console.log(this);
        console.log(p2chat);
        console.log(P2chat);
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
        this.others = JSON.stringify(
            atob(this.others.split(this.othersSeperator))
        );
        return this.others;
    }
}
