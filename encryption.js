//PLACEHOLDERS
function encrypt(data, private) {
  return btoa(data);
}

function decrypt(data, public) {
  return atob(data);
}

function sign(data, private) {
  return data;
}

function verify(data, public) {
  return true;
}

class MultiKeyPair {
  constructor(ecdsaPrivateKey, ecdsaPublicKey, ecdhPrivateKey, ecdhPublicKey) {
    this.ecdsaPKCS8 = MultiKeyPair.hexToArrayBuffer(ecdsaPrivateKey);
    this.ecdsaSPKI = MultiKeyPair.hexToArrayBuffer(ecdsaPublicKey);
    this.ecdhPKCS8 = MultiKeyPair.hexToArrayBuffer(ecdhPrivateKey);
    this.ecdhSPKI = MultiKeyPair.hexToArrayBuffer(ecdhPublicKey);
    crypto.subtle
      .importKey(
        "pkcs8",
        this.ecdhPKCS8,
        {
          name: "ECDSA",
          namedCurve: "P-521",
        },
        true,
        ["sign"]
      )
      .then((key) => {
        this.ecdsaPrivateKey = key;
      });

    crypto.subtle
      .importKey(
        "spki",
        this.ecdsaSPKI,
        {
          name: "ECDSA",
          namedCurve: "P-521",
        },
        true,
        ["verify"]
      )
      .then((key) => {
        this.ecdsaPublicKey = key;
      });

    crypto.subtle
      .importKey(
        "pkcs8",
        this.ecdhPKCS8,
        {
          name: "ECDH",
          namedCurve: "P-521",
        },
        true,
        ["deriveKey", "deriveBits"]
      )
      .then((key) => {
        this.ecdhPrivateKey = key;
      });

    crypto.subtle
      .importKey(
        "spki",
        this.ecdhSPKI,
        {
          name: "ECDH",
          namedCurve: "P-521",
        },
        true,
        ["deriveKey", "deriveBits"]
      )
      .then((key) => {
        this.ecdhPublicKey = key;
      });
  }

  async assertKeys() {
    while (
      !this.ecdsaPrivateKey ||
      !this.ecdsaPublicKey ||
      !this.ecdhPrivateKey ||
      !this.ecdhPublicKey
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  async sign(data) {
    await this.assertKeys();
    const signature = await crypto.subtle.sign(
      {
        name: "ECDSA",
        hash: { name: "SHA-512" },
      },
      this.ecdsaPrivateKey,
      new TextEncoder().encode(data)
    );
    return MultiKeyPair.arrayBufferToHex(signature);
  }

  static async verify(data, signature, spkiPublicKey) {
    const publicKey = await crypto.subtle.importKey(
      "spki",
      MultiKeyPair.hexToArrayBuffer(spkiPublicKey),
      {
        name: "ECDSA",
        namedCurve: "P-521",
      },
      true,
      ["verify"]
    );
    return crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: { name: "SHA-512" }, // Match the hash function used for signing
      },
      publicKey,
      MultiKeyPair.hexToArrayBuffer(signature),
      new TextEncoder().encode(data)
    );
  }

  async diffieHellman(otherPublicKey) {
    return crypto.subtle.deriveKey(
      {
        name: "ECDH",
        public: otherPublicKey,
      },
      this.ecdhPrivateKey,
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  static hexToArrayBuffer(hexString) {
    const arrayBuffer = new ArrayBuffer(hexString.length / 2);
    const uint8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < hexString.length; i += 2) {
      uint8Array[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    return arrayBuffer;
  }

  static arrayBufferToHex(arrayBuffer) {
    const uint8Array = new Uint8Array(arrayBuffer);
    return Array.from(uint8Array, (byte) =>
      byte.toString(16).padStart(2, "0")
    ).join("");
  }

  toString() {
    return {
      sign: MultiKeyPair.arrayBufferToHex(this.ecdsaPKCS8),
      verify: MultiKeyPair.arrayBufferToHex(this.ecdsaSPKI),
      decrypt: MultiKeyPair.arrayBufferToHex(this.ecdhPKCS8),
      encrypt: MultiKeyPair.arrayBufferToHex(this.ecdhSPKI),
    };
  }

  static async generate() {
    const ecdsaPrivate = await window.crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-521",
      },
      true,
      ["sign", "verify"]
    );
    const ecdhPrivate = await window.crypto.subtle.generateKey(
      {
        name: "ECDH",
        namedCurve: "P-521",
      },
      true,
      ["deriveKey", "deriveBits"]
    );
    return {
      sign: MultiKeyPair.arrayBufferToHex(
        await crypto.subtle.exportKey("pkcs8", ecdsaPrivate.privateKey)
      ),
      decrypt: MultiKeyPair.arrayBufferToHex(
        await crypto.subtle.exportKey("pkcs8", ecdhPrivate.privateKey)
      ),
      verify: MultiKeyPair.arrayBufferToHex(
        await crypto.subtle.exportKey("spki", ecdsaPrivate.publicKey)
      ),
      encrypt: MultiKeyPair.arrayBufferToHex(
        await crypto.subtle.exportKey("spki", ecdhPrivate.publicKey)
      ),
    };
  }
}

class PublicKeySet {
    constructor(verify, encrypt) {
        this.verify = verify;
        this.encrypt = encrypt;

        // import keys
        this.verifyKey = crypto.subtle.importKey(
            "spki",
            MultiKeyPair.hexToArrayBuffer(verify),
            {
                name: "ECDSA",
                namedCurve: "P-521",
            },
            true,
            ["verify"]
        );
        this.encryptKey = crypto.subtle.importKey(
            "spki",
            MultiKeyPair.hexToArrayBuffer(encrypt),
            {
                name: "ECDH",
                namedCurve: "P-521",
            },
            true,
            ["deriveKey", "deriveBits"]
        );
    }
}

(async () => {
  const k1 = await MultiKeyPair.generate();
  const k2 = await MultiKeyPair.generate();

  const k1p = new MultiKeyPair(k1.sign, k1.verify, k1.decrypt, k1.encrypt);
  const k2p = new MultiKeyPair(k2.sign, k2.verify, k2.decrypt, k2.encrypt);

  const message = await k1p.sign("Hello, World!");
  console.log(message);
  const proof = await MultiKeyPair.verify("Hello, World!", message, k1p.verify);
  console.log(proof);
})();
