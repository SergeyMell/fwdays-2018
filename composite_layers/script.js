var intervalID;

function startCounting() {
    if (typeof intervalID !== 'undefined') {
        return;
    }
    intervalID = setInterval(function () {
        let sum = 0;
        for (let i = 0; i < 100000; i++) {
            sum += eval('Math.sqrt(Math.sqrt(i)) * Math.random()');
        }
        appendData(sum);
    }, 100);
}

function stopCounting() {
    clearInterval(intervalID);
    intervalID = undefined;
}