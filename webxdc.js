/* WebXDC API shim for browsers & standalone play */
(function () {
  if (typeof window.webxdc === 'undefined') {
    const STORAGE_KEY = 'nonogram_webxdc_updates';
    const listeners = [];

    function getStoredUpdates() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      } catch (e) {
        return [];
      }
    }

    function saveStoredUpdates(data) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {}
    }

    window.webxdc = {
      selfAddr: 'player@nonograms.local',
      selfName: 'Player 1',
      setUpdateListener: function (cb, serial = 0) {
        listeners.push(cb);
        const stored = getStoredUpdates();
        stored.forEach((update, idx) => {
          if (idx + 1 > serial) {
            setTimeout(() => cb(update), 10);
          }
        });
        return Promise.resolve();
      },
      sendUpdate: function (update, desc) {
        console.log('[WebXDC] sendUpdate:', desc, update);
        const stored = getStoredUpdates();
        const fullUpdate = {
          payload: update.payload,
          summary: update.summary || desc,
          info: update.info,
          serial: stored.length + 1,
          max_serial: stored.length + 1
        };
        stored.push(fullUpdate);
        saveStoredUpdates(stored);
        listeners.forEach(cb => cb(fullUpdate));
      },
      sendUpdateListener: null
    };
  }
})();

