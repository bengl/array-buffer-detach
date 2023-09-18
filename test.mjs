import { describe, it } from 'node:test'
import assert from 'node:assert'
import detach from './index.js'

describe('array-buffer-detach', () => {
  Object.entries({
    alloc: (n) => Buffer.alloc(n),
    allocUnsafe: (n) => Buffer.allocUnsafe(n),
    allocUnsafeSlow: (n) => Buffer.allocUnsafeSlow(n),
    ArrayBuffer: (n) => new ArrayBuffer(n),
    Uint8Array: (n) => new Uint8Array(n),
    DataView: (n) => new DataView(new ArrayBuffer(n))
  }).forEach(([name, alloc]) => {
    it(`should ${name === 'allocUnsafe' ? 'not ' : ''}clear a buffer (${name})`, () => {
      const buf = alloc(1024)
      const origLen = buf.byteLength
      assert.strictEqual(1024, origLen)
      const isInexact = buf.buffer && (buf.byteOffset !== 0 || origLen !== buf.buffer.byteLength)
      detach(buf)
      if (isInexact) {
        assert.strictEqual(origLen, buf.byteLength)
      } else {
        try {
          assert.strictEqual(0, buf.byteLength)
        } catch (e) {
          // It's a TypeError for DataView. Not a big deal.
          if (!(e instanceof TypeError)) throw e
        }
        if (buf.buffer) assert.strictEqual(0, buf.buffer.byteLength)
      }
    })
  })
})
