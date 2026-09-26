// Node-only benchmark bridge. Production browser assets use asset-port.ts;
// both boundaries hand Bend the same List<U32> byte representation.
function piece_read_pages(path0, path1, path2) {
  const fs = require('fs');
  function byteList(bytes) {
    let tail = { $: 'Nil' };
    for (let i = bytes.length - 1; i >= 0; i--)
      tail = { $: 'Con', head: bytes[i], tail };
    return tail;
  }
  return {
    $: 'RawPages',
    first: byteList(fs.readFileSync(path0)),
    second: byteList(fs.readFileSync(path1)),
    third: byteList(fs.readFileSync(path2)),
  };
}

function piece_clock(force) {
  return Math.floor(performance.now() * 1000) >>> 0;
}
