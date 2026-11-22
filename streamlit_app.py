import json
from pathlib import Path

import altair as alt
import pandas as pd
import streamlit as st

ROOT = Path(__file__).parent
st.set_page_config(page_title="Peramalan Beban Listrik Panama", layout="wide")


@st.cache_data
def load():
    s = (ROOT / "dashboard" / "data.js").read_text(encoding="utf-8")
    return json.loads(s[s.index("{"):s.rindex("}") + 1])


D = load()
META, BT = D["meta"], D["backtest"]
MODELS, COL, BEST = META["models"], META["colors"], META["best"]
split = lambda d: pd.DataFrame(d["data"], index=d["index"], columns=d["columns"])
overall, by_reg, dm, info = split(D["overall"]), split(D["by_regime"]), split(D["dm"]), split(D["info"])
NPAR = {"SARIMAX-W": 10, "SARIMAX-DHR": 29, "SNaive-168": 0}
INK, MUTED, SHADE = "#1d1d1f", "#8a8984", "#eceef1"


def num(x, d=2):
    return "-" if x is None or pd.isna(x) else f"{x:,.{d}f}".replace(",", "_").replace(".", ",").replace("_", ".")


def table(df, digits):
    df = df.copy()
    for c, d in digits.items():
        if c in df:
            df[c] = df[c].map(lambda v, d=d: num(v, d))
    st.dataframe(df, hide_index=True, width="stretch", column_config={c: st.column_config.TextColumn(c, alignment="right") for c in digits if c in df})


Y_ID = "replace(replace(replace(format(datum.value, ',.0f'), ',', '_'), '.', ','), '_', '.')"
y_axis = lambda field="MWh:Q", title="MWh": alt.Y(field, title=title, scale=alt.Scale(zero=False), axis=alt.Axis(labelExpr=Y_ID, grid=True, gridOpacity=0.5))
color = lambda ms: alt.Color("model:N", scale=alt.Scale(domain=ms, range=[COL[m] for m in ms]), legend=alt.Legend(orient="top", title=None, columns=4))
show = lambda ch: st.altair_chart(ch.configure_view(strokeWidth=0).configure_axis(labelColor="#5b5b60", titleColor="#5b5b60", domainColor="#d4d6da"), width="stretch")


def metric_row(m, regime):
    return overall.loc[m] if regime == "Semua" else by_reg[(by_reg.regime == regime) & (by_reg.model == m)].iloc[0]


st.title("Peramalan Beban Listrik Panama")
st.caption(f"{META['n_obs']:,}".replace(",", ".") + f" observasi per jam ({META['start'][:10]} s.d. {META['end'][:10]}), "
           f"{META['n_origin']} origin backtest harian, horizon {META['H']} jam. Perbandingan foundation model deret waktu dengan model statistik dan machine learning.")

tabs = st.tabs(["Ringkasan", "Data", "Model", "Evaluasi", "Backtest", "Uji DM", "24 jam ke depan", "Metodologi"])

with tabs[0]:
    b, bn, bc, sn = metric_row(BEST, "Semua"), metric_row(BEST, "Normal"), metric_row(BEST, "COVID-19"), overall.loc["SNaive-168"]
    fm = overall.loc[["Chronos-2", "Chronos-Bolt", "TimesFM-2.0"]].sort_values("MAE").iloc[0]
    dom = overall.loc[["XGBoost", "SARIMAX-W", "SARIMAX-DHR"]].sort_values("MAE").iloc[0]
    sig = dm[(dm["Model A"] == BEST) & (dm.Regime == "Semua")]
    n_sig = int(((sig["p-value"] < 0.05) & (sig.DM < 0)).sum())
    st.write(f"Model terbaik menurut MAE keseluruhan adalah **{BEST}**. Angka dihitung dari {META['n_origin'] * META['H']:,} pasangan ramalan dan aktual per model.".replace(",", "."))
    tiles = [(f"MAPE {BEST}", f"{num(b['MAPE (%)'])}%", f"MAE {num(b.MAE, 1)} MWh, MASE {num(b.MASE, 3)}"),
             ("Penurunan MAE terhadap seasonal naive", f"{num(b['Skill vs SNaive (%)'], 1)}%", f"SNaive-168: MAPE {num(sn['MAPE (%)'])}%"),
             (f"MAPE {fm.name}", f"{num(fm['MAPE (%)'])}%", f"Foundation model univariat terbaik. Pembanding domain terbaik: {dom.name}, MAPE {num(dom['MAPE (%)'])}%"),
             (f"MAPE {BEST}: Normal ke COVID-19", f"{num(bn['MAPE (%)'])}% → {num(bc['MAPE (%)'])}%", f"{n_sig} dari {len(sig)} pembanding kalah signifikan (uji DM, alpha 5%)")]
    for col, (label, value, note) in zip(st.columns(4), tiles):
        with col.container(border=True):
            st.metric(label, value)
            st.caption(note)

with tabs[1]:
    st.write("Beban memiliki musiman harian dan mingguan yang sangat kuat, tren naik sampai 2019, serta penurunan tajam sejak pertengahan Maret 2020.")
    daily = pd.DataFrame({"tanggal": pd.to_datetime(D["daily"]["dates"]), "MWh": D["daily"]["values"]})
    test = alt.Chart(pd.DataFrame({"a": [pd.Timestamp("2020-01-01")], "b": [daily.tanggal.max()]})).mark_rect(color=SHADE).encode(x="a:T", x2="b:T")
    covid = alt.Chart(pd.DataFrame({"t": [pd.Timestamp(META["covid_start"])]})).mark_rule(color=INK).encode(x="t:T")
    line = alt.Chart(daily).mark_line(strokeWidth=1.2, color=COL[MODELS[0]]).encode(
        x=alt.X("tanggal:T", title=None, axis=alt.Axis(format="%Y", tickCount="year")), y=y_axis(), tooltip=[alt.Tooltip("tanggal:T", format="%Y-%m-%d"), alt.Tooltip("MWh:Q", format=".1f")])
    st.subheader("Rata-rata beban harian (MWh)")
    show((test + line + covid).properties(height=320))
    st.caption("Garis vertikal: 15 Maret 2020, awal regime COVID-19. Area abu-abu: periode uji backtest.")

    c1, c2 = st.columns([1, 1.2])
    with c1:
        st.subheader("Rata-rata beban per jam dan hari, 2019")
        p = D["profile"]
        heat = pd.DataFrame(p["z"], index=p["rows"], columns=p["cols"]).rename_axis("jam").reset_index().melt("jam", var_name="hari", value_name="MWh")
        show(alt.Chart(heat).mark_rect().encode(
            x=alt.X("hari:N", sort=p["cols"], title=None, axis=alt.Axis(orient="top", labelAngle=0)),
            y=alt.Y("jam:O", title="Jam"), color=alt.Color("MWh:Q", scale=alt.Scale(scheme="blues"), legend=alt.Legend(orient="bottom", title="MWh", labelExpr=Y_ID)),
            tooltip=["hari", "jam", alt.Tooltip("MWh:Q", format=".1f")]).properties(height=460))
    with c2:
        st.subheader("Profil harian: hari biasa vs libur nasional")
        h = D["holiday_profile"]
        hp = pd.DataFrame({"jam": h["hour"], "Hari biasa": h["biasa"], "Hari libur nasional": h["libur"]}).melt("jam", var_name="model", value_name="MWh")
        show(alt.Chart(hp).mark_line(strokeWidth=2).encode(x=alt.X("jam:Q", title="Jam"), y=y_axis(),
             color=alt.Color("model:N", scale=alt.Scale(range=[COL[MODELS[0]], COL[MODELS[1]]]), legend=alt.Legend(orient="top", title=None)),
             tooltip=["model", "jam", alt.Tooltip("MWh:Q", format=".1f")]).properties(height=400))
        gap = (pd.Series(h["biasa"]) - pd.Series(h["libur"]))
        st.caption(f"Selisih terbesar {num(gap.max(), 0)} MWh pada jam {int(gap.idxmax())}. Pada dini hari kedua profil hampir berimpit, sehingga efek libur terkonsentrasi pada jam kerja.")

    c1, c2, c3 = st.columns(3)
    with c1:
        st.subheader("Kekuatan komponen MSTL (2019)")
        s = D["strength"]
        table(pd.DataFrame({"Komponen": ["Tren", "Musiman harian (24 jam)", "Musiman mingguan (168 jam)"],
                            "Kekuatan": [s["Tren"], s["seasonal_24"], s["seasonal_168"]]}), {"Kekuatan": 3})
        st.caption("Indeks 0 sampai 1: 1 - Var(residu) / Var(komponen + residu).")
    with c2:
        st.subheader("Korelasi beban dengan cuaca")
        table(split(D["corr"]).rename_axis("Variabel").reset_index().rename(columns={"r_per_jam": "r per jam", "r_harian": "r harian"}), {"r per jam": 3, "r harian": 3})
    with c3:
        st.subheader("Ringkasan tahunan")
        y = split(D["yearly"]).rename_axis("Tahun").reset_index()
        table(y.rename(columns={"mean": "Rerata", "std": "Simp. baku", "tumbuh_%": "Tumbuh %"})[["Tahun", "Rerata", "Simp. baku", "Tumbuh %"]],
              {"Rerata": 1, "Simp. baku": 1, "Tumbuh %": 2})
        st.caption("Tahun 2020 hanya sampai 27 Juni dan memuat periode pembatasan COVID-19.")

with tabs[2]:
    st.write("Delapan model dari tiga paradigma. Foundation model dipakai tanpa pelatihan pada data Panama (zero-shot). Moirai, Lag-Llama, dan TimeGPT dibahas secara konseptual karena kendala teknis.")
    FM = [("Chronos-2+Kov", "Foundation model", "Chronos-2 dengan kovariat suhu tiga kota, kelembapan, hari libur, dan masa sekolah (masa lalu dan masa depan) melalui group attention."),
          ("Chronos-2", "Foundation model", "Amazon, 2025. In-context learning lintas target dan kovariat; di sini dipakai univariat."),
          ("Chronos-Bolt", "Foundation model", "Amazon. Varian Chronos berbasis patch yang langsung menghasilkan kuantil multi-langkah."),
          ("TimesFM-2.0", "Foundation model", "Google. Decoder-only dengan masukan patch, dilatih pada korpus nyata dan sintetis."),
          ("XGBoost", "Machine learning", "Gradient boosting dengan fitur kalender, cuaca, dan lag 24 s.d. 336 jam; dilatih sampai Desember 2019."),
          ("SARIMAX-W", "Statistik", "Beda musiman mingguan y(t) - y(t-168) dengan galat ARIMA(2,0,1)(1,0,0)24 dan eksogen yang ikut dibedakan; MLE pada 2019."),
          ("SARIMAX-DHR", "Statistik", "Regresi harmonik dinamis: Fourier 24 dan 168 jam, suhu, kalender, galat ARIMA(2,1,1); MLE pada 2019."),
          ("SNaive-168", "Baseline", "Menyalin nilai pada jam yang sama minggu sebelumnya."),
          ("Moirai", "Foundation model", "Salesforce, 2024. Masked-encoder universal, korpus LOTSA. Pustaka uni2ts mensyaratkan torch < 2.5 sehingga bentrok dengan lingkungan."),
          ("Lag-Llama", "Foundation model", "Decoder-only bergaya LLaMA dengan lag sebagai kovariat. Bergantung pada GluonTS versi lama."),
          ("TimeGPT", "Foundation model", "Nixtla. Sumber tertutup, diakses melalui API berbayar; data harus dikirim ke layanan eksternal.")]
    rows = []
    for m, par, desc in FM:
        r = info.loc[m] if m in info.index else None
        pj = None if r is None else r.parameter_juta
        sec = None if r is None else (r.detik_inferensi if pd.notna(r.detik_inferensi) else r.detik_latih)
        par_txt = "-" if pj is None or pd.isna(pj) else f"{num(pj, 1)} juta" if pj >= 0.001 else str(NPAR.get(m, 0))
        rows.append({"Model": m, "Paradigma": par, "Ringkasan": desc, "Parameter": par_txt, "Waktu (detik)": num(sec, 1),
                     "Status": "Dijalankan" if r is not None else "Konseptual"})
    st.dataframe(pd.DataFrame(rows), hide_index=True, width="stretch",
                 column_config={"Ringkasan": st.column_config.TextColumn(width="large")})

with tabs[3]:
    regime = st.segmented_control("Cakupan origin", ["Semua", "Normal", "COVID-19"], default="Semua") or "Semua"
    if regime == "Semua":
        lb = overall.rename_axis("Model").reset_index()
    else:
        lb = by_reg[by_reg.regime == regime].drop(columns="regime").rename(columns={"model": "Model"}).sort_values("MAE")
    lb.insert(0, "#", range(1, len(lb) + 1))
    st.write(f"Diurutkan menurut MAE. Model terbaik pada cakupan ini: **{lb.Model.iloc[0]}** dengan MAPE {num(lb['MAPE (%)'].iloc[0])}%.")
    table(lb, {"MAE": 1, "RMSE": 1, "MAPE (%)": 2, "MASE": 3, "WQL": 4, "Cakupan 80% (%)": 1, "Skill vs SNaive (%)": 1})
    st.caption("MASE < 1 berarti lebih akurat daripada seasonal naive mingguan di data latih. WQL mengukur akurasi seluruh distribusi ramalan (makin kecil makin baik). Cakupan 80% idealnya mendekati 80.")
    c1, c2 = st.columns(2)
    with c1:
        st.subheader(f"MAPE per model (%), {regime.lower() if regime == 'Semua' else regime}")
        show(alt.Chart(lb).mark_bar(cornerRadiusEnd=4, height=16).encode(
            y=alt.Y("Model:N", sort=None, title=None), x=alt.X("MAPE (%):Q", title="MAPE (%)"),
            color=alt.Color("Model:N", scale=alt.Scale(domain=MODELS, range=[COL[m] for m in MODELS]), legend=None),
            tooltip=["Model", alt.Tooltip("MAPE (%):Q", format=".2f")]).properties(height=320))
    with c2:
        st.subheader("MAE menurut horizon (MWh), semua origin")
        hz = pd.DataFrame(D["horizon"]).assign(h=range(1, META["H"] + 1)).melt("h", var_name="model", value_name="MAE")
        sel = alt.selection_point(fields=["model"], bind="legend")
        show(alt.Chart(hz).mark_line(strokeWidth=2).encode(
            x=alt.X("h:Q", title="Jam ke depan"), y=alt.Y("MAE:Q", title="MAE (MWh)"), color=color(MODELS),
            opacity=alt.condition(sel, alt.value(1), alt.value(0.12)), tooltip=["model", "h", alt.Tooltip("MAE:Q", format=".1f")]
        ).add_params(sel).properties(height=320))
        st.caption("Klik nama model pada legenda untuk menyorot satu garis.")

with tabs[4]:
    st.write("Pilih hari origin untuk melihat ramalan 24 jam setiap model terhadap nilai aktual.")
    origins = BT["origins"]
    c1, c2, c3 = st.columns([2, 2, 1])
    o = c1.select_slider("Origin", origins, value="2020-04-06")
    i = origins.index(o)
    picked = c2.multiselect("Model", MODELS, default=[BEST, "TimesFM-2.0", "XGBoost"])
    banded = [m for m in MODELS if m in BT["band"]]
    band_m = c3.selectbox("Interval 80% untuk", banded, index=banded.index(BEST) if BEST in banded else 0)
    st.caption(f"Regime: {BT['regime'][i]}")
    ts = pd.date_range(pd.Timestamp(o) + pd.Timedelta(hours=1), periods=META["H"], freq="h")
    fc = pd.concat([pd.DataFrame({"waktu": ts, "model": m, "MWh": BT["mean"][m][i]}) for m in picked] +
                   [pd.DataFrame({"waktu": ts, "model": "Aktual", "MWh": BT["actual"][i]})])
    bd = BT["band"][band_m]
    band = alt.Chart(pd.DataFrame({"waktu": ts, "lo": bd["lo"][i], "hi": bd["hi"][i]})).mark_area(color=COL[band_m], opacity=0.15).encode(x="waktu:T", y=alt.Y("lo:Q", title="MWh", scale=alt.Scale(zero=False)), y2="hi:Q")
    doms = picked + ["Aktual"]
    lines = alt.Chart(fc).mark_line(strokeWidth=2).encode(
        x=alt.X("waktu:T", title=None, axis=alt.Axis(format="%H.%M")), y=y_axis(),
        color=alt.Color("model:N", scale=alt.Scale(domain=doms, range=[COL[m] for m in picked] + [INK]), legend=alt.Legend(orient="top", title=None)),
        tooltip=["model", alt.Tooltip("waktu:T", format="%Y-%m-%d %H.%M"), alt.Tooltip("MWh:Q", format=".1f")])
    c1, c2 = st.columns([2.6, 1])
    with c1:
        show((band + lines).properties(height=380))
    with c2:
        act = pd.Series(BT["actual"][i])
        day = pd.DataFrame({"Model": MODELS, "MAE": [(pd.Series(BT["mean"][m][i]) - act).abs().mean() for m in MODELS]}).sort_values("MAE")
        st.markdown("**MAE pada hari ini (MWh)**")
        table(day, {"MAE": 1})
    st.subheader("MAE harian sepanjang periode uji (MWh)")
    actual = pd.DataFrame(BT["actual"])
    de = pd.concat([pd.DataFrame({"origin": pd.to_datetime(origins), "model": m, "MAE": (pd.DataFrame(BT["mean"][m]) - actual).abs().mean(axis=1)}) for m in picked])
    show((alt.Chart(de).mark_line(strokeWidth=1.4).encode(x=alt.X("origin:T", title=None, axis=alt.Axis(format="%d/%m")), y=alt.Y("MAE:Q", title="MAE (MWh)"), color=color(picked),
          tooltip=["model", alt.Tooltip("origin:T", format="%Y-%m-%d"), alt.Tooltip("MAE:Q", format=".1f")]) + covid).properties(height=300))
    st.caption("Setiap titik adalah rata-rata galat absolut 24 jam untuk satu origin. Garis vertikal: awal regime COVID-19.")

with tabs[5]:
    beaten = sig[(sig["p-value"] < 0.05) & (sig.DM < 0)]["Model B"].tolist()
    st.write(f"{BEST} dibandingkan dengan setiap model lain pada tiga cakupan origin. Pada seluruh origin, {BEST} lebih akurat secara signifikan daripada {', '.join(beaten)}.")
    dm_show = dm.copy()
    dm_show["p-value"] = dm_show["p-value"].map(lambda p: "< 0,0001" if p < 1e-4 else num(p, 4))
    table(dm_show.rename(columns={"Regime": "Cakupan", "Kesimpulan (alpha 5%)": "Kesimpulan"}), {"Selisih MAE (A-B)": 2, "DM": 2})
    st.caption("H0: akurasi kedua model sama. Kerugian = rata-rata galat absolut harian; varians HAC Newey-West lag 5; DM < 0 berarti model A lebih akurat.")

with tabs[6]:
    st.write("Chronos-2 univariat yang dimuat dari folder lokal meramal 27 Juni 2020 pukul 01.00 sampai 28 Juni 2020 pukul 00.00. "
             "Nilai cuaca masa depan tidak tersedia, sehingga varian berkovariat tidak dipakai di sini.")
    f = D["future"]
    hist = pd.DataFrame({"waktu": pd.to_datetime(f["hist_ts"]), "MWh": f["hist"], "seri": "Aktual 7 hari terakhir"})
    fut = pd.DataFrame({"waktu": pd.to_datetime(f["ts"]), "MWh": f["mid"], "lo": f["lo"], "hi": f["hi"], "seri": "Median Chronos-2"})
    sc = alt.Scale(domain=["Aktual 7 hari terakhir", "Median Chronos-2"], range=[INK, COL["Chronos-2"]])
    tt = [alt.Tooltip("waktu:T", format="%Y-%m-%d %H.%M"), alt.Tooltip("MWh:Q", format=".1f")]
    show((alt.Chart(fut).mark_area(color=COL["Chronos-2"], opacity=0.18).encode(x="waktu:T", y=alt.Y("lo:Q", title="MWh", scale=alt.Scale(zero=False)), y2="hi:Q") +
          alt.Chart(pd.concat([hist, fut])).mark_line(strokeWidth=2).encode(
              x=alt.X("waktu:T", title=None, axis=alt.Axis(format="%d/%m %H.%M")), y=y_axis(), color=alt.Color("seri:N", scale=sc, legend=alt.Legend(orient="top", title=None)), tooltip=["seri"] + tt)
          ).properties(height=360))
    st.caption(f"Jam pertama: median {num(f['mid'][0], 1)} MWh, interval 80% {num(f['lo'][0], 1)} sampai {num(f['hi'][0], 1)} MWh.")

with tabs[7]:
    c1, c2 = st.columns(2)
    with c1.container(border=True):
        st.markdown("**Desain evaluasi**")
        st.write(f"Rolling-origin backtest: setiap hari pukul 00.00 dari 1 Januari s.d. 26 Juni 2020 ({META['n_origin']} origin), setiap model meramal 24 jam ke depan "
                 f"hanya dengan informasi sampai origin. Foundation model menerima konteks {META['CTX']:,} jam. SARIMAX-W, SARIMAX-DHR, dan XGBoost dilatih dengan data "
                 f"sebelum 2020 dan tidak dilatih ulang. Regime COVID-19 dimulai {META['covid_start']}.".replace(",", "."))
        st.write("Ukuran akurasi: MAE, RMSE, MAPE, MASE (skala seasonal naive 168 jam pada data latih), WQL rata-rata kuantil 0,1 sampai 0,9, dan cakupan interval 80%.")
    with c2.container(border=True):
        st.markdown("**Keterbatasan**")
        st.write("Kovariat cuaca memakai nilai observasi, bukan ramalan cuaca, sehingga akurasi model berkovariat adalah batas atas. Foundation model tidak di-fine-tune. "
                 "Hiperparameter XGBoost dan orde ARIMA tidak dicari secara grid. Evaluasi mencakup satu semester (Januari s.d. Juni 2020).")
    st.caption("Data: Aguilar Madrid, E., & Antonio, N. (2021). Short-term electricity load forecasting with machine learning. *Information, 12*(2), 50. "
               "[doi.org/10.3390/info12020050](https://doi.org/10.3390/info12020050). Analisis lengkap ada di notebook dan LAPORAN_ANALISIS.md.")
