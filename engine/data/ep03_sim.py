"""Ep03: daily 100 RMB into the Nasdaq-100 for 20 years vs a 1.6% bank deposit.

Data: Yahoo Finance daily closes for ^NDX (price index, no dividends) and CNY=X (USD/CNY).
Method: 100 RMB per calendar day; money from non-trading days is invested at the next
trading day's close, converted at that day's exchange rate. No fees or taxes.
Bank: 100 RMB per day, compounding daily at an equivalent of 1.6% a year.
Writes ep03_ndx_dca.js (date, principal, value) for the animation.
Run: python3 -I engine/data/ep03_sim.py
"""
import json, datetime as dt, os
HERE = os.path.dirname(os.path.abspath(__file__))
def load(name):
    r = json.load(open(os.path.join(HERE, 'raw', name)))['chart']['result'][0]
    return {dt.datetime.fromtimestamp(t, dt.timezone.utc).date(): v
            for t, v in zip(r['timestamp'], r['indicators']['quote'][0]['close']) if v}
ndx, fx = load('NDX_yahoo.json'), load('USDCNY_yahoo.json'); fxd = sorted(fx)
START, END = dt.date(2006, 10, 20), dt.date(2026, 10, 19)
def fx_on(d): return fx[max(x for x in fxd if x <= d)]
units = principal = pending = 0; prev = START - dt.timedelta(1); rows = []
for d in sorted(k for k in ndx if START <= k <= END):
    pending += 100 * (d - prev).days; prev = d
    rate = fx_on(d); units += pending / rate / ndx[d]; principal += pending; pending = 0
    rows.append([d.isoformat(), principal, round(units * ndx[d] * rate)])
bank = 0; r = 1.016 ** (1 / 365) - 1; d = START
while d <= END: bank = bank * (1 + r) + 100; d += dt.timedelta(1)
print('days', len(rows), 'final', rows[-1], 'bank', round(bank))
open(os.path.join(HERE, 'ep03_ndx_dca.js'), 'w').write('const NDX_DCA = ' + json.dumps(rows, separators=(',', ':')) + ';\n')
