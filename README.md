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

## Deploy ke GitHub Pages

1. Push repositori ke GitHub. `.gitignore` sudah mengecualikan bobot Chronos dan TimesFM (lebih dari 100 MB, melebihi batas GitHub).
2. Buka **Settings > Pages**, pilih **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Situs tersedia di `https://<username>.github.io/<nama-repo>/`. Halaman root langsung mengarahkan ke `dashboard/`.

Foundation model tidak dijalankan di browser karena GitHub Pages hanya melayani berkas statis dan bobotnya berukuran 190 MB sampai 2 GB. Semua ramalan, termasuk skenario suhu, dihitung di notebook lalu disimpan di `dashboard/data.js`.

## Deploy ke Streamlit Community Cloud

1. Masuk ke [share.streamlit.io](https://share.streamlit.io) dengan akun GitHub.
2. **Create app**, pilih repositori ini, branch `main`, file utama `streamlit_app.py`.
3. Dependensi dibaca dari `requirements.txt` (streamlit, pandas, altair). Tema dari `.streamlit/config.toml`.

Menjalankan secara lokal:

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## Menjalankan notebook

Notebook memerlukan paket tambahan: `chronos-forecasting`, `transformers`, `torch`, `statsmodels`, `xgboost`, `scipy`, `seaborn`, `matplotlib`, `openpyxl`, `huggingface_hub`. Saat pertama dijalankan, bobot foundation model (sekitar 2,6 GB) diunduh ke `models/`. Eksekusi penuh di CPU sekitar 20 menit (bagian terlama adalah Chronos-2 dengan kovariat dan simulasi suhu). Sel terakhir memperbarui `dashboard/data.js`, sehingga kedua dashboard ikut diperbarui.

## Sumber data

Aguilar Madrid, E., & Antonio, N. (2021). Short-term electricity load forecasting with machine learning. *Information, 12*(2), 50. https://doi.org/10.3390/info12020050
