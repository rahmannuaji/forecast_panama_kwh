# Atlas Beban Panama: Peramalan Beban Listrik 24 Jam

Perbandingan Chronos-2 (dengan dan tanpa kovariat), Chronos-Bolt, TimesFM 2.0, dan XGBoost untuk meramal beban listrik nasional Panama per jam, 24 jam ke depan (data 2015–2020). Model terpilih: **Chronos-2 dengan kovariat cuaca dan kalender** (MAPE 2,79%).

| Berkas | Isi |
|---|---|
| `Analisis_Forecasting_Beban_Listrik_Panama.ipynb` | Notebook bertahap (Tahap 0–10: persiapan, prapemrosesan, EDA, cuaca tiga kota, pemodelan, evaluasi, simulasi suhu, ramalan 24 jam, penyimpanan, ekspor dashboard) |
| `LAPORAN_ANALISIS.md` | Penjelasan rinci setiap tahap, hasil, pembahasan, dan kesimpulan |
| `dashboard/` | Dashboard GitHub Pages (`index.html`, `app.js`, `data.js`) |
| `streamlit_app.py` | Versi Streamlit dari dashboard yang sama |
| `models/xgb_beban.json` | Model XGBoost tersimpan; bobot foundation model diunduh otomatis oleh notebook |
| `outputs/` | Hasil backtest, metrik, uji Diebold-Mariano, sensitivitas suhu, dan ramalan 24 jam (CSV) |

## Sumber data

Aguilar Madrid, E., & Antonio, N. (2021). Short-term electricity load forecasting with machine learning. *Information, 12*(2), 50. https://doi.org/10.3390/info12020050
