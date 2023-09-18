'use strict'

function makeDetach () {
  // eslint-disable-next-line no-new-func
  const internalDetach = new Function('buf', '%ArrayBufferDetach(buf)')
  return function detach (buf) {
    if (buf.buffer) {
      if (buf.byteOffset !== 0 || buf.byteLength !== buf.buffer.byteLength) return
      buf = buf.buffer
    }
    internalDetach(buf)
  }
}

try {
  module.exports = makeDetach()
} catch {
  const v8 = require('v8')
  v8.setFlagsFromString('--allow-natives-syntax')
  module.exports = makeDetach()
  v8.setFlagsFromString('--no-allow-natives-syntax')
}
