import robin_stocks.robinhood as rs
import tulipy as ti
import numpy as np
from time import sleep
import json

frames = 0
state = {
    "settings": {
        "timestep": 15.0,
        "amount": 0.30,
        "rsi_low": 30,
        "rsi_high": 70,
        "rsi_period": 14,
        "ema_period": 12,
        "rsi_ema_period": 6,
        "startup": 10,
        "status": "running",
        "dropoff": 240,
        "allow_trading": false
    },
    "data": [{
        "timestamp": 0,
        "price": 0,
        "rsi": 0,
        "ema": 0,
        "rsi_ema": 0,
        "traded": false,
    }]
}

def buying_power():
    try:
        return float(rs.profiles.load_account_profile(info='crypto_buying_power'))
    except:
        return buying_power()


def held_btc():
    try:
        return float([item for item in rs.crypto.get_crypto_positions(info=None) if item['currency']['code'] == 'BTC'][0]['quantity_available'])
    except:
        return held_btc()

def current_price():
    try:
        return float(rs.crypto.get_crypto_quote('BTC', info='mark_price'))
    except:
        return current_price()


def acct_value():
    return buying_power() + held_btc()*current_price()


def save_state():
    global state
    with open('state.json', 'w') as outfile:
        json.dump(state, outfile)

def load_state():
    global state
    with open('state.json', 'r') as infile:
        state = json.load(infile)


def buy():
    global state
    amt = buying_power()*state["settings"]["amount"]
    p = current_price()
    if state["settings"]["allow_trading"]:
        rs.orders.order_buy_crypto_by_price('BTC', amt, timeInForce='gtc')
        state["signals"].append(1)
        state["trades"].append({
            "amount": amt/p,
            "price": p,
            "action": "BUY"
        })
    else:
        state["signals"].append(0)


def sell():
    global state
    amt = held_btc()*state["settings"]["amount"]
    p = current_price()

    if state["settings"]["allow_trading"]:
        rs.orders.order_sell_crypto_by_price('BTC', amt*p, timeInForce='gtc')
        state["signals"].append(-1)
        state["trades"].append({
            "amount": amt,
            "price": p,
            "action": "SELL"
        })
    else:
        state["signals"].append(0)


rs.login(username="benjamincooley81@gmail.com",
         password="", expiresIn=86400, by_sms=True)

# save_state()

while True:

    load_state()

    # update price list
    state["prices"].append(current_price())

    # update RSI history
    period = int(state["settings"]["rsi_period"])
    if frames < period and len(state["rsi"]) <= period:
        state["rsi"].append(0)
    else:
        rsi = ti.rsi(np.array(state["prices"], dtype='float64'), period=period)
        last_rsi = rsi[-1]
        state["rsi"].append(last_rsi)

    # update acct_history
    state["acct_value"] = acct_value()
    state["acct_history"].append(state["acct_value"])

    # update ema
    ema = ti.ema(np.array(state["prices"], dtype='float64'), int(state["settings"]["ema_period"]))
    # print(ema)
    state["ema"].append(ema[-1])

    # update rsi ema
    rsi_ema = ti.ema(np.array(state["rsi"], dtype='float64'), int(state["settings"]["rsi_ema_period"]))
    state["rsi_ema"].append(rsi_ema[-1])

    # truncate data to save memory/bandwidth
    d = state["settings"]["dropoff"]
    state["prices"] = state["prices"][-d:]
    state["rsi"] = state["rsi"][-d:]
    state["signals"] = state["signals"][-d:]
    state["acct_history"] = state["acct_history"][-d:]
    state["ema"] = state["ema"][-d:]
    state["rsi_ema"] = state["rsi_ema"][-d:]

    # determine buy or sell
    if len(state["rsi"]) > 1:
        # when rsi comes back to <high from >high, sell
        if state["rsi"][-1] <= state["settings"]["rsi_high"] and state["rsi"][-2] >= state["settings"]["rsi_high"]:
            if frames > state["settings"]["startup"]:
                sell()
        # when rsi comes back to >low from <low, buy
        elif state["rsi"][-1] >= state["settings"]["rsi_low"] and state["rsi"][-2] <= state["settings"]["rsi_low"]:
            if frames >= state["settings"]["startup"]:
                buy()
        else:
            state["signals"].append(0)  # no buy or sell
    else:
        state["signals"].append(0)  # no buy or sell

    frames += 1
    print("step %s", frames)
    save_state()

    sleep(state["settings"]["timestep"])

    