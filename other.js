/* Dummy class for other peers, works suprisingly well */
class Otherpeer {
    /**
     * Represents a peer connection.
     * @constructor
     * @param {Peer} peer - The peer object.
     * @param {string} hexPub - The hexadecimal public key.
     */
    constructor(peer, hexPub) {
        this.peer = peer;
        this.id = hexPub;
        this.connection = null;
        this.fullyConnected = false;
    }

    /**
     * Initializes the object.
     * @returns {Promise<void>} A promise that resolves when the initialization is complete.
     */
    async init() {
        await importKeys(true, hexToArrayBuffer(this.id)).then((publicKey) => {
            this.publicKey = publicKey;
        });
        this.ready = true;
        return;
    }

    /**
     * Waits for the initialization of the object.
     * @returns {Promise<void>} A promise that resolves when the object is ready.
     */
    async waitForInit() {
        while (!this.ready) {
            await new Promise((resolve) => {
                setTimeout(resolve, 100);
            });
        }
    }
    async verify(message, signature) {
          return await crypto.subtle.verify(
                {
                  name: "ECDSA",
                  hash: { name: "SHA-512" },
                },
                this.publicKey,
                hexToArrayBuffer(signature),
                 new TextEncoder().encode(message)
              );
    }

    /**
     * Establishes a connection with another peer and sends a connect message.
     * @param {string} connectMessage - The message to send when the connection is established.
     */
    connect(connectMessage) {
        if (this.ready) {
            this.connection = this.peer.connect(this.id);
            this.connection.on("error", (x) => {
                console.log(x);
            });
            this.connection.on("open", () => {
                this.connection.send(connectMessage);
            });
        } else {
            console.log("Not ready");
        }
    }
}
