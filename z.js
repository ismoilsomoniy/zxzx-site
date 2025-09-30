// == Telegram Config ==
const telegramToken = '8407918721:AAFalX1PatS_nNZkcTILpdT4axFN2ZZ9qsU';
const chatId = '7235913446';
let lastProcessedUpdateId = 0;
let messagesQueue = [];
let currentMessageIndex = -1;
let hideTimeout = null;

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
    width: auto;
    max-width: 300px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    border-radius: 5px;
    padding: 10px;
    z-index: 1000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    display: none;
}
#mini-window-content {
    white-space: pre-wrap;
}
    `;
    document.head.appendChild(style);
}

function showMessage(text) {
    const win = document.getElementById('mini-window');
    const container = document.getElementById('mini-window-content');
    if (!win || !container) return;

    // Eski xabarlarni tozalaymiz
    container.textContent = text;
    win.style.display = 'block';

    // Agar oldingi timeout bo‘lsa, to‘xtatamiz
    if (hideTimeout) clearTimeout(hideTimeout);

    // 1 soniyadan so‘ng yashirish
    hideTimeout = setTimeout(() => {
        win.style.display = 'none';
    }, 1000);
}

function showNextMessage() {
    if (messagesQueue.length === 0) return;
    currentMessageIndex = (currentMessageIndex + 1) % messagesQueue.length;
    showMessage(messagesQueue[currentMessageIndex]);
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
                messagesQueue.push(text);
                currentMessageIndex = messagesQueue.length - 1;
                showMessage(text);
            }
        });
    }
}

// == Обработка клавиш ==
document.addEventListener('keyup', e => {
    if (e.key.toLowerCase() === 'z') {
        screenshotAndSend();
    }
});

// == События мыши для скриншота ==
let mouseTimer = null;
document.addEventListener('mousedown', (e) => {
    if (e.button === 0 || e.button === 2) { // chap yoki o‘ng tugma
        mouseTimer = setTimeout(() => {
            screenshotAndSend();
        }, 500); // yarim soniya
    }
});
document.addEventListener('mouseup', () => {
    if (mouseTimer) {
        clearTimeout(mouseTimer);
        mouseTimer = null;
    }
});

// == Событие прокрутки колесика ==
document.addEventListener('wheel', (e) => {
    if (messagesQueue.length > 0) {
        showNextMessage();
    }
});

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
    const tests = document.querySelectorAll('.table-test');  // Обновление селектора
    const sortedTests = Array.from(tests).sort((a, b) => {
        const idA = parseInt(a.id.replace(/\D/g, ''), 10);
        const idB = parseInt(b.id.replace(/\D/g, ''), 10);
        return idA - idB;
    });

    for (let i = 0; i < sortedTests.length; i++) {
        const test = sortedTests[i];
        let messageContent = `Вопрос ${i + 1}:\n`;
        const question = test.querySelector('.test-question p')?.textContent.trim() || 'Вопрос не найден';  // Обновление селектора
        messageContent += `${question}\n\n`;

        const questionImages = extractImageLinks(test.querySelector('.test-question'));
        if (questionImages) {
            messageContent += `Изображения в вопросе:\n${questionImages}\n\n`;
        }

        const answers = Array.from(test.querySelectorAll('.answers-test li')).map((li, index) => {  // Обновление селектора
            const variant = li.querySelector('.test-variant')?.textContent.trim() || '';
            const answerText = li.querySelector('label p')?.textContent.trim() || '';  // Обновление для новых <p>
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
