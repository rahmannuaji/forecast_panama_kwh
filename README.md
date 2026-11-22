# Peramalan Beban Listrik Panama: Foundation Model vs Model Statistik dan ML

Perbandingan Chronos-2, Chronos-Bolt, TimesFM 2.0, XGBoost, SARIMAX, dan seasonal naive untuk peramalan beban listrik per jam 24 jam ke depan (data Panama 2015-2020).

| Berkas | Isi |
|---|---|
| `Analisis_Forecasting_Beban_Listrik_Panama.ipynb` | Notebook analisis lengkap |
| `LAPORAN_ANALISIS.md` | Laporan tertulis (bahasa ilmiah) |
| `dashboard/` | Dashboard statis HTML (`index.html` + `data.js`) |
| `streamlit_app.py` | Versi Streamlit dari dashboard yang sama |
| `models/` | Model tersimpan (XGBoost, SARIMAX); bobot foundation model diunduh otomatis oleh notebook |
| `outputs/` | Hasil backtest, metrik, dan uji Diebold-Mariano (CSV) |

## Deploy ke GitHub Pages

1. Push repositori ke GitHub. `.gitignore` sudah mengecualikan bobot Chronos dan TimesFM (lebih dari 100 MB, melebihi batas GitHub).
2. Buka **Settings > Pages**, pilih **Deploy from a branch**, branch `main`, folder `/ (root)`.
3. Situs tersedia di `https://<username>.github.io/<nama-repo>/`. Halaman root langsung mengarahkan ke `dashboard/`.

## Deploy ke Streamlit Community Cloud

1. Masuk ke [share.streamlit.io](https://share.streamlit.io) dengan akun GitHub.
2. **Create app**, pilih repositori ini, branch `main`, file utama `streamlit_app.py`.
3. Dependensi dibaca dari `requirements.txt` (streamlit, pandas, altair). Tema dari `.streamlit/config.toml`.

Menjalankan secara lokal:

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

Kedua dashboard membaca `dashboard/data.js` yang diekspor oleh sel terakhir notebook, sehingga angka di keduanya selalu sama. Jika notebook dijalankan ulang, kedua dashboard ikut diperbarui.

## Menjalankan notebook

Notebook memerlukan paket tambahan: `chronos-forecasting`, `transformers`, `torch`, `statsmodels`, `xgboost`, `scipy`, `seaborn`, `matplotlib`, `openpyxl`, `huggingface_hub`, `nbformat`. Saat pertama dijalankan, bobot foundation model (sekitar 2,6 GB) diunduh ke `models/`.

## Sumber data

Aguilar Madrid, E., & Antonio, N. (2021). Short-term electricity load forecasting with machine learning. *Information, 12*(2), 50. https://doi.org/10.3390/info12020050
