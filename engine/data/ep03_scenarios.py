"""Ep03 scenarios on the same backtest as ep03_sim.py (daily 100 RMB into the Nasdaq-100, 2006.10.20-2026.10.19).
Writes ep03_scenarios.js with sampled curves [calendar day, value] for each scenario and prints the key numbers.
Run: python3 -I engine/data/ep03_scenarios.py
"""
import json, datetime as dt, os, math
HERE = os.path.dirname(os.path.abspath(__file__))
def load(name, adj=False):
    r = json.load(open(os.path.join(HERE, 'raw', name)))['chart']['result'][0]
    c = r['indicators']['adjclose'][0]['adjclose'] if adj else r['indicators']['quote'][0]['close']
    return {dt.datetime.fromtimestamp(t, dt.timezone.utc).date(): v for t, v in zip(r['timestamp'], c) if v}
ndx, qqq, fx = load('NDX_yahoo.json'), load('QQQ_yahoo.json', True), load('USDCNY_yahoo.json')
fxd = sorted(fx); S, E = dt.date(2006, 10, 20), dt.date(2026, 10, 19)
fx_on = lambda d: fx[max(x for x in fxd if x <= d)]
days = [d for d in sorted(ndx) if S <= d <= E]
def run(px=ndx, start=S, fee=0.0, every=3):
    units = 0; pend = 0; prev = start - dt.timedelta(1); out = []; feed = (1 - fee) ** (1 / 252)
    for k, d in enumerate(d for d in days if d >= start and d in px):
        pend += 100 * (d - prev).days; prev = d; units *= feed
        units += pend / fx_on(d) / px[d]; pend = 0
        if k % every == 0 or d == days[-1]: out.append([(d - S).days, round(units * px[d] * fx_on(d))])
    return out
sc = {
  'late2011': run(start=dt.date(2011, 10, 20)), 'late2016': run(start=dt.date(2016, 10, 20)),
  'fee05': run(fee=.005), 'fee15': run(fee=.015), 'fee20': run(fee=.02), 'qqq': run(px=qqq),
}
for k, v in sc.items(): print(k, v[-1])
# fixed-rate daily DCA (math), for the "a few points of return" comparison
for r in (.04, .08, .12):
    i = (1 + r) ** (1 / 365) - 1; n = (E - S).days + 1; print('fixed', r, round(100 * ((1 + i) ** n - 1) / i))
# 2022 drawdown of the base DCA and its recovery
base = run(every=1); peak = max((x for x in base if x[0] <= (dt.date(2022, 1, 1) - S).days), key=lambda x: x[1])
trough = min((x for x in base if peak[0] <= x[0] <= (dt.date(2023, 1, 31) - S).days), key=lambda x: x[1])
rec = next(x for x in base if x[0] > trough[0] and x[1] >= peak[1])
f = lambda x: str(S + dt.timedelta(x[0]))
print('2022 peak', f(peak), peak[1], 'trough', f(trough), trough[1], 'recovered', f(rec))
open(os.path.join(HERE, 'ep03_scenarios.js'), 'w').write('const SCEN = ' + json.dumps(sc, separators=(',', ':')) + ';\n')
