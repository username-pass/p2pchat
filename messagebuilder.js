/* MessageBuilder
 * This class uses a static factory to convert any message type into a string and back
*/

class MessageBuilder {

    static connect(hexPub, hexSig, id) {
        return JSON.stringify({
            type: "connect",
            to: id,
            from: hexPub,
            sig: hexSig
        });
    }

    static confirmConnection(hexPub, hexSig, id) {
        return JSON.stringify({
            type: "confirmConnection",
            to: id,
            from: hexPub,
            sig: hexSig
        });
    }

    /* No signature */
    static fullyConnected(from, to) {
        return JSON.stringify({
            type: "fullyConnected",
            from: from,
            to: to
        });
    }

    static findType(message) {
        try {
            message = JSON.parse(message);
        }
        catch (e) {
            return message;
        }
        return message.type;
    }

}