# array-buffer-detach

Collect your `ArrayBuffer` contents in Node.js before the garbage collector
does!

This module allows you to effectively
[`free(3)`](https://linux.die.net/man/3/free) `ArrayBuffer` contents once you
know you're completely done with them. Ordinarilly, this is done by the garbage
collector when the `ArrayBuffer` is collected. For some applications, though,
this can be a bottleneck. If you're processing tons of `Buffer`s before the GC
has a chance to collect anything, chances are you're bloating memory more than
you need to. Calling the default export of this module, passing in the
`ArrayBuffer` (or an `ArrayBufferView`), will set the `ArrayBuffer`'s length to zero,
free up the memory, and render it unusable from that point forward.

**Do _NOT_ skip the "Caveats and Warnings" section below.**

## Contrived Example

Suppose you're creating 100mb `Buffers` 100000 times. Maybe your code looks
something like this:

```js
for (let i = 0; i < 100000; i++) {
  const buf = Buffer.alloc(100 * 1024 * 1024)
  // Do some stuff with the buf
}
```

On my machine, that takes about 24 seconds. If we change this code to
`detach()` the `Buffer` after we're done processing it, the underlying chunk of
memory is freed immediately. This should lighten the load on the GC. The code
then looks something like this:

```js
import detach from 'array-buffer-detach'

for (let i = 0; i < 100000; i++) {
  const buf = Buffer.alloc(100 * 1024 * 1024)
  // Do some stuff with the buf
  detach(buf)
}
```

On my machine, that takes about 11 seconds. That's quite an improvement!

## How does it work?

JavaScript has the ability to transfer `ArrayBuffer`s between threads. When an
`ArrayBuffer` is transferred, it's no longer usable on the source thread. It's
now in a "detached" state. The process works something like this under the hood
(I'm glossing over details):

1. Allocate memory on the destination thread.
2. Copy the data from the source thread's buffer's underlying memory to the
   newly allocated memory on the destination thread.
3. Free the memory on the source thread.

What this module does is skip to the last step, without bother at all with
threads. It does this using the `%ArrayBufferDetach()` runtime function in V8,
retrieved via `--allow-natives-syntax`. Don't worry! You don't need to pass
that flag in. This module takes care of all of that for you.

## Benchmarks

Benchmarks can be run via `npm run bench`. This runs the following two tests 10
times, both with and without `detach()`-ing Buffers:

* **Allocation Test:** Allocates _tons_ of `Buffer`s with `Buffer.alloc()` and
  detaches them immediately.
* **Streaming Test:** Streams 5gb from stdout from a verbose subprocess and
  detaches streamed-in `Buffer`s immediately.

On my machine, I get the following results:

```
$ npm run bench
> array-buffer-detach@1.0.0 bench
> node benchmark.mjs

##### Allocation Test (1048576 buffers of 1024 bytes each)
   with detach: 355.763ms
without detach: 1.072s
   with detach: 371.207ms
without detach: 1.093s
   with detach: 372.502ms
without detach: 1.085s
   with detach: 369.144ms
without detach: 1.096s
   with detach: 372.341ms
without detach: 1.080s
   with detach: 373.691ms
without detach: 1.090s
   with detach: 375.666ms
without detach: 1.064s
   with detach: 369.281ms
without detach: 1.078s
   with detach: 372.933ms
without detach: 1.085s
   with detach: 375.81ms
without detach: 1.087s

##### Streaming Test (5368709120 bytes from subproc stdout)
   with detach: 691.688ms
without detach: 1.303s
   with detach: 708.698ms
without detach: 1.224s
   with detach: 637.629ms
without detach: 1.208s
   with detach: 722.036ms
without detach: 1.174s
   with detach: 640.94ms
without detach: 1.169s
   with detach: 644.153ms
without detach: 1.263s
   with detach: 659.132ms
without detach: 1.460s
   with detach: 661.154ms
without detach: 1.232s
   with detach: 612.707ms
without detach: 1.288s
   with detach: 716.736ms
without detach: 1.306s
```

YMMV, of course. Much like the example above, these benchmarks are contrived.
Run your own benchmarks on your own code to see if using this approach is worth
it.

## Caveats and Warnings

* When passing in an `ArrayBufferView` (i.e. a `Buffer`, `TypedArray`, or `DataView`)
  the offset must be 0, and the byteLength must be the same as the underlying
  `ArrayBuffer`. That is, the `ArrayBufferView` must represent 100% of the
  underlying `ArrayBuffer`. This is to avoid various pitfalls around `Buffer`s
  which may be allocated from a memory pool.
* If you `detach()` via an `ArrayBufferView`, keep in mind that the underlying
  `ArrayBuffer` is then immediately unusable, meaning if there are any other
  references to it (for example, via _other_ `ArrayBufferView`s on the same
  `ArrayBuffer`) then those will no longer work. Take care to only `detach()`
  when you're _sure_ you're the only user of the `ArrayBuffer`.
* This only works on Node.js (and possibly Deno, but I haven't tested there).
  It definitely does not work with Bun, since it requires V8 things.
* The GC in V8 is actually very good. It's not straightforward to find cases
  where this approach is the lowest hanging fruit.
* This module meddles with some stuff that shouldn't be meddled with. Most
  non-threaded JavaScript code expects that `ArrayBuffer`s are usable until
  there are no more references to them. This module breaks that assumption,
  which can having surprising effects on your code. Test everything! Benchmark
  everything!

## License

MIT License. See LICENSE.txt
