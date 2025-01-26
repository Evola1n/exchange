function convertCurrency() {
    const fromCurrency = document.getElementById('fromCurrency').value;
    const toCurrency = document.getElementById('toCurrency').value;
    const amount = document.getElementById('amount').value;



    // Проверяем, что введены числа и они больше нуля
    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        showErrorMessage('Please enter a valid positive number for amount.');
        return;
    }

    fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`)
        .then(response => response.json())
        .then(data => {
            // Проверяем, что получен корректный ответ с данными о курсах валют
            if (!data || !data.rates || isNaN(parseFloat(data.rates[toCurrency]))) {
                throw new Error('Invalid currency data received.');
            }

            const exchangeRate = data.rates[toCurrency];
            const convertedAmount = amount * exchangeRate;
            document.getElementById('result').textContent = `${amount} ${fromCurrency} = ${convertedAmount.toFixed(2)} ${toCurrency}`;
            document.getElementById('error-message').textContent = ''; // Очищаем сообщение об ошибке, если оно было
        })
        .catch(error => {
            console.error('Error fetching currency exchange rate:', error);
            showErrorMessage('Failed to fetch currency exchange rate. Please try again later.');
        });
}
