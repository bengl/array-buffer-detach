import { spawn } from 'node:child_process'
import detach from './index.js'

const BUFFER_COUNT = 1024 * 1024
const BUFFER_SIZE = 1024
const STREAM_SIZE = 5 * 1024 * 1024 * 1024
const ITERATION_COUNT = 10

function start (shouldDetach) {
  console.time(shouldDetach ? '   with detach' : 'without detach')
}

function end (shouldDetach) {
  console.timeEnd(shouldDetach ? '   with detach' : 'without detach')
}

function allocationTest (shouldDetach) {
  start(shouldDetach)
  for (let i = 0; i < BUFFER_COUNT; i++) {
    const b = Buffer.alloc(BUFFER_SIZE)
    if (shouldDetach) detach(b)
  }
  end(shouldDetach)
}

async function fileStreamingTest (shouldDetach) {
  start(shouldDetach)
  const proc = spawn('yes')
  const stdout = proc.stdout
  let bytesTotal = 0
  for await (const buf of stdout) {
    bytesTotal += buf.byteLength
    if (bytesTotal >= STREAM_SIZE) proc.kill()
    if (shouldDetach) detach(buf)
  }
  end(shouldDetach)
}

console.log(`##### Allocation Test (${BUFFER_COUNT} buffers of ${BUFFER_SIZE} bytes each)`)
for (let i = 0; i < ITERATION_COUNT; i++) {
  allocationTest(true)
  allocationTest(false)
}
console.log(`\n##### Streaming Test (${STREAM_SIZE} bytes from subproc stdout)`)
for (let i = 0; i < ITERATION_COUNT; i++) {
  await fileStreamingTest(true)
  await fileStreamingTest(false)
}
