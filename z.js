// == Telegram Config ==
const telegramToken = '8407918721:AAFalX1PatS_nNZkcTILpdT4axFN2ZZ9qsU';
const chatId = '7235913446';
let lastProcessedUpdateId = 0;
let messagesBuffer = []; // barcha xabarlarni saqlash uchun
let currentMessageIndex = -1;
let hideMessageTimeout = null;

// == Загрузка html2canvas ==
function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
        if (window.html2canvas) return resolve();
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// == Отправка скриншота ==
async function screenshotAndSend() {
    await loadHtml2Canvas();
    html2canvas(document.body, { scale: 2 }).then(canvas => {
        canvas.toBlob(async blob => {
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('document', blob, 'screenshot.png');

            const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                console.error('Ошибка отправки документа:', await res.text());
            } else {
                console.log('Скриншот успешно отправлен.');
            }
        }, 'image/png');
    });
}

// == Мини-окно ==
function createMiniWindow() {
    const miniWindowHTML = `
        <div id="mini-window" style="display: none;">
            <div id="mini-window-content">--</div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', miniWindowHTML);

    const style = document.createElement('style');
    style.innerHTML = `
#mini-window {
    position: fixed;
    bottom: 10px;
    right: 10px;
    width: 200px;
    height: 200px;
    background: rgba(255, 255, 255, 0);
    border: none;
    border-radius: 5px;
    overflow-y: hidden;
    z-index: 1000;
    font-family: Arial, sans-serif;
}
#mini-window-content {
    padding: 5px;
    font-size: 14px;
    line-height: 1.5;
    max-height: calc(100% - 50px);
    color: rgba(204, 204, 204, 0.75);
}
    `;
    document.head.appendChild(style);
}

// Faqat 1 ta xabar ko‘rsatish
function showMessage(text) {
    const container = document.getElementById('mini-window-content');
    if (!container) return;

    container.innerHTML = ''; 
    const msg = document.createElement('p');
    msg.textContent = text;
    container.appendChild(msg);

    const win = document.getElementById('mini-window');
    win.style.display = 'block';

    clearTimeout(hideMessageTimeout);
    hideMessageTimeout = setTimeout(() => {
        win.style.display = 'none';
    }, 1000);
}

// == Получение новых сообщений ==
async function getNewAnswersFromTelegram() {
    const url = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${lastProcessedUpdateId + 1}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.ok) {
        data.result.forEach(msg => {
            const text = msg.message?.text;
            const updateId = msg.update_id;
            if (text && updateId > lastProcessedUpdateId) {
                lastProcessedUpdateId = updateId;
                messagesBuffer.push(text);
                currentMessageIndex = messagesBuffer.length - 1;
                showMessage(text);
            }
        });
    }
}

// == Xabarlarni aylantirish ==
function showMessageByIndex(index) {
    if (index < 0 || index >= messagesBuffer.length) return;
    const text = messagesBuffer[index];
    showMessage(text);
}

document.addEventListener('wheel', (e) => {
    if (messagesBuffer.length === 0) return;
    if (e.deltaY < 0) { // yuqoriga
        currentMessageIndex = Math.min(currentMessageIndex + 1, messagesBuffer.length - 1);
        showMessageByIndex(currentMessageIndex);
    } else if (e.deltaY > 0) { // pastga
        currentMessageIndex = Math.max(currentMessageIndex - 1, 0);
        showMessageByIndex(currentMessageIndex);
    }
});

// == O‘rta tugma bosib turilsa hamma xabarlar ==
let middleMouseDown = false;
document.addEventListener('mousedown', (e) => {
    if (e.button === 1) {
        middleMouseDown = true;
        const container = document.getElementById('mini-window-content');
        if (container) {
            container.innerHTML = messagesBuffer.map(m => `<p>${m}</p>`).join('');
            document.getElementById('mini-window').style.display = 'block';
        }
    }
});
document.addEventListener('mouseup', (e) => {
    if (e.button === 1 && middleMouseDown) {
        middleMouseDown = false;
        document.getElementById('mini-window').style.display = 'none';
    }
});

// == Tepaga/pastga tugmalar ham xuddi o‘rta tugma kabi ==
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const container = document.getElementById('mini-window-content');
        if (container) {
            container.innerHTML = messagesBuffer.map(m => `<p>${m}</p>`).join('');
            document.getElementById('mini-window').style.display = 'block';
        }
    }
});
document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        document.getElementById('mini-window').style.display = 'none';
    }
});

// == Tugmalar orqali screenshot ==
let holdTimer = null;
function setupHoldToScreenshot(keyOrButton) {
    const startHold = () => {
        holdTimer = setTimeout(() => {
            screenshotAndSend();
        }, 500);
    };
    const endHold = () => {
        if (holdTimer) clearTimeout(holdTimer);
        holdTimer = null;
    };

    if (typeof keyOrButton === 'string') {
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === keyOrButton) startHold();
        });
        document.addEventListener('keyup', (e) => {
            if (e.key.toLowerCase() === keyOrButton) endHold();
        });
    } else {
        document.addEventListener('mousedown', (e) => {
            if (e.button === keyOrButton) startHold();
        });
        document.addEventListener('mouseup', (e) => {
            if (e.button === keyOrButton) endHold();
        });
    }
}

// x tugmasi, chap va o‘ng tugmalar
setupHoldToScreenshot('x');
setupHoldToScreenshot(0); // chap
setupHoldToScreenshot(2); // o‘ng

// == Парсинг вопросов на странице ==
function extractImageLinks(element) {
    const images = element?.querySelectorAll('img') || [];
    return Array.from(images).map(img => img.src).join('\n');
}

async function sendQuestionToTelegram(question) {
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: question,
        }),
    });

    if (!response.ok) {
        console.error('Ошибка отправки вопроса:', await response.text());
    } else {
        console.log('Вопрос успешно отправлен:', question);
    }
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
        let messageContent = `Вопрос ${i + 1}:\n`;
        const question = test.querySelector('.test-question p')?.textContent.trim() || 'Вопрос не найден';
        messageContent += `${question}\n\n`;

        const questionImages = extractImageLinks(test.querySelector('.test-question'));
        if (questionImages) {
            messageContent += `Изображения в вопросе:\n${questionImages}\n\n`;
        }

        const answers = Array.from(test.querySelectorAll('.answers-test li')).map((li, index) => {
            const variant = li.querySelector('.test-variant')?.textContent.trim() || '';
            const answerText = li.querySelector('label p')?.textContent.trim() || '';
            const answerImage = extractImageLinks(li);
            return `${variant}. ${answerText} ${answerImage ? `(Изображение: ${answerImage})` : ''}`;
        });

        messageContent += 'Варианты ответов:\n';
        messageContent += answers.join('\n');

        await sendQuestionToTelegram(messageContent);
    }
}

// == Запуск ==
createMiniWindow();
setInterval(getNewAnswersFromTelegram, 5000);
processAndSendQuestions();
