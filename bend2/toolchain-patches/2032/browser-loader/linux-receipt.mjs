// Independent host-reported output pins from Coordination issue #1 comments
// 5901345715 (emission) and 5901585228 (path/byte readback). These are the
// four exact source-6c cache artifacts, not a generic cache trust root.
export const linuxSelectedReceipt = Object.freeze({
  menu: Object.freeze({
    manifest: '.artifacts/bend2/2032-preview/menu-2026-09-29T23-54-01-009Z-491494/menu.manifest.json',
    manifestSha256: 'b40330a3bd427a73b79055c8ec0da5c191135197704645e298f3be5a246e405f',
    outputSha256: 'a7d33ce2b2a8aa0ebbb520896b527a3d7161d47974cb9bb45259ce8c55da1506',
    bytes: 214509,
  }),
  controller: Object.freeze({
    manifest: '.artifacts/bend2/2032-preview/controller-2026-09-29T23-55-21-546Z-495026/controller.manifest.json',
    manifestSha256: '6ef31933673cd7644d355172b90b73b21c07b4699ad7092ad71c997714c852c5',
    outputSha256: '1cf9558d288f7b42b756202b9a033e25c89759ad54f439329eb74ac030ec6532',
    bytes: 631152,
  }),
  scene: Object.freeze({
    manifest: '.artifacts/bend2/2032-preview/scene-2026-09-29T23-55-46-420Z-496191/scene.manifest.json',
    manifestSha256: '62abf36933329080dd4f2ee282b3451155efdd2e9e7fb779de3bc3d0dbf10e88',
    outputSha256: 'ac2fd2a75e6e56d42e8cbc39aafcf1fc3f6ca1d26eb4777cc2373c96301e14b5',
    bytes: 340729,
  }),
  chrome: Object.freeze({
    manifest: '.artifacts/bend2/2032-preview/chrome-2026-09-29T23-56-10-836Z-497629/chrome.manifest.json',
    manifestSha256: '893ce07fd2420ae2edc895f87c62fb2096f7f974560ff29c8a3d0de697a045b2',
    outputSha256: 'a029723ac363d7a35b6e051f805c510193b29925439ac1b94459f78481c4632b',
    bytes: 437150,
  }),
});
