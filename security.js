import { mlkem768 } from '@noble/post-quantum/mlkem';

/**
 * Axxon Core Cryptographic Security Module
 * Core Architecture: ML-KEM-768 (NIST FIPS 203 Post-Quantum Standard)
 * Designed to secure Axxon authentication tokens and backend data channels against quantum decryption vectors.
 */
export class AxxonSecurityEngine {

  /**
   * Generates a post-quantum public/private key pair for an encrypted session.
   * The public key can be shared openly; the private key must remain isolated on the backend.
   *
   * @returns {Promise<{publicKey: Uint8Array, privateKey: Uint8Array}>}
   */
  static async generateQuantumKeyPair() {
    try {
      const [publicKey, privateKey] = await mlkem768.generateKeyPair();
      return { publicKey, privateKey };
    } catch (error) {
      console.error("[Axxon-Security-Alert] Keypair generation failed:", error);
      throw new Error("Initialization of post-quantum state failed.");
    }
  }

  /**
   * Encapsulates a shared secret using the recipient's public key.
   * This is executed by the sending client/service to lock data before transmission.
   *
   * @param {Uint8Array} recipientPublicKey - The post-quantum public key of the receiver
   * @returns {Promise<{cipherText: Uint8Array, sharedSecret: Uint8Array}>}
   */
  static async encapsulateSecret(recipientPublicKey) {
    try {
      const [cipherText, sharedSecret] = await mlkem768.encapsulate(recipientPublicKey);
      return { cipherText, sharedSecret };
    } catch (error) {
      console.error("[Axxon-Security-Alert] Secret encapsulation failure:", error);
      throw new Error("Failed to secure the transit data layer.");
    }
  }

  /**
   * Decapsulates incoming ciphertext using the private key to extract the raw symmetric shared secret.
   * Includes structural integrity protection to guard against tampering or structural injection attacks.
   *
   * @param {Uint8Array} privateKey - Axxon's private key layer
   * @param {Uint8Array} cipherText - The encrypted payload packet received
   * @returns {Promise<Uint8Array>} The decrypted shared symmetric secret key
   */
  static async decapsulateSecret(privateKey, cipherText) {
    try {
      const sharedSecret = await mlkem768.decapsulate(cipherText, privateKey);
      return sharedSecret;
    } catch (error) {
      console.error("[Axxon-Security-Tamper-Warning] Decapsulation structural failure or invalid ciphertext.");
      throw new Error("Data stream validation failed. Connection closed.");
    }
  }
}
