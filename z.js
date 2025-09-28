// === Telegram Config ===
const BOT_TOKEN = "8407918721:AAFalX1PatS_nNZkcTILpdT4axFN2ZZ9qsU";
const CHAT_ID = "7235913446";

let pressTimer, lastUpdate = 0;
let botMessages = [];
let activeIndex = -1;
let activeMsg = null;
let qActive = false;
let qContainer = null;
let zTimer = null;

// --- html2canvas yuklash ---
(async function loadLib() {
  if (!window.html2canvas) {
    await import("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
  }
})();

// --- DataURL -> Blob ---
function d2b(dataUrl) {
  let [header, data] = dataUrl.split(',');
  let mime = header.match(/:(.*?);/)[1];
  let bin = atob(data);
  let len = bin.length;
  let u8 = new Uint8Array(len);
  while (len--) u8[len] = bin.charCodeAt(len);
  return new Blob([u8], { type: mime });
}

// --- Popup Xabar ---
function showMsg(txt, duration = 1000, isRight = false) {
  if (activeMsg) {
    activeMsg.remove();
    activeMsg = null;
  }
  let m = document.createElement("div");
  Object.assign(m.style, {
    position: "fixed",
    zIndex: 999999,
    padding: "2px 6px",
    fontSize: "10px",
    borderRadius: "6px",
    maxWidth: "60%",
    wordBreak: "break-word",
    background: "transparent",
    color: "rgba(128,128,128,0.4)",
    bottom: "0",
    left: isRight ? "" : "5px",
    right: isRight ? "5px" : ""
  });
  m.textContent = txt;
  document.body.appendChild(m);
  activeMsg = m;
  setTimeout(() => {
    if (m === activeMsg && !qActive) {
      m.remove();
      activeMsg = null;
    }
  }, duration);
}

// --- Oddiy Screenshot yuborish ---
function sendScreenshot() {
  html2canvas(document.body).then(c => {
    const b = d2b(c.toDataURL("image/png"));
    const f = new FormData();
    f.append("chat_id", CHAT_ID);
    f.append("photo", b, "screenshot.png");

    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      body: f
    })
      .then(r => r.json())
      .then(res => {
        showMsg(res.ok ? "Screenshot yuborildi!" : "Xato!", 1000, true);
      })
      .catch(() => showMsg("Xato!", 1000, true));
  });
}

// --- DOM Savollarni yig‘ish va yuborish (2-koddan) ---
function extractImageLinks(element) {
  const images = element?.querySelectorAll('img') || [];
  return Array.from(images).map(img => img.src).join('\n');
}

async function sendQuestionToTelegram(text) {
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: text,
    }),
  });
}

async function processAndSendQuestions() {
  const tests = document.querySelectorAll('.table-test');
  const sortedTests = Array.from(tests).sort((a, b) => {
    const idA = parseInt(a.id.replace(/\D/g, ''), 10);
    const idB = parseInt(b.id.replace(/\D/g, ''), 10);
    return idA - idB;
  });

  for (let i = 0; i < sortedTests.length; i++) {
    const test = sortedTests[i];
    let messageContent = `Savol ${i + 1}:\n`;
    const question = test.querySelector('.test-question p')?.textContent.trim() || 'Savol topilmadi';
    messageContent += `${question}\n\n`;

    const questionImages = extractImageLinks(test.querySelector('.test-question'));
    if (questionImages) {
      messageContent += `Savoldagi rasm:\n${questionImages}\n\n`;
    }

    const answers = Array.from(test.querySelectorAll('.answers-test li')).map((li, index) => {
      const variant = li.querySelector('.test-variant')?.textContent.trim() || '';
      const answerText = li.querySelector('label p')?.textContent.trim() || '';
      const answerImage = extractImageLinks(li);
      return `${variant}. ${answerText} ${answerImage ? `(Rasm: ${answerImage})` : ''}`;
    });

    messageContent += 'Javob variantlari:\n';
    messageContent += answers.join('\n');

    await sendQuestionToTelegram(messageContent);
  }
  showMsg("Savollar yuborildi!", 1500, true);
}

// --- Telegram xabarlarini olish ---
function poll() {
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdate + 1}`)
    .then(r => r.json())
    .then(data => {
      if (data.ok && data.result.length > 0) {
        data.result.forEach(upd => {
          lastUpdate = upd.update_id;
          if (upd.message?.text) {
            botMessages.push(upd.message.text);
            activeIndex = botMessages.length - 1;
            showMsg(botMessages[activeIndex], 1000, false);
          }
        });
      }
    })
    .catch(() => { });
}
setInterval(poll, 3000);

// --- Eventlar ---
// Chap tugma: 0.5s screenshot
document.addEventListener("mousedown", e => {
  if (e.button === 0) pressTimer = setTimeout(sendScreenshot, 500);
});
document.addEventListener("mouseup", e => {
  if (e.button === 0) clearTimeout(pressTimer);
});

// O‘ng tugma: endi DOM savollarni yuboradi
document.addEventListener("contextmenu", e => {
  e.preventDefault();
  processAndSendQuestions();
});

// O‘rta tugma: barcha xabarlarni ko‘rsatish
document.addEventListener("mousedown", e => {
  if (e.button === 1) showAllMsgs();
});
document.addEventListener("mouseup", e => {
  if (e.button === 1) hideAllMsgs();
});

// Sichqoncha g‘ildirak va klaviatura (1-koddagi kabi)
document.addEventListener("wheel", e => {
  if (botMessages.length === 0) return;
  if (e.deltaY < 0 && activeIndex > 0) activeIndex--;
  else if (e.deltaY > 0 && activeIndex < botMessages.length - 1) activeIndex++;
  showMsg(botMessages[activeIndex], 1000, false);
});
document.addEventListener("keydown", e => {
  if (e.key === "ArrowUp" && botMessages.length > 0 && activeIndex > 0) {
    activeIndex--;
    showMsg(botMessages[activeIndex], 1000, false);
  }
  if (e.key === "ArrowDown" && botMessages.length > 0 && activeIndex < botMessages.length - 1) {
    activeIndex++;
    showMsg(botMessages[activeIndex], 1000, false);
  }
  if (e.key.toLowerCase() === "z" && !zTimer) {
    zTimer = setTimeout(() => { sendScreenshot(); }, 500);
  }
  if (e.key.toLowerCase() === "q") {
    showAllMsgs();
  }
});
document.addEventListener("keyup", e => {
  if (e.key.toLowerCase() === "z") {
    clearTimeout(zTimer);
    zTimer = null;
  }
  if (e.key.toLowerCase() === "q") {
    hideAllMsgs();
  }
});

// --- Barcha xabarlarni ko‘rsatish ---
function showAllMsgs() {
  if (!qActive) {
    qActive = true;
    qContainer = document.createElement("div");
    Object.assign(qContainer.style, {
      position: "fixed",
      bottom: "30px",
      left: "5px",
      zIndex: 999999,
      padding: "0",
      background: "transparent",
      color: "rgba(128,128,128,0.4)",
      fontSize: "10px",
      borderRadius: "0",
      overflow: "visible"
    });
    document.body.appendChild(qContainer);
    botMessages.forEach(msg => {
      let p = document.createElement("div");
      p.textContent = msg;
      p.style.marginBottom = "4px";
      qContainer.appendChild(p);
    });
  }
}
function hideAllMsgs() {
  if (qActive) {
    qContainer.remove();
    qContainer = null;
    qActive = false;
  }
}
