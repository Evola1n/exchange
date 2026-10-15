const currencyNames = {
    UAH: 'Гривна',
    USD: 'Доллар США',
    EUR: 'Евро',
    CNY: 'Юань',
    GBP: 'Фунт',
    PLN: 'Злотый',
    RUB: 'Рубль'
};
const supportedCurrencies = Object.keys(currencyNames);
const rateCache = new Map();

const fromSelect = document.getElementById('fromCurrency');
const toSelect = document.getElementById('toCurrency');
const amountInput = document.getElementById('amount');
const resultPanel = document.getElementById('resultPanel');
const resultElement = document.getElementById('result');
const rateCaption = document.getElementById('rateCaption');
const conversionStatus = document.getElementById('conversionStatus');
const copyButton = document.getElementById('copyResult');
const baseCurrencySelect = document.getElementById('baseCurrency');
const baseCurrencyLabel = document.getElementById('baseCurrencyLabel');
const ratesCaption = document.getElementById('ratesCaption');
const ratesTableBody = document.getElementById('ratesTableBody');

let conversionRequestId = 0;
let lastResultText = '';

function formatNumber(value, maximumFractionDigits) {
    return new Intl.NumberFormat('ru-RU', {
        maximumFractionDigits,
        minimumFractionDigits: 0
    }).format(value);
}

function currentPair() {
    return { from: fromSelect.value, to: toSelect.value };
}

function fetchRates(baseCurrency, refresh) {
    if (!refresh && rateCache.has(baseCurrency)) {
        return rateCache.get(baseCurrency);
    }

    const request = fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Rate service returned HTTP ${response.status}.`);
            }
            return response.json();
        })
        .then(data => {
            if (!data || !data.rates || typeof data.rates !== 'object') {
                throw new Error('Rate service returned invalid currency data.');
            }
            return data;
        })
        .catch(error => {
            rateCache.delete(baseCurrency);
            throw error;
        });

    rateCache.set(baseCurrency, request);
    return request;
}

function showConversionError(error, requestId) {
    if (requestId !== conversionRequestId) return;
    console.error('Could not convert currency.', error);
    resultPanel.hidden = true;
    lastResultText = '';
    copyButton.disabled = true;
    conversionStatus.textContent = 'Не удалось загрузить курс. Проверьте подключение и попробуйте ещё раз.';
}

function convertCurrency() {
    const requestId = ++conversionRequestId;
    const amount = Number(amountInput.value);
    const pair = currentPair();

    if (!amountInput.value) {
        resultPanel.hidden = true;
        conversionStatus.textContent = '';
        lastResultText = '';
        copyButton.disabled = true;
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        resultPanel.hidden = true;
        lastResultText = '';
        copyButton.disabled = true;
        conversionStatus.textContent = 'Введите сумму больше нуля.';
        return;
    }

    if (pair.from === pair.to) {
        renderConversion(amount, 1, pair);
        conversionStatus.textContent = '';
        return;
    }

    conversionStatus.textContent = 'Обновляем курс...';
    fetchRates(pair.from, false)
        .then(data => {
            if (requestId !== conversionRequestId) return;
            const exchangeRate = Number(data.rates[pair.to]);
            if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
                throw new Error(`Rate for ${pair.to} is missing or invalid.`);
            }
            renderConversion(amount, exchangeRate, pair);
            conversionStatus.textContent = '';
        })
        .catch(error => showConversionError(error, requestId));
}

function renderConversion(amount, exchangeRate, pair) {
    const convertedAmount = amount * exchangeRate;
    const formattedAmount = formatNumber(amount, 6);
    const formattedResult = formatNumber(convertedAmount, 2);
    const formattedRate = formatNumber(exchangeRate, 6);
    lastResultText = `${formattedAmount} ${pair.from} = ${formattedResult} ${pair.to}`;
    resultElement.textContent = lastResultText;
    rateCaption.textContent = `1 ${pair.from} = ${formattedRate} ${pair.to}`;
    resultPanel.hidden = false;
    copyButton.disabled = false;
}

function renderRatesTable(data, baseCurrency) {
    const rows = supportedCurrencies
        .filter(currency => currency !== baseCurrency)
        .map(currency => {
            const rate = Number(data.rates[currency]);
            if (!Number.isFinite(rate) || rate <= 0) return null;

            const row = document.createElement('tr');
            const currencyCell = document.createElement('td');
            const name = document.createElement('span');
            name.className = 'currency-code';
            name.textContent = currency;
            const description = document.createElement('span');
            description.className = 'currency-name';
            description.textContent = currencyNames[currency];
            currencyCell.append(name, description);

            const rateCell = document.createElement('td');
            rateCell.className = 'rate-value';
            rateCell.textContent = formatNumber(rate, 6);
            row.append(currencyCell, rateCell);
            return row;
        })
        .filter(Boolean);

    ratesTableBody.replaceChildren();
    if (rows.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 2;
        cell.className = 'table-placeholder';
        cell.textContent = 'Для этой валюты курсы недоступны.';
        row.append(cell);
        ratesTableBody.append(row);
        return;
    }

    ratesTableBody.append(...rows);
}

function loadRatesTable(refresh) {
    const baseCurrency = baseCurrencySelect.value;
    baseCurrencyLabel.textContent = baseCurrency;
    ratesCaption.textContent = 'Загружаем курсы...';

    fetchRates(baseCurrency, refresh)
        .then(data => {
            if (baseCurrency !== baseCurrencySelect.value) return;
            renderRatesTable(data, baseCurrency);
            const date = data.date ? new Date(`${data.date}T00:00:00`) : null;
            const dateLabel = date && !Number.isNaN(date.getTime())
                ? date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'дата не указана';
            ratesCaption.textContent = `По данным ExchangeRate-API · дата курса: ${dateLabel}`;
        })
        .catch(error => {
            if (baseCurrency !== baseCurrencySelect.value) return;
            console.error('Could not load currency rate table.', error);
            ratesCaption.textContent = 'Не удалось загрузить курсы. Проверьте подключение и попробуйте обновить.';
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 2;
            cell.className = 'table-placeholder';
            cell.textContent = 'Курсы временно недоступны.';
            row.append(cell);
            ratesTableBody.replaceChildren(row);
        });
}

amountInput.addEventListener('input', convertCurrency);
fromSelect.addEventListener('change', convertCurrency);
toSelect.addEventListener('change', convertCurrency);

document.getElementById('swap').addEventListener('click', () => {
    [fromSelect.value, toSelect.value] = [toSelect.value, fromSelect.value];
    convertCurrency();
});

copyButton.addEventListener('click', async () => {
    if (!lastResultText) return;
    try {
        await navigator.clipboard.writeText(lastResultText);
        copyButton.textContent = 'Скопировано';
        window.setTimeout(() => {
            copyButton.textContent = 'Копировать';
        }, 1600);
    } catch (error) {
        console.error('Could not copy conversion result.', error);
        conversionStatus.textContent = 'Не удалось скопировать результат. Выделите его и скопируйте вручную.';
    }
});

baseCurrencySelect.addEventListener('change', () => loadRatesTable(false));
document.getElementById('refreshRates').addEventListener('click', () => loadRatesTable(true));

loadRatesTable(false);
