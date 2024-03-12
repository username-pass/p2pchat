let myIdEl = document.getElementById("my-id");
let otherIdEl = document.getElementById("other-id");
let connectBtn = document.getElementById("connect-button");
let gossipBtn = document.getElementById("gossip-button");
let peer;
async function init() {
  peer = new NetPeer();
  await peer.init();
  myIdEl.value = peer.id;
  connectBtn.addEventListener("click", () => {
    peer.addConnection(otherIdEl.value);
  });
  gossipBtn.addEventListener("click", () => {
    peer.gossip(
      peer.peers[Object.keys(peer.peers)[0]],
      {
        recipient: peer.id,
        ok: true,
        type: "default",
        data: {
          testprop: true,
          otherTest: "testing",
        },
      },
      (data) => {
        statusLog("debug", "received data:", data);
      }
    );
    // peer.sendData(peer.peers[Object.keys(peer.peers)[0]], {
    //     type: "gossip",
    //     recipient: peer.peers[Object.keys(peer.peers)[0]].id,
    //     data:{
    //         testprop: true,
    //         otherTest: "testing",

    //     },
    //     ok: true
    // }, (data) => {
    //     statusLog("debug","received data ",data);
    // })
  });
}

init();
