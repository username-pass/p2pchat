class OtherPeer {
  constructor(id, hexKeys, options = {}) {
    this.id = id;
    this.options = options;
    this.peerOptions = options.peerOptions;
    this.rawPeer = new Peer(this.id, this.peerOptions);

    this.hexPublicKey = hexKeys.publicKey;

    this.__initphase = 0;
    importKeys(true, hexToArrayBuffer(hexKeys.publicKey)).then((key) => {
      this.publicKey = key;
      this.__initphase++;
    });
  }

  init(peer) {
    this.rawPeer = peer.connect(this.id);
    this.rawPeer.on("open", (id) => {
      this.id = id;
      this.__initphase++;
    });
  }

  async waitForInit() {
    while (this.__initphase < 2) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
