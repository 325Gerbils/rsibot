
// Helper functions
fix = (val, digits) => Math.round(val * Math.pow(10, digits)) / Math.pow(10, digits)

scale = (val, min, max, target_min, target_max) => (val - min) / (max - min) * (target_max - target_min) + target_min

autoscale = (data, i, target_min, target_max) => scale(data[i], Math.min(...data), Math.max(...data), target_min, target_max)

setstyle = (ctx, style) => {
    ctx.setLineDash(style.dash)
    ctx.lineWidth = style.width
    ctx.strokeStyle = style.color
}

adjustCanvas = (canvas) => {
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

fixformobile = (canvas, data, len) => (canvas.width < 500 && data.length > 120) ? data.slice(-Math.min(data.length, len)) : data

// Drawing functions
plot = (canvas, ctx, data, style) => {
    ctx.beginPath()
    setstyle(ctx, style)
    for (i = 0; i < data.length; i++) {
        if (style.candles) {
            ctx.fillStyle = data[i] > data[i - 1] ? style.upcolor : style.downcolor
        }
        ctx.moveTo(i - 1 * canvas.width / data.length, canvas.height - autoscale(data, i - 1, 0, canvas.height))
        ctx.lineTo(i * canvas.width / data.length, canvas.height - autoscale(data, i, 0, canvas.height))
    }
    ctx.stroke()
}

drawtext = (canvas, ctx, text, data, i, font) => {
    ctx.font = font
    offset = (i * canvas.width / data.length) < canvas.width / 2 ? 10 : -(ctx.measureText(text) + 10)
    ctx.fillText(text, i * canvas.width / data.length + offset, canvas.height - 20)
}

vline = (canvas, ctx, data, i, style) => {
    ctx.beginPath()
    setstyle(ctx, style)
    ctx.moveTo(i * canvas.width / data.length, canvas.height)
    ctx.lineTo(i * canvas.width / data.length, 0)
    ctx.stroke()
}

hline = (canvas, ctx, percent, style) => {
    ctx.beginPath()
    setstyle(ctx, style)
    ctx.moveTo(0, canvas.height - canvas.height * percent)
    ctx.lineTo(canvas.width, canvas.height - canvas.height * percent)
    ctx.stroke()
}

// Data processing functions
updateState = (state) => {
    fetch("/json", {
        method: "POST",
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(state)
    })
        .then(response => response.text())
        .then((response) => {
            if (response.indexOf("Error: ") === 0) {
                alert(response)
                return
            }
            state = response
            elems.items().forEach((key, elem) => elem.value = parseInt(state.settings[key], 10))
        })
}

fetchState = function () {
    fetch("/json", {
        method: "GET"
    })
        .then(response => response.json())
        .then((response) => {
            if (response.indexOf("Error: ") === 0) {
                alert(response)
                return
            }
            state = response
            for ((key, elem) in elems.items()) {
                elem.value = parseInt(state.settings[key], 10)
            }
        })
}

document.onload = fetchState

// Setting up environment and data
state = {
    settings: {
        timestep: 15.0,
        amount: 0.30,
        rsi_low: 30,
        rsi_high: 70,
        rsi_period: 14,
        ema_period: 12,
        rsi_ema_period: 6,
        startup: 10,
        status: "running",
        dropoff: 240,
        allow_trading: false
    },
    data: [{
        timestamp: 0,
        price: 0,
        rsi: 0,
        ema: 0,
        rsi_ema: 0,
        traded: false,
    }]
}

var elems

elem_names = ["timestep", "amount", "rsi_low", "rsi_high", "rsi_period", "ema_period", "rsi_ema_period", "startup", "dropoff", "acct_value", "acct_value_btc", "allow_trading", "refresh_btn", "percent_change", "dollar_btc_change"]

elemNames.forEach((name) => elems[name] = document.getElementById(name))

elems.items().forEach((key, elem) => {
    elem.addEventListener("change", function () {
        state.settings[key] = parseInt(elem.value, 10)
        updateState(state)
    })
})

canvas = document.getElementById("canvas")
ctx = canvas.getContext("2d")

window.onresize = () => {
    adjustCanvas(canvas)
    draw(canvas, ctx)
}

adjustCanvas(canvas)

// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// Here be dragons
// testing ground for new syntax, never run
// draw(canvas, ctx)

data.filter(x => x === Math.min(...data) || x === Math.max(...data))
    .forEach(v => drawtext(canvas, ctx, "$" + fix(v, 2), data, data.indexOf(v), "16px Arial"))

data.filter(x => x === 1)
    .forEach((v) => {
        drawtext(canvas, ctx, "$" + fix(v, 2), data, data.indexOf(v), "16px Arial")
        vline(canvas, ctx, data, data.indexOf(v), {
            color: "#ff0000",
            width: 2
        })
    })

plot(canvas, ctx, state.data.map(x => x.price), {
    candles: true,
    width: 2,
    upcolor: "#00ff00",
    downcolor: "#ff0000"
})
plot(canvas, ctx, state.data.map(x => x.ema), {
    width: 2,
    color: "#0000ff",
    dash: [2, 2]
})

// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// -
// REFACTOR THIS IMMEDIATELY
setInterval(() => {
    fetchState()
    draw(canvas, ctx)

    acct_value_elem.innerHTML = "$" + state.acct_value.toFixed(2)
    acct_value_btc_elem.innerHTML = "(" + (state.acct_value / state.prices[state.prices.length - 1]).toFixed(5) + " &#8383;)"
    pchange = (state.acct_history[state.acct_history.length - 1] - state.acct_history[0]) / state.acct_history[0]
    percent_change_elem.innerHTML = (Math.abs(pchange) == pchange ? "+" : "") + (pchange * 100).toFixed(3) + "%"
    if (Math.abs(pchange) == pchange) {
        percent_change_elem.classList.add('green')
        percent_change_elem.classList.remove('red')
    } else {
        percent_change_elem.classList.add('red')
        percent_change_elem.classList.remove('green')
    }

    dollar_change = pchange * state.acct_history[state.acct_history.length - 1]
    btc_change = dollar_change / state.prices[state.prices.length - 1]
    dollar_btc_change_elem.innerHTML = (Math.abs(pchange) == pchange ? "+$" : "-$") + Math.abs(dollar_change).toFixed(3) + ", " + (Math.abs(pchange) == pchange ? "+" : "-") + Math.abs(btc_change).toFixed(6) + " &#8383;"
    if (Math.abs(pchange) == pchange) {
        dollar_btc_change_elem.classList.add('green')
        dollar_btc_change_elem.classList.remove('red')
    } else {
        dollar_btc_change_elem.classList.add('red')
        dollar_btc_change_elem.classList.remove('green')
    }

}, state.settings.timestep * 1000)


// THIS IS WHERE SHIT GETS UGLY
draw = (canvas, ctx) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "16px Arial"

    temp_state = state
    if (canvas.width < 500 && state.prices.length > 120) {
        // show only latest half of the data on mobile to be less overwhelming
        state.prices = state.prices.slice(-Math.min(state.prices.length, 120))
        state.rsi = state.rsi.slice(-Math.min(state.rsi.length, 120))
        state.ema = state.ema.slice(-Math.min(state.ema.length, 120))
        state.rsi_ema = state.rsi_ema.slice(-Math.min(state.rsi_ema.length, 120))
        state.signals = state.signals.slice(-Math.min(state.signals.length, 120) + 1)
        state.acct_history = state.acct_history.slice(-Math.min(state.acct_history.length, 120))
    }

    // Price data
    ctx.lineWidth = 2
    prices_min = Math.min(...state.prices)
    prices_max = Math.max(...state.prices)
    for (i = 0; i < state.prices.length; i++) {

        // bubbles
        ctx.fillStyle = "hsla(" + i * 255 / state.prices.length + ", 100%, 50%, 0.10)"
        ctx.strokeStyle = "hsla(" + (-i * 255 * 10) / state.prices.length + ", 100%, 50%, 1)"
        // ctx.strokeStyle = "#999"
        // ctx.beginPath()

        // r = 5 + Math.random() * (Math.random() > 0.8 ? 75 : 20)
        // r = Math.abs(state.prices[i] - state.prices[i - 1]) * 2 + 5
        // ctx.ellipse(i * canvas.width / state.prices.length, 25 + (canvas.height - 50) * (state.prices[i] - prices_max) / (prices_min - prices_max), r, r, 0, 0, Math.PI * 2, false)
        // ctx.fill()
        if (state.prices[i] > state.prices[i - 1]) {
            ctx.strokeStyle = "#0c0"
        } else if (state.prices[i] < state.prices[i - 1]) {
            ctx.strokeStyle = "#f00"
        } else {
            ctx.strokeStyle = "#ff0"
        }

        // line
        ctx.beginPath()
        ctx.moveTo((i - 1) * canvas.width / state.prices.length, 25 + (canvas.height - 50) * (state.prices[i - 1] - prices_max) / (prices_min - prices_max))
        ctx.lineTo(i * canvas.width / state.prices.length, 25 + (canvas.height - 50) * (state.prices[i] - prices_max) / (prices_min - prices_max))
        ctx.stroke()
        ctx.font = "12px Arial"
        ctx.fillStyle = "#fff"
        if (state.prices[i] == prices_min) {
            ctx.beginPath()
            ctx.ellipse((i) * canvas.width / state.prices.length, 25 + (canvas.height - 50) * (state.prices[i] - prices_max) / (prices_min - prices_max), 5, 5, 0, 0, Math.PI * 2, false)
            ctx.fill()
            offset = (i * canvas.width / state.prices.length) < canvas.width / 2 ? 10 : -(ctx.measureText("$" + Math.round(state.prices[i] * 1e2) / 1e2).width + 10)
            ctx.fillText("$" + Math.round(state.prices[i] * 1e2) / 1e2, i * canvas.width / state.prices.length + offset, 30 + (canvas.height - 50) * (state.prices[i] - prices_max) / (prices_min - prices_max))
        }
        if (state.prices[i] == prices_max) {
            ctx.beginPath()
            ctx.ellipse((i) * canvas.width / state.prices.length, 25 + (canvas.height - 50) * (state.prices[i] - prices_max) / (prices_min - prices_max), 5, 5, 0, 0, Math.PI * 2, false)
            ctx.fill()
            offset = (i * canvas.width / state.prices.length) < canvas.width / 2 ? 10 : -(ctx.measureText("$" + Math.round(state.prices[i] * 1e2) / 1e2).width + 10)
            ctx.fillText("$" + Math.round(state.prices[i] * 1e2) / 1e2, i * canvas.width / state.prices.length + offset, 30 + (canvas.height - 50) * (state.prices[i] - prices_max) / (prices_min - prices_max))
        }
    }

    // 70 line
    ctx.strokeStyle = "#666"
    ctx.beginPath()
    ctx.moveTo(0, 25 + ((canvas.height - 50) * (1 - state.settings.rsi_high / 100)))
    ctx.lineTo(canvas.width, 25 + ((canvas.height - 50) * (1 - state.settings.rsi_high / 100)))
    ctx.stroke()

    // 30 line
    ctx.strokeStyle = "#666"
    ctx.beginPath()
    ctx.moveTo(0, 25 + ((canvas.height - 50) * (1 - state.settings.rsi_low / 100)))
    ctx.lineTo(canvas.width, 25 + ((canvas.height - 50) * (1 - state.settings.rsi_low / 100)))
    ctx.stroke()

    // RSI line
    ctx.strokeStyle = "#ccc"
    ctx.lineWidth = 1.2
    rsi_min = Math.min(...state.rsi)
    rsi_max = Math.max(...state.rsi)
    for (i = 0; i < state.rsi.length; i++) {
        ctx.beginPath()
        ctx.moveTo((i - 1) * canvas.width / state.rsi.length, 25 + (canvas.height - 50) * (1 - state.rsi[i - 1] / 100))
        ctx.lineTo(i * canvas.width / state.rsi.length, 25 + (canvas.height - 50) * (1 - state.rsi[i] / 100))
        ctx.stroke()
    }

    for (i = 0; i < state.signals.length; i++) {
        // sell
        if (state.signals[i] == 0 && state.signals[i - 1] == -1) {
            ctx.fillStyle = "rgba(255,0,0,1)"
            ctx.beginPath()
            ctx.ellipse((i + 1) * canvas.width / state.prices.length, 25 + (canvas.height - 50) * (state.prices[i + 1] - prices_max) / (prices_min - prices_max), 5, 5, 0, 0, Math.PI * 2, false)
            ctx.fill()
            if (canvas.width > 1000) {
                ctx.strokeStyle = "rgba(255,0,0,1)"
                ctx.lineWidth = 1
                ctx.beginPath()
                ctx.moveTo((i + 1) * canvas.width / state.prices.length, 0)
                ctx.lineTo((i + 1) * canvas.width / state.prices.length, canvas.height)
                ctx.stroke()
            }
            ctx.fillStyle = "#fff"
            offset = (i * canvas.width / state.prices.length) < canvas.width / 2 ? 10 : -(ctx.measureText("$" + Math.round(state.prices[i + 1] * 1e2) / 1e2).width + 10)
            ctx.fillText("$" + Math.round(state.prices[i + 1] * 1e2) / 1e2, (i + 1) * canvas.width / state.prices.length + offset, 30 + (canvas.height - 50) * (state.prices[i + 1] - prices_max) / (prices_min - prices_max))
        }
        // buy
        if (state.signals[i] == 0 && state.signals[i - 1] == 1) {
            ctx.fillStyle = "rgba(0,255,0,1)"
            ctx.beginPath()
            ctx.ellipse((i + 1) * canvas.width / state.prices.length, 25 + (canvas.height - 50) * (state.prices[i + 1] - prices_max) / (prices_min - prices_max), 5, 5, 0, 0, Math.PI * 2, false)
            ctx.fill()
            if (canvas.width > 1000) {
                ctx.strokeStyle = "rgba(0,255,0,1)"
                ctx.lineWidth = 1
                ctx.beginPath()
                ctx.moveTo((i + 1) * canvas.width / state.prices.length, 0)
                ctx.lineTo((i + 1) * canvas.width / state.prices.length, canvas.height)
                ctx.stroke()
            }
            ctx.fillStyle = "#fff"
            offset = (i * canvas.width / state.prices.length) < canvas.width / 2 ? 10 : -(ctx.measureText("$" + Math.round(state.prices[i] * 1e2) / 1e2).width + 10)
            ctx.fillText("$" + Math.round(state.prices[i] * 1e2) / 1e2, (i + 1) * canvas.width / state.prices.length + offset, 30 + (canvas.height - 50) * (state.prices[i + 1] - prices_max) / (prices_min - prices_max))
        }
    }

    // graph account history
    /*
    acct_history_min = Math.min(...state.acct_history)
    acct_history_max = Math.max(...state.acct_history)
    ctx.strokeStyle = "#666"
    ctx.lineWidth = 1
    ctx.setLineDash([2,5])
    for (i = 0; i < state.acct_history.length; i++) {
        ctx.beginPath()
        ctx.moveTo((i - 1) * canvas.width / state.acct_history.length, 25 + (canvas.height - 50) * (state.acct_history[i - 1] - acct_history_max) / (acct_history_min - acct_history_max))
        ctx.lineTo(i * canvas.width / state.acct_history.length, 25 + (canvas.height - 50) * (state.acct_history[i] - acct_history_max) / (acct_history_min - acct_history_max))
        ctx.stroke()
    }
    ctx.setLineDash([])
    */

    // graph ema
    ctx.lineWidth = 1
    // ctx.setLineDash([2,2])
    for (i = 0; i < state.prices.length; i++) {
        ctx.setLineDash([])
        if (state.ema[i] > state.ema[i - 1]) {
            ctx.strokeStyle = "#0c0"
        } else if (state.ema[i] < state.ema[i - 1]) {
            ctx.strokeStyle = "#f00"
        } else {
            ctx.strokeStyle = "#9cf"
        }
        ctx.beginPath()
        ctx.moveTo(((i + state.prices.length - state.ema.length) - 1) * canvas.width / state.prices.length, 25 + (canvas.height - 50) * (state.ema[i - 1] - prices_max) / (prices_min - prices_max))
        ctx.lineTo((i + state.prices.length - state.ema.length) * canvas.width / state.prices.length, 25 + (canvas.height - 50) * (state.ema[i] - prices_max) / (prices_min - prices_max))
        ctx.stroke()

        // ctx.setLineDash([1,1])
        // if (state.ema[i] > state.ema[i - 1] && state.ema[i - 1] < state.ema[i - 2]) {
        //     ctx.beginPath()
        //     ctx.moveTo((i) * canvas.width / state.prices.length, 0)
        //     ctx.lineTo((i) * canvas.width / state.prices.length, canvas.height)
        //     ctx.stroke()
        // }
        // if (state.ema[i] < state.ema[i - 1] && state.ema[i - 1] > state.ema[i - 2]) {
        //     ctx.beginPath()
        //     ctx.moveTo((i) * canvas.width / state.prices.length, 0)
        //     ctx.lineTo((i) * canvas.width / state.prices.length, canvas.height)
        //     ctx.stroke()
        // }
    }
    ctx.setLineDash([])

    // graph rsi ema
    ctx.lineWidth = 2
    ctx.setLineDash([2, 2])
    for (i = 0; i < state.prices.length; i++) {
        if (state.rsi[i] > state.rsi_ema[i]) {
            ctx.strokeStyle = "#f60"
        } else {
            ctx.strokeStyle = "#06f"
        }
        ctx.beginPath()
        ctx.moveTo(((i + state.prices.length - state.rsi_ema.length) - 1) * canvas.width / state.prices.length, 25 + (canvas.height - 50) * (1 - state.rsi_ema[i - 1] / 100))
        ctx.lineTo((i + state.prices.length - state.rsi_ema.length) * canvas.width / state.prices.length, 25 + (canvas.height - 50) * (1 - state.rsi_ema[i] / 100))
        ctx.stroke()
    }
    ctx.setLineDash([])

    // labels
    // ctx.fillStyle = "#eee"
    // ctx.fillText("Price: " + Math.round(state.prices[state.prices.length - 1] * 1e2) / 1e2, 25, 25)
    // ctx.fillText("RSI: " + Math.round(state.rsi[state.rsi.length - 1] * 1e1) / 1e1, 25, 50)
    // ctx.lineWidth = 2

    // draw other stuff
    trades_box = document.getElementById("trades_box")
    trades_box.innerHTML = ""
    for (i = state.trades.length - 1; i >= 0; i--) {
        color = state.trades[i].action === "BUY" ? "green" : "red"
        plainEnglishAction = state.trades[i].action === "BUY" ? "Bought" : "Sold"
        trades_box.innerHTML += ("<h3><span class=\"" + color + "\" > " +
            plainEnglishAction +
            "</span> " +
            state.trades[i].amount.toFixed(8) +
            " ($" +
            (state.trades[i].amount * state.trades[i].price).toFixed(2) +
            ") at $" + state.trades[i].price.toFixed(2) +
            "</h3>")
    }

    // because on mobile i overwrite the arrays to display half the data
    // and i dont want that edit leaking into the python db
    state = temp_state
}
