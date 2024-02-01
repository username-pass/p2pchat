class KeyPair {
    constructor() {
        this.publicKey = null;
        this.privateKey = null;
    }

    async generateKeyPair() {
        try {
            const keyPair = await window.crypto.subtle.generateKey(
                {
                    name: "RSA-OAEP",
                    modulusLength: 4096,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                },
                true,
                ["encrypt", "decrypt"]
            );

            this.publicKey = await window.crypto.subtle.exportKey(
                "spki",
                keyPair.publicKey
            );
            this.privateKey = await window.crypto.subtle.exportKey(
                "pkcs8",
                keyPair.privateKey
            );
        } catch (error) {
            console.error("Error generating key pair:", error);
        }
    }
    async encrypt(data) {
        try {
            const publicKey = await window.crypto.subtle.importKey(
                "spki",
                this.publicKey,
                {
                    name: "RSA-OAEP",
                    hash: "SHA-256",
                },
                true,
                ["encrypt"]
            );

            const ciphertext = await window.crypto.subtle.encrypt(
                {
                    name: "RSA-OAEP",
                },
                publicKey,
                new TextEncoder().encode(data)
            );

            return KeyPair.arrayBufferToHex(ciphertext);
        } catch (error) {
            console.error("Error encrypting data:", error);
        }
    }
    static async encryptWithPublicKey(publicKey, data) {
        try {
            const importedPublicKey = await window.crypto.subtle.importKey(
                "spki",
                KeyPair.hexToArrayBuffer(publicKey),
                {
                    name: "RSA-OAEP",
                    hash: "SHA-256",
                },
                true,
                ["encrypt"]
            );

            const ciphertext = await window.crypto.subtle.encrypt(
                {
                    name: "RSA-OAEP",
                },
                importedPublicKey,
                new TextEncoder().encode(data)
            );

            return KeyPair.arrayBufferToHex(ciphertext);
        } catch (error) {
            console.error("Error encrypting data with public key:", error);
        }
    }

    async decrypt(encryptedData) {
        try {
            const privateKey = await window.crypto.subtle.importKey(
                "pkcs8",
                this.privateKey,
                {
                    name: "RSA-OAEP",
                    hash: "SHA-256",
                },
                true,
                ["decrypt"]
            );

            const decryptedData = await window.crypto.subtle.decrypt(
                {
                    name: "RSA-OAEP",
                },
                privateKey,
                KeyPair.hexToArrayBuffer(encryptedData)
            );

            return new TextDecoder().decode(decryptedData);
        } catch (error) {
            console.error("Error decrypting data:", error);
        }
    }

    exportHexKeys() {
        return {
            publicKey: KeyPair.arrayBufferToHex(this.publicKey),
            privateKey: KeyPair.arrayBufferToHex(this.privateKey),
        };
    }

    importHexKeys(hexPublicKey, hexPrivateKey) {
        this.publicKey = KeyPair.hexToArrayBuffer(hexPublicKey);
        this.privateKey = KeyPair.hexToArrayBuffer(hexPrivateKey);
    }

    static bufferToHex(buffer) {
        return Array.from(new Uint8Array(buffer))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    static arrayBufferToHex(buffer) {
        const view = new DataView(buffer);
        let hexString = "";

        for (let i = 0; i < view.byteLength; i++) {
            const byte = view.getUint8(i);
            hexString += byte.toString(16).padStart(2, "0");
        }

        return hexString;
    }

    static hexToArrayBuffer(hexString) {
        const buffer = new ArrayBuffer(hexString.length / 2);
        const view = new DataView(buffer);

        for (let i = 0; i < hexString.length; i += 2) {
            const byte = parseInt(hexString.substr(i, 2), 16);
            view.setUint8(i / 2, byte);
        }

        return buffer;
    }
}
