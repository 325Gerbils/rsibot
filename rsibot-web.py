import robin_stocks.robinhood as rs
import tulipy as ti
import numpy as np
from time import sleep
import json

frames = 0
state = {
    "settings": {
        "timestep": 15.0,  # default 15
        "amount": 0.30,  # default 30
        "rsi_low": 30,  # default 30
        "rsi_high": 70,  # default 70
        "rsi_period": 14,  # default 14
        "startup": 0,  # default 10
        "dropoff": 50,  # default 50
        "status": "running",
    },
    "prices": [],
    "rsi": [],
    "signals": [],
    "trades": [],
    "acct_value": 0
}


def buying_power():
    return float(rs.profiles.load_account_profile(info='crypto_buying_power'))


def held_btc():
    return float([item for item in rs.crypto.get_crypto_positions(info=None) if item['currency']['code'] == 'BTC'][0]['quantity_available'])


def current_price():
    return float(rs.crypto.get_crypto_quote('BTC', info='mark_price'))


def acct_value():
    return float(rs.profiles.load_account_profile(info=''))


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


while True:

    load_state()

    # update price list
    state["prices"].append(current_price())

    # update RSI history
    period = int(state["settings"]["rsi_period"])
    if frames < period and len(state["rsi"]) <= period:
        state["rsi"].append(0)
    else:
        rsi = ti.rsi(np.array(state["prices"]), period=period)
        last_rsi = rsi[-1]
        state["rsi"].append(last_rsi)

    # truncate data to save memory/bandwidth
    if len(state["prices"]) > state["settings"]["dropoff"]:
        state["prices"].pop(0)
    if len(state["rsi"]) > state["settings"]["dropoff"]:
        state["rsi"].pop(0)
    if len(state["signals"]) > state["settings"]["dropoff"]:
        state["signals"].pop(0)

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

    # wait til next loop
    frames += 1
    save_state()

    sleep(state["settings"]["timestep"])
