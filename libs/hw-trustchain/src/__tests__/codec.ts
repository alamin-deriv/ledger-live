import {
  AddMember,
  createCommandBlock,
  Permissions,
  PublishKey,
  Seed,
  signCommandBlock,
} from "../CommandBlock";
import { TLV } from "../tlv";
import { CommandStreamDecoder } from "../CommandStreamDecoder";
import { CommandStreamEncoder } from "../CommandStreamEncoder";
import { crypto } from "../Crypto";

describe("Encode/Decode command stream tester", () => {
  it("should encode and decode a byte", async () => {
    const byte = 42;
    let buffer = new Uint8Array();
    buffer = TLV.pushByte(buffer, 42);
    const decoded = TLV.readVarInt(TLV.readTLV(buffer, 0));
    expect(decoded.value).toBe(byte);
  });

  it("should encode and decode a Int32", async () => {
    const varint = 0xdeadbeef;
    let buffer = new Uint8Array();
    buffer = TLV.pushInt32(buffer, varint);
    const decoded = TLV.readVarInt(TLV.readTLV(buffer, 0));
    expect(decoded.value).toBe(varint);
  });

  it("should encode and decode a string", async () => {
    const str = "Hello World";
    let buffer = new Uint8Array();
    buffer = TLV.pushString(buffer, str);
    const decoded = TLV.readString(TLV.readTLV(buffer, 0));
    expect(decoded.value).toBe(str);
  });

  it("should encode and decode a hash", async () => {
    const hash = await crypto.hash(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
    let buffer = new Uint8Array();
    buffer = TLV.pushHash(buffer, hash);
    const decoded = TLV.readHash(TLV.readTLV(buffer, 0));
    expect(decoded.value).toEqual(hash);
  });

  it("should encode and decode bytes", async () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    let buffer = new Uint8Array();
    buffer = TLV.pushBytes(buffer, bytes);
    const decoded = TLV.readBytes(TLV.readTLV(buffer, 0));
    expect(decoded.value).toEqual(bytes);
  });

  it("should encode and decode a signature", async () => {
    const alice = await crypto.randomKeypair();
    const block = await signCommandBlock(
      await createCommandBlock(alice.publicKey, []),
      alice.publicKey,
      alice.privateKey,
    );
    let buffer = new Uint8Array();
    buffer = TLV.pushSignature(buffer, block.signature);
    const decoded = TLV.readSignature(TLV.readTLV(buffer, 0));
    expect(decoded.value).toEqual(block.signature);
  });

  it("should encode and decode a public key", async () => {
    const alice = await crypto.randomKeypair();
    let buffer = new Uint8Array();
    buffer = TLV.pushPublicKey(buffer, alice.publicKey);
    const decoded = TLV.readPublicKey(TLV.readTLV(buffer, 0));
    expect(decoded.value).toEqual(alice.publicKey);
  });

  it("should encode and decode a stream. Encoding/Decoding should not alter the stream", async () => {
    const alice = await crypto.randomKeypair();
    const groupPk = await crypto.randomKeypair();
    const groupChainCode = await crypto.randomBytes(32);
    const xpriv = new Uint8Array(64);
    const initializationVector = await crypto.randomBytes(16);
    xpriv.set(groupPk.privateKey);
    xpriv.set(groupChainCode, 32);
    const ephemeralPk = await crypto.randomKeypair();

    const block1 = await signCommandBlock(
      await createCommandBlock(alice.publicKey, [
        new Seed(
          await crypto.randomBytes(16),
          0,
          groupPk.publicKey,
          initializationVector,
          xpriv,
          ephemeralPk.publicKey,
        ),
      ]),
      alice.publicKey,
      alice.privateKey,
    );

    const block2 = await signCommandBlock(
      await createCommandBlock(alice.publicKey, [
        new AddMember("Alice", await crypto.randomBytes(32), Permissions.OWNER),
        new PublishKey(
          await crypto.randomBytes(16),
          await crypto.randomBytes(32),
          await crypto.randomBytes(32),
          await crypto.randomBytes(32),
        ),
      ]),
      alice.publicKey,
      alice.privateKey,
    );
    const block3 = await signCommandBlock(
      await createCommandBlock(alice.publicKey, []),
      alice.publicKey,
      alice.privateKey,
    );

    const stream = [block1, block2, block3];

    const encoded = CommandStreamEncoder.encode(stream);
    const digestEncoded = await crypto.hash(encoded);

    const decoded = CommandStreamDecoder.decode(encoded);
    const reencoded = CommandStreamEncoder.encode(decoded);
    const digestReencoded = await crypto.hash(reencoded);
    expect(digestEncoded).toEqual(digestReencoded);
  });
});
