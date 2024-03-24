//PLACEHOLDERS
function encrypt(data, public) {
  return data;
}

function decrypt(data, private) {
  return data;
}

/**
 * Signs the given data using the provided private key.
 * @param {ArrayBuffer} data - The data to be signed.
 * @param {CryptoKey} private - The private key used for signing.
 * @returns {Promise<ArrayBuffer>} A promise that resolves with the signature as an ArrayBuffer.
 */
async function sign(data, private) {
  return await crypto.subtle.sign(
    {
      name: "ECDSA",
      hash: { name: "SHA-512" },
    },
    private,
    data
  );
}

/**
 * Verifies the signature of the given data using the provided public key.
 *
 * @param {ArrayBuffer} data - The data to be verified.
 * @param {CryptoKey} public - The public key used for verification.
 * @returns {Promise<boolean>} A promise that resolves to a boolean indicating whether the signature is valid.
 */
async function verify(signature, data, public) {
  return await crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: { name: "SHA-512" },
    },
    public,
    signature,
    data
  );
}
/**
 * Generates ECDSA keys using the specified named curve.
 * @returns {Promise<CryptoKeyPair>} A promise that resolves to the generated ECDSA keys.
 */
async function generateECDSAKeypair() {
  const ecdsaKeys = await crypto.subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-521",
    },
    true,
    ["sign", "verify"]
  );
  return ecdsaKeys;
}

/**
 * Exports the given key in either "spki" or "pkcs8" format.
 * @param {boolean} public - Indicates whether the key is a public key.
 * @param {CryptoKey} key - The key to be exported.
 * @returns {Promise<ArrayBuffer>} - The exported key as an ArrayBuffer.
 */
async function exportKeys(public, key) {
  const exported = await crypto.subtle.exportKey(
    public ? "spki" : "pkcs8",
    key
  );
  return exported;
}

/**
 * Imports a key for cryptographic operations.
 *
 * @param {boolean} public - Indicates whether the key is a public key.
 * @param {CryptoKey} key - The key to import.
 * @returns {Promise<CryptoKey>} - The imported key.
 */
async function importKeys(public, key) {
  const imported = await crypto.subtle.importKey(
    public ? "spki" : "pkcs8",
    key,
    {
      name: "ECDSA",
      namedCurve: "P-521",
    },
    true,
    public ? ["verify"] : ["sign"]
  );
  return imported;
}

/**
 * Converts an ArrayBuffer to a hexadecimal string.
 *
 * @param {ArrayBuffer} buffer - The ArrayBuffer to convert.
 * @returns {string} The hexadecimal string representation of the ArrayBuffer.
 */
function arrayBufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Converts a hexadecimal string to an ArrayBuffer.
 *
 * @param {string} hexString - The hexadecimal string to convert.
 * @returns {ArrayBuffer} The converted ArrayBuffer.
 */
function hexToArrayBuffer(hexString) {
  return new Uint8Array(
    hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
  ).buffer;
}
