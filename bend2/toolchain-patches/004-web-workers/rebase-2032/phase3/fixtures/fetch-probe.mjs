export default {
  probe() {
    globalThis.fetch('data:text/plain,worker-denial-probe').catch(() => {});
    return 7;
  },
};
