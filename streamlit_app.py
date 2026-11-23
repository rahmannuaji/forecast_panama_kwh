"""Versi Streamlit dari dashboard GitHub Pages. Membaca dashboard/data.js yang diekspor notebook (Tahap 10)."""
import json
from pathlib import Path

import altair as alt
import numpy as np
import pandas as pd
import streamlit as st

ROOT = Path(__file__).parent
st.set_page_config(page_title="Atlas Beban Panama", layout="wide")


@st.cache_data
def load():
    s = (ROOT / "dashboard" / "data.js").read_text(encoding="utf-8")
    return json.loads(s[s.index("{"): s.rindex("}") + 1])


D = load()
META, BT, W, SC, FUT = D["meta"], D["backtest"], D["weather"], D["scenario"], D["future"]
split = lambda d: pd.DataFrame(d["data"], index=d["index"], columns=d["columns"])
overall, by_reg, dm, info = split(D["overall"]), split(D["by_regime"]), split(D["dm"]), split(D["info"])
INK, RED = "#1d1d1b", "#c8372d"
MODELS = {"Chronos-2": "#a3366f", "Chronos-Bolt": "#a8690c", "TimesFM-2.0": "#3d8a4a", "XGBoost": "#5a4aa8"}
CITIES = {"Tocumen": ("toc", "#5e5b53"), "Santiago": ("san", "#7d796d"), "David": ("dav", "#959184")}
WVAR = {"Suhu (°C)": "T2M", "Kelembapan": "QV2M", "Presipitasi cair": "TQL", "Angin (m/s)": "W2M"}
idn = lambda v, d=1: "–" if v is None or pd.isna(v) else f"{v:,.{d}f}".replace(",", "_").replace(".", ",").replace("_", ".")
Y_ID = "replace(replace(replace(format(datum.value, ',.0f'), ',', '_'), '.', ','), '_', '.')"
yax = lambda f="MWh:Q", t="MWh": alt.Y(f, title=t, scale=alt.Scale(zero=False), axis=alt.Axis(labelExpr=Y_ID))
show = lambda ch: st.altair_chart(ch.configure_view(strokeWidth=0).configure_axis(labelColor="#45443f", titleColor="#45443f", domainColor=INK, gridColor="#e4dfd1"), width="stretch")


def mcolor(names):
    rng = [MODELS.get(n.split(" ")[0], INK) if n != "Aktual" else INK for n in names]
    return alt.Color("seri:N", scale=alt.Scale(domain=names, range=rng), legend=alt.Legend(orient="top", title=None))


def variant(m, kov):
    return ("Chronos-2 + kovariat" if kov else "Chronos-2 univariat") if m == "Chronos-2" else m


def lines(df, x, x_title, names, dash=None):
    ch = alt.Chart(df).mark_line(strokeWidth=2).encode(alt.X(x, title=x_title), yax(), mcolor(names), tooltip=[x, "seri", alt.Tooltip("MWh:Q", format=",.1f")])
    if dash is not None:
        ch = ch.encode(strokeDash=alt.StrokeDash("seri:N", scale=alt.Scale(domain=names, range=dash), legend=None))
    return ch.properties(height=360)


st.title("Atlas Beban Panama")
st.caption(f"Peramalan beban listrik nasional Panama 24 jam ke depan dengan Chronos-2, Chronos-Bolt, TimesFM 2.0, dan XGBoost. "
           f"{idn(META['n_obs'], 0)} jam data, {META['n_origin']} hari uji.")
kov = st.toggle("Chronos-2 memakai kovariat cuaca dan kalender", value=True)
tabs = st.tabs(["Beranda", "Eksplorasi data", "Cuaca tiga kota", "Performa model", "Hasil prediksi"])

# ------------------------------------------------------------------ Beranda
with tabs[0]:
    best = META["best"]
    ht = D["holiday_test"]
    daily = pd.DataFrame({"tanggal": pd.to_datetime(W["daily"]["dates"]), "MWh": W["daily"]["load"]})
    nrm = daily[(daily.tanggal >= META["test_start"]) & (daily.tanggal < META["covid_start"])].MWh.mean()
    cov = daily[(daily.tanggal >= META["covid_start"]) & (daily.tanggal <= "2020-06-26")].MWh.mean()
    c = st.columns(4)
    c[0].metric("MAPE model terbaik", idn(overall.loc[best, "MAPE (%)"], 2) + "%", help=best)
    c[1].metric("Efek hari libur", idn((ht["libur"] / ht["biasa"] - 1) * 100) + "%")
    c[2].metric("Penurunan saat COVID-19", idn((cov / nrm - 1) * 100) + "%")
    c[3].metric("Hari uji", META["n_origin"])
    st.markdown(f"**Model terpilih: {best}.** Yang diramal hanya satu variabel, yaitu beban listrik nasional per jam (MWh). Cuaca, hari libur, dan masa sekolah dipakai sebagai kovariat.")
    cols = st.columns(3)
    for col, (city, (code, color)) in zip(cols, CITIES.items()):
        df = pd.DataFrame({"bulan": range(1, 13), "Suhu (°C)": W["monthly"]["T2M_" + code], "Presipitasi": W["monthly"]["TQL_" + code]})
        t = alt.Chart(df).mark_line(color=RED, point=True).encode(alt.X("bulan:O", title=None), alt.Y("Suhu (°C):Q", scale=alt.Scale(zero=False))).properties(height=150, title=city)
        p = alt.Chart(df).mark_bar(color="#2b6cb0", opacity=0.6).encode(alt.X("bulan:O", title="Bulan"), alt.Y("Presipitasi:Q")).properties(height=70)
        with col:
            show(alt.vconcat(t, p))
    band = alt.Chart(pd.DataFrame({"a": [pd.Timestamp(META["test_start"])], "b": [daily.tanggal.max()]})).mark_rect(color=INK, opacity=0.07).encode(x="a:T", x2="b:T")
    show((band + alt.Chart(daily).mark_line(color=INK, strokeWidth=1).encode(alt.X("tanggal:T", title=None), yax(), tooltip=["tanggal:T", "MWh:Q"])).properties(height=300, title="Beban harian 2015–2020 (area abu-abu: periode uji)"))

# ------------------------------------------------------------------ Eksplorasi
with tabs[1]:
    yr = split(D["yearly"])
    st.subheader("Beban per jam, satu minggu")
    start = st.date_input("Tanggal awal", value=pd.Timestamp("2020-04-06"), min_value=pd.Timestamp("2015-01-03"), max_value=pd.Timestamp("2020-06-20"))
    t0 = pd.Timestamp(D["hourly"]["start"])
    i0 = int((pd.Timestamp(start) + pd.Timedelta(hours=1) - t0) / pd.Timedelta(hours=1))
    wk = pd.DataFrame({"waktu": pd.date_range(t0 + pd.Timedelta(hours=i0), periods=168, freq="h"), "MWh": D["hourly"]["values"][i0:i0 + 168]})
    show(alt.Chart(wk).mark_line(color=INK).encode(alt.X("waktu:T", title=None), yax(), tooltip=["waktu:T", "MWh:Q"]).properties(height=300))
    c1, c2 = st.columns(2)
    with c1:
        z = pd.DataFrame(D["heat"]["z"], columns=["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]).reset_index(names="jam").melt("jam", var_name="hari", value_name="MWh")
        show(alt.Chart(z).mark_rect().encode(alt.X("hari:N", sort=None, title=None), alt.Y("jam:O"), alt.Color("MWh:Q", scale=alt.Scale(scheme="blues")), tooltip=["hari", "jam", alt.Tooltip("MWh:Q", format=",.0f")]).properties(height=420, title="Rata-rata beban jam × hari (2019)"))
    with c2:
        hp = pd.DataFrame({"jam": range(24), "Hari biasa": D["holiday_profile"]["biasa"], "Libur nasional": D["holiday_profile"]["libur"]}).melt("jam", var_name="seri", value_name="MWh")
        show(alt.Chart(hp).mark_line(strokeWidth=2).encode(alt.X("jam:O"), yax(), alt.Color("seri:N", scale=alt.Scale(range=[INK, RED]), legend=alt.Legend(orient="top", title=None))).properties(height=300, title="Profil harian: hari biasa vs libur"))
        st.caption(f"Uji t Welch (hari kerja): libur {idn(ht['libur'])} vs biasa {idn(ht['biasa'])} MWh, t = {idn(ht['t'], 2)}, p = {ht['p']:.1e}.")
    st.dataframe(yr.rename(columns={"mean": "Rata-rata", "std": "Simp. baku", "min": "Min", "max": "Maks", "count": "Jam", "tumbuh_%": "Tumbuh (%)"}).round(2), width="stretch")
    st.caption(f"Kekuatan MSTL (2019): tren {D['strength']['Tren']}, harian {D['strength']['seasonal_24']}, mingguan {D['strength']['seasonal_168']}. ACF lag 24 = {D['acf'][24]:.2f}, lag 168 = {D['acf'][168]:.2f}.")

# ------------------------------------------------------------------ Cuaca
with tabs[2]:
    c1, c2, c3 = st.columns(3)
    city = c1.radio("Kota", list(CITIES), horizontal=True)
    vlab = c2.selectbox("Variabel", list(WVAR))
    kerja = c3.radio("Hari", ["Hari kerja biasa, sebelum COVID", "Semua hari"], horizontal=True) != "Semua hari"
    col = f"{WVAR[vlab]}_{CITIES[city][0]}"
    wd = pd.DataFrame({"tanggal": pd.to_datetime(W["daily"]["dates"]), "x": W["daily"][col], "MWh": W["daily"]["load"], "libur": W["daily"]["holiday"]})
    if kerja:
        wd = wd[(wd.tanggal.dt.dayofweek < 5) & (wd.libur == 0) & (wd.tanggal < META["covid_start"])]
    r = np.corrcoef(wd.x, wd.MWh)[0, 1]
    pts = alt.Chart(wd).mark_circle(size=22, opacity=0.45, color=CITIES[city][1]).encode(alt.X("x:Q", title=f"{vlab}, {city}", scale=alt.Scale(zero=False)), yax("MWh:Q", "Beban harian (MWh)"), tooltip=["tanggal:T", "x:Q", "MWh:Q"])
    show((pts + pts.transform_regression("x", "MWh").mark_line(color=INK)).properties(height=380, title=f"{vlab} harian vs beban harian ({len(wd)} hari, r = {r:.2f})"))
    corr, wr = split(W["corr"]), split(W["r_within"])
    tab = pd.DataFrame({c: {v: corr.loc[f"{k}_{CITIES[c][0]}", "r_per_jam"] for v, k in WVAR.items()} for c in CITIES})
    tab2 = wr.rename(index={"Suhu (°C)": "Suhu (°C)"})
    c1, c2 = st.columns(2)
    c1.markdown("**Korelasi per jam**"); c1.dataframe(tab.round(3), width="stretch")
    c2.markdown("**Korelasi di jam yang sama** (pola harian dihapus)"); c2.dataframe(tab2.round(3), width="stretch")
    rh = pd.DataFrame(W["r_hour"]).reset_index(names="jam").melt("jam", var_name="kota", value_name="r")
    show(alt.Chart(rh).mark_line(point=True).encode(alt.X("jam:O"), alt.Y("r:Q", title="r Pearson"), alt.Color("kota:N", scale=alt.Scale(domain=list(CITIES), range=[v[1] for v in CITIES.values()]), legend=alt.Legend(orient="top", title=None))).properties(height=280, title="Korelasi suhu–beban di dalam jam yang sama"))

# ------------------------------------------------------------------ Performa
with tabs[3]:
    reg = st.radio("Periode", ["Semua", "Normal", "COVID-19"], horizontal=True)
    tbl = overall if reg == "Semua" else by_reg[by_reg.regime == reg].set_index("model").drop(columns="regime")
    st.dataframe(tbl.sort_values("MAE").round(3), width="stretch")
    rows = [variant(m, kov) for m in MODELS]
    bar = tbl.loc[rows, ["MAPE (%)"]].reset_index(names="model")
    show(alt.Chart(bar).mark_bar(cornerRadiusEnd=4).encode(alt.X("MAPE (%):Q"), alt.Y("model:N", sort="x", title=None), alt.Color("model:N", scale=alt.Scale(domain=rows, range=list(MODELS.values())), legend=None), tooltip=["model", alt.Tooltip("MAPE (%):Q", format=".2f")]).properties(height=220, title=f"MAPE per model ({reg})"))
    days = [i for i, g in enumerate(BT["regime"]) if reg == "Semua" or g == reg]
    A = np.array(BT["actual"])[days]
    hz = pd.DataFrame({m: np.abs(np.array(BT["mean"][variant(m, kov)])[days] - A).mean(0) for m in MODELS}, index=range(1, 25)).reset_index(names="h").melt("h", var_name="seri", value_name="MWh")
    show(lines(hz, "h:O", "Horizon (jam)", list(MODELS), [[1, 0], [7, 4], [2, 3], [10, 3, 2, 3]]).properties(title="MAE menurut horizon"))
    st.markdown("**Uji Diebold-Mariano** (Model A = Chronos-2 + kovariat; p < 0,05 berarti selisihnya signifikan)")
    st.dataframe(dm[dm.Regime == reg].round(4), width="stretch", hide_index=True)
    st.dataframe(info.round(1), width="stretch")

# ------------------------------------------------------------------ Prediksi
with tabs[4]:
    st.subheader("1. Ramalan vs aktual pada hari uji")
    day = st.select_slider("Tanggal", options=BT["origins"], value="2020-04-10")
    i = BT["origins"].index(day)
    jam = [f"{h:02d}.00" for h in range(1, 25)]
    df = pd.DataFrame({"jam": jam, "Aktual": BT["actual"][i], **{m: BT["mean"][variant(m, kov)][i] for m in MODELS}}).melt("jam", var_name="seri", value_name="MWh")
    names = ["Aktual", *MODELS]
    show(lines(df, "jam:O", None, names, [[1, 0], [1, 0], [7, 4], [2, 3], [10, 3, 2, 3]]).properties(title=f"{day} · {BT['regime'][i]}" + (" · libur nasional" if BT["holiday"][i] else "")))

    st.subheader("2. Simulasi suhu")
    c1, c2, c3, c4 = st.columns(4)
    k = c1.selectbox("Hari", range(len(SC["days"])), index=7, format_func=lambda j: SC["days"][j] + (" (masa depan)" if SC["actual"][j] is None else ""))
    smod = c2.radio("Model", ["Chronos-2 + kovariat", "XGBoost"], horizontal=True)
    scity = c3.radio("Kota", list(SC["xgb"]), horizontal=True)
    off = c4.slider("Perubahan suhu (°C)", -3, 3, 2)
    src = SC["c2" if smod.startswith("Chronos") else "xgb"][scity]
    base, scen = np.array(src["0"][k]), np.array(src[str(off)][k])
    s = {"Suhu asli": base, f"Suhu {off:+d} °C": scen} | ({"Aktual": SC["actual"][k]} if SC["actual"][k] else {})
    sd = pd.DataFrame({"jam": jam, **s}).melt("jam", var_name="seri", value_name="MWh")
    show(alt.Chart(sd).mark_line(strokeWidth=2).encode(alt.X("jam:O", title=None), yax(), alt.Color("seri:N", scale=alt.Scale(domain=list(s), range=["#8a877c", MODELS["Chronos-2" if smod.startswith("Chronos") else "XGBoost"], INK][:len(s)]), legend=alt.Legend(orient="top", title=None))).properties(height=340))
    d = scen - base
    c = st.columns(3)
    c[0].metric("Perubahan rata-rata", idn(d.mean()) + " MWh")
    c[1].metric("Relatif", idn(d.mean() / base.mean() * 100, 2) + "%")
    c[2].metric("Perubahan puncak", idn(scen.max() - base.max()) + " MWh")
    st.dataframe(split(SC["sens"]).round(2), width="stretch")

    st.subheader("3. Ramalan 24 jam setelah akhir data (27 Juni 2020)")
    st.caption("Cuaca masa depan diasumsikan sama dengan 24 jam terakhir; 27 Juni 2020 diasumsikan bukan hari libur.")
    fd = pd.DataFrame({"waktu": pd.to_datetime(FUT["ts"]), **{m: FUT["mean"][variant(m, kov)] for m in MODELS}})
    hd = pd.DataFrame({"waktu": pd.to_datetime(FUT["hist_ts"][-96:]), "Aktual": FUT["hist"][-96:]})
    allf = pd.concat([hd.melt("waktu", var_name="seri", value_name="MWh"), fd.melt("waktu", var_name="seri", value_name="MWh")])
    show(alt.Chart(allf).mark_line(strokeWidth=2).encode(alt.X("waktu:T", title=None), yax(), mcolor(names), tooltip=["waktu:T", "seri", alt.Tooltip("MWh:Q", format=",.0f")]).properties(height=340))
    st.dataframe(fd.set_index("waktu").round(0), width="stretch")

st.caption("Sumber data: Aguilar Madrid & Antonio (2021), Information 12(2), 50. Analisis lengkap: notebook dan LAPORAN_ANALISIS.md.")
