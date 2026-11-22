# Peramalan Beban Listrik Per Jam Panama: Perbandingan *Foundation Model* Deret Waktu dengan Model Statistik dan *Machine Learning*

**Abstrak.** Penjadwalan pembangkit listrik bergantung pada ramalan beban per jam, sedangkan *foundation model* deret waktu menawarkan peramalan tanpa estimasi parameter pada data lokal. Penelitian ini membandingkan empat konfigurasi *foundation model* yang dijalankan secara *zero-shot* (Chronos-Bolt, Chronos-2 univariat, Chronos-2 dengan kovariat, dan TimesFM 2.0) dengan tiga model statistik (SNaive-168, SARIMAX-W, dan SARIMAX-DHR) serta XGBoost untuk peramalan 24 jam ke depan beban nasional Panama. Evaluasi dilakukan melalui *rolling-origin backtest* dengan 178 origin harian (1 Januari sampai 26 Juni 2020) yang mencakup regime Normal dan regime pembatasan COVID-19. Ukuran yang dipakai adalah MAE, MAPE, MASE, *weighted quantile loss*, dan cakupan interval 80%, disertai uji Diebold-Mariano. Chronos-2 dengan kovariat cuaca dan kalender menghasilkan galat terendah (MAPE 2,79%; MASE 0,564), atau 54% lebih akurat daripada *seasonal naive*. Urutan berikutnya adalah Chronos-2 univariat (2,85%), Chronos-Bolt (3,18%), TimesFM 2.0 (3,22%), XGBoost (4,19%), dan SARIMAX-W (4,44%). Keunggulan Chronos-2 dengan kovariat atas semua model selain Chronos-2 univariat signifikan ($p < 0{,}01$). Manfaat kovariat baru signifikan pada regime COVID-19 ($p = 0{,}033$). Pada regime COVID-19, interval 80% *foundation model* cenderung terlalu sempit (cakupan 69,8% sampai 76,6%). Hasil ini menunjukkan bahwa *foundation model zero-shot* layak dijadikan acuan awal yang kuat untuk peramalan beban jangka pendek, termasuk saat terjadi perubahan struktural, dengan catatan kalibrasi interval perlu diperiksa sebelum dipakai secara operasional.

**Kata kunci:** peramalan beban jangka pendek; *foundation model* deret waktu; Chronos-2; uji Diebold-Mariano; perubahan struktural COVID-19.

**Struktur notebook.** Subbab 1 berisi pendahuluan dan tinjauan *foundation model*. Subbab 2 memuat analisis eksploratif. Subbab 3 menjelaskan metodologi dan implementasi delapan model. Subbab 4 menyajikan hasil. Subbab 5 menjelaskan penyimpanan model. Subbab 6 berisi pembahasan, dan Subbab 7 berisi kesimpulan serta saran. Setiap sel kode memuat satu baris komentar; penjelasan rinci ditempatkan pada sel *markdown*.

> Laporan ini disusun dari sel *markdown* notebook `Analisis_Forecasting_Beban_Listrik_Panama.ipynb`. Angka pada tabel berasal dari folder `outputs/`; grafik tersedia di notebook dan dashboard (`dashboard/index.html`).

## 1. Pendahuluan

### 1.1 Latar belakang

Operator sistem tenaga listrik harus menyeimbangkan pasokan dan permintaan setiap jam. Ramalan beban yang terlalu rendah memaksa pengoperasian pembangkit cadangan berbiaya tinggi, sedangkan ramalan yang terlalu tinggi menimbulkan kapasitas siaga yang tidak terpakai `[RUJUKAN DIPERLUKAN: kuantifikasi biaya kesalahan peramalan beban jangka pendek]`. Karena itu, peramalan beban jangka pendek (*short-term load forecasting*, STLF) menjadi salah satu masalah peramalan deret waktu yang paling banyak dikaji.

Data yang dianalisis adalah beban listrik nasional Panama per jam yang dipublikasikan oleh Aguilar Madrid dan Antonio (2021) beserta dataset pendampingnya di Mendeley Data. Dalam studi tersebut, pusat dispatch nasional Panama (CND) menghasilkan ramalan mingguan dan para penulis mengembangkan model *machine learning* untuk horizon 168 jam. Dataset memuat beban nasional, variabel cuaca dari tiga kota (Tocumen/Kota Panama, Santiago, dan David), serta indikator hari libur dan masa sekolah.

Dalam beberapa tahun terakhir muncul kelas model baru, yaitu *foundation model* deret waktu: jaringan *transformer* yang dilatih sekali pada korpus deret waktu lintas domain berukuran sangat besar, lalu dipakai untuk meramal deret baru tanpa pelatihan ulang (*zero-shot*). Contohnya Chronos (Ansari dkk., 2024), Chronos-2 (Ansari dkk., 2025), TimesFM (Das dkk., 2024), Moirai (Woo dkk., 2024), Lag-Llama (Rasul dkk., 2023), dan TimeGPT (Garza dkk., 2023). Bagi analis statistik muncul pertanyaan praktis: apakah model tanpa estimasi parameter pada data lokal ini mampu menyaingi model yang dibangun khusus dengan pengetahuan domain (musiman ganda, cuaca, dan kalender)?

Data Panama juga memuat ujian ketangguhan yang alami. Mulai pekan ketiga Maret 2020, pembatasan aktivitas akibat COVID-19 menurunkan rata-rata beban mingguan dari sekitar 1.300 MWh menjadi sekitar 1.020 sampai 1.110 MWh (dihitung dari data ini). Perubahan struktural semacam ini tidak pernah dilihat model selama pelatihan, sehingga periode tersebut menguji kemampuan adaptasi tiap pendekatan.

### 1.2 Rumusan masalah

1. Bagaimana karakteristik deret beban listrik Panama, yaitu tren, musiman harian dan mingguan, serta pengaruh cuaca dan kalender?
2. Seberapa akurat *foundation model* (Chronos-Bolt, Chronos-2, dan TimesFM) secara *zero-shot* dibandingkan model statistik (*seasonal naive*, SARIMAX pada beda musiman mingguan, dan regresi harmonik dinamis) serta model *machine learning* (XGBoost) untuk peramalan 24 jam ke depan?
3. Apakah penambahan kovariat cuaca dan kalender pada Chronos-2 meningkatkan akurasi?
4. Bagaimana kinerja setiap model pada periode perubahan struktural COVID-19?
5. Apakah perbedaan akurasi antarmodel signifikan secara statistik menurut uji Diebold-Mariano?

### 1.3 Tujuan

Penelitian ini bertujuan (a) mendeskripsikan pola beban listrik Panama, (b) membandingkan akurasi titik dan akurasi probabilistik delapan model peramalan melalui *backtest* bergulir, (c) mengukur kontribusi kovariat pada *foundation model*, dan (d) menguji signifikansi perbedaan akurasi.

### 1.4 Batasan

- Horizon peramalan 24 jam (*day-ahead*) dengan titik asal (*origin*) setiap pukul 00.00, sebanyak 178 origin dari 1 Januari sampai 26 Juni 2020.
- Kovariat cuaca memakai nilai observasi, bukan ramalan cuaca. Akurasi model yang memakai cuaca (SARIMAX-W, SARIMAX-DHR, XGBoost, Chronos-2+Kov) karenanya merupakan batas atas (*oracle*); dalam operasi nyata, galat ramalan cuaca akan menambah galat beban.
- *Foundation model* dijalankan *zero-shot* di CPU tanpa *fine-tuning*.
- Moirai, Lag-Llama, dan TimeGPT tidak dijalankan karena alasan teknis yang dijelaskan pada Subbab 1.5; ketiganya dibahas secara konseptual.

### 1.5 *Foundation model* deret waktu: konsep dan posisinya

**Konsep.** *Foundation model* deret waktu adalah model berparameter besar yang dilatih satu kali pada kumpulan deret dari banyak domain (energi, lalu lintas, ekonomi, cuaca, data sintetis), kemudian dipakai langsung pada deret baru. Dari sudut pandang statistika, model ini memperkirakan distribusi prediktif bersyarat

$$p\left(y_{T+1:T+H} \mid y_{T-C+1:T},\; \mathbf{x}\right)$$

secara langsung. Jendela konteks sepanjang $C$ titik berperan sebagai data pengkondisi (*in-context learning*), bukan sebagai data untuk mengestimasi parameter. Pengetahuan tentang bentuk musiman, tren, dan derau yang lazim berasal dari pra-pelatihan, sehingga fungsinya mirip *prior* yang sangat informatif.

**Perbandingan paradigma.**

| Aspek | Statistik klasik (ARIMA, ETS, DHR) | *Machine learning* (XGBoost) | *Foundation model* |
|---|---|---|---|
| Cakupan model | Satu model per deret | Satu model per dataset | Satu model untuk semua deret |
| Estimasi | MLE pada deret itu sendiri | Pelatihan pada data lokal | Tidak ada; hanya inferensi |
| Asumsi | Struktur eksplisit (stasioneritas, orde ARIMA) | Rekayasa fitur oleh analis | Implisit, dipelajari dari korpus |
| Ketidakpastian | Analitik (asumsi Gaussian) | Perlu metode tambahan | Kuantil atau sampel langsung |
| Interpretabilitas | Tinggi (koefisien, uji) | Sedang (kepentingan fitur) | Rendah |

**Model yang dikaji.**

| Model | Pengembang | Arsitektur dan gagasan kunci | Keluaran | Kovariat | Status dalam analisis ini |
|---|---|---|---|---|---|
| Chronos (Ansari dkk., 2024) | Amazon | *Encoder-decoder* keluarga T5; nilai deret diskalakan dan dikuantisasi menjadi token, lalu dilatih seperti model bahasa | Probabilistik (sampel) | Tidak | Diwakili Chronos-Bolt |
| Chronos-Bolt | Amazon | Varian Chronos berbasis *patch* yang langsung menghasilkan kuantil untuk banyak langkah sekaligus (kartu model `amazon/chronos-bolt-small`) | Kuantil 0,1 sampai 0,9 | Tidak | Dijalankan (ukuran *small*) |
| Chronos-2 (Ansari dkk., 2025) | Amazon | Mekanisme *group attention* untuk *in-context learning* lintas target dan kovariat; menangani kasus univariat, multivariat, dan berkovariat | Kuantil | Ya, masa lalu dan masa depan | Dijalankan, tanpa dan dengan kovariat |
| TimesFM (Das dkk., 2024) | Google | *Decoder-only* dengan masukan berupa *patch*; dilatih pada korpus nyata dan sintetis berukuran sekitar 100 miliar titik waktu | Rata-rata dan kuantil | Tidak (versi yang dipakai) | Dijalankan (versi 2.0, 500 juta parameter) |
| Moirai (Woo dkk., 2024) | Salesforce | *Masked-encoder transformer* universal, dilatih pada arsip LOTSA berisi lebih dari 27 miliar observasi; menerima jumlah variat sembarang | Probabilistik (distribusi parametrik) | Ya | Tidak dijalankan: pustaka `uni2ts` mensyaratkan `torch<2.5`, `numpy~=1.26`, dan `scipy~=1.11` sehingga merusak lingkungan yang ada |
| Lag-Llama (Rasul dkk., 2023) | Konsorsium akademik dan industri | *Decoder-only* bergaya LLaMA dengan nilai lag sebagai kovariat; univariat probabilistik | Probabilistik (distribusi parametrik) | Tidak | Tidak dijalankan: bergantung pada GluonTS versi lama dan instalasi dari repositori git |
| TimeGPT (Garza dkk., 2023) | Nixtla | Model sumber tertutup yang diakses melalui API | Titik dan interval | Ya, melalui API | Tidak dijalankan: memerlukan kunci API berbayar dan pengiriman data ke layanan eksternal |

Ketiga model yang tidak dijalankan dapat ditambahkan dengan pola kode yang sama (fungsi yang menerima konteks dan mengembalikan matriks kuantil berukuran origin x horizon x 9), di lingkungan Python terpisah untuk Moirai dan Lag-Llama.

## 2. Data dan analisis eksploratif

### 2.1 Struktur data

Data terdiri atas 48.048 observasi per jam (3 Januari 2015 pukul 01.00 sampai 27 Juni 2020 pukul 00.00) dalam zona waktu Panama (UTC-05.00). Variabel respons adalah `nat_demand`, yaitu beban listrik nasional (MWh). Variabel penjelas terdiri atas:

- **Cuaca** di tiga kota (akhiran `_toc` untuk Tocumen/Kota Panama, `_san` untuk Santiago, `_dav` untuk David): suhu 2 m (`T2M`), kelembapan 2 m (`QV2M`), presipitasi cair (`TQL`), dan kecepatan angin 2 m (`W2M`).
- **Kalender**: `holiday` (indikator hari libur nasional), `Holiday_ID` (jenis hari libur), dan `school` (indikator masa sekolah).

Lembar `deskripsi` mencatat bahwa satuan kelembapan, presipitasi, dan angin bersumber dari README dataset; nilai `QV2M` yang berkisar 0,01 sampai 0,02 lebih sesuai dengan kelembapan spesifik (kg/kg) daripada kelembapan relatif (%), sehingga satuan tersebut perlu diverifikasi pada sumber aslinya.

### 2.2 Kelengkapan data dan tren tahunan

Data tidak memiliki nilai hilang maupun stempel waktu yang terlewat, sehingga tidak diperlukan imputasi. Rata-rata beban tahunan meningkat dari 1.131,5 MWh (2015) menjadi 1.243,6 MWh (2019) dengan laju pertumbuhan 2,27%, 2,17%, 1,98%, dan 3,14% per tahun. Pertumbuhan yang stabil sekitar 2 sampai 3% per tahun ini menunjukkan tren deterministik yang lemah dibandingkan variasi dalam hari.

Rata-rata 2020 tercatat 5,90% lebih rendah daripada 2019, tetapi angka ini tidak setara dengan laju tahunan lain karena dua alasan. Pertama, data 2020 hanya mencakup Januari sampai Juni. Kedua, periode tersebut memuat pembatasan COVID-19. Perbandingan semester yang setara menunjukkan rata-rata Januari sampai Juni 2020 sebesar 1.170,2 MWh, atau 6,1% di bawah periode yang sama pada 2019 (1.246,8 MWh). Grafik berikut memperlihatkan bahwa penurunan tersebut terkonsentrasi setelah pertengahan Maret 2020.

### 2.3 Perubahan struktural dan anomali

**Perubahan struktural COVID-19.** Rata-rata mingguan pada Februari sampai pertengahan Maret 2020 berada di kisaran 1.220 sampai 1.304 MWh. Setelah pekan 15 Maret 2020, rata-rata mingguan turun ke 1.193 MWh, lalu bertahan pada 1.021 sampai 1.112 MWh hingga akhir Juni. Rata-rata beban pada regime Normal (1 Januari sampai 14 Maret 2020) adalah 1.277,3 MWh, sedangkan pada regime COVID-19 (15 Maret sampai 26 Juni 2020) adalah 1.094,1 MWh, atau turun 14,3%. Perubahan ini berupa pergeseran level yang persisten, bukan pencilan sesaat.

**Anomali titik.** Anomali didefinisikan sebagai simpangan terhadap median bergulir 168 jam yang melebihi 5 kali MAD terskala ($1{,}4826 \times \text{MAD}$). Kriteria ini hanya menandai dua titik, yaitu 20 Januari 2019 pukul 12.00 (85,2 MWh) dan pukul 13.00 (135,8 MWh). Hari tersebut adalah hari Minggu dan bukan hari libur nasional. Beban pulih bertahap pada pukul 14.00 (263,6 MWh) dan 15.00 (417,4 MWh). Pola penurunan mendadak lalu pemulihan bertahap dalam beberapa jam lebih konsisten dengan gangguan pasokan atau kesalahan pencatatan daripada perubahan perilaku konsumen `[RUJUKAN DIPERLUKAN: konfirmasi gangguan sistem 20 Januari 2019 dari laporan operator CND Panama]`. Nilai rendah lain yang tidak melewati ambang adalah 27 Juni 2017 pukul 12.00 (380,6 MWh).

Anomali tersebut tidak dikoreksi karena jumlahnya sangat kecil (kurang dari 0,01% observasi) dan berada di luar periode uji. Pada model yang diestimasi dengan data 2019 (SARIMAX-DHR dan SARIMAX-W), titik ini dapat sedikit memperbesar estimasi $\sigma^2$. Metode median bergulir sengaja tidak menandai penurunan COVID-19, karena median beradaptasi terhadap pergeseran level dalam satu minggu. Dengan demikian, kedua jenis perubahan dibedakan: anomali titik (gangguan sesaat) dan perubahan struktural (perubahan regime).

### 2.4 Musiman harian, musiman mingguan, dan efek hari libur

Peta panas 2019 memperlihatkan dua pola musiman yang saling bertumpuk:

- **Musiman harian.** Pada hari kerja, beban terendah terjadi sekitar pukul 04.00 dan puncaknya sekitar pukul 13.00. Nilai tertinggi rata-rata jam x hari adalah 1.531,5 MWh (Kamis pukul 13.00), sedangkan nilai terendahnya 949,2 MWh (Minggu pukul 06.00). Rasio puncak terhadap lembah sebesar 1,61 berarti beban siang hari sekitar 61% lebih tinggi daripada dini hari. Puncak siang hari, bukan malam hari, merupakan ciri sistem tropis dengan beban pendingin ruangan dan aktivitas komersial yang dominan `[RUJUKAN DIPERLUKAN: karakteristik kurva beban harian negara tropis]`.
- **Musiman mingguan.** Rata-rata Senin sampai Jumat relatif setara (1.271,5 sampai 1.281,6 MWh). Rata-rata turun menjadi 1.205,6 MWh pada Sabtu (sekitar 5,5% lebih rendah) dan 1.118,0 MWh pada Minggu (sekitar 12,3% lebih rendah).

**Efek hari libur.** Pada hari kerja, rata-rata beban harian saat libur nasional adalah 1.069,3 MWh, sedangkan pada hari biasa 1.226,0 MWh. Selisih sekitar 157 MWh (12,8%) signifikan menurut uji *t* Welch ($t = -16{,}11$; $p = 3{,}99 \times 10^{-28}$). Profil harian hari libur juga lebih datar dan menyerupai profil hari Minggu. Temuan ini menjadi dasar untuk memasukkan indikator `holiday` ke model yang menerima kovariat. Tanpa informasi ini, model yang hanya membaca pola minggu lalu (misalnya SNaive-168) akan keliru pada hari libur dan juga pada hari kerja tepat satu minggu setelahnya.

### 2.5 Hubungan beban dengan cuaca

Korelasi Pearson antara beban dan suhu pada skala per jam cukup kuat ($r = 0{,}653$ untuk Tocumen, $0{,}648$ untuk David, $0{,}627$ untuk Santiago). Pada skala rata-rata harian, korelasi tersebut turun drastis menjadi $0{,}153$, $0{,}140$, dan $0{,}112$. Perbedaan ini menunjukkan bahwa korelasi per jam sebagian besar merupakan korelasi palsu (*spurious*) akibat siklus harian bersama: suhu dan beban sama-sama naik pada siang hari. Faktor pengacau (*confounder*) dalam hal ini adalah jam dalam sehari, bukan pengaruh suhu terhadap beban.

Penjelasan kedua bersifat klimatologis. Variasi suhu antarhari di Panama kecil: simpangan baku rata-rata harian suhu Tocumen hanya 0,69 °C, sedangkan simpangan baku per jam 1,68 °C. Dengan rentang yang sempit, efek suhu terhadap beban harian sulit dibedakan dari derau. Implikasinya, kontribusi cuaca untuk peramalan 24 jam diperkirakan moderat dan terutama bekerja melalui deviasi suhu di dalam hari terhadap pola musimannya. Dugaan ini diuji secara langsung pada Subbab 4 melalui perbandingan Chronos-2 dengan dan tanpa kovariat, serta melalui koefisien suhu pada SARIMAX-DHR.

### 2.6 Dekomposisi, autokorelasi, dan stasioneritas

**Dekomposisi MSTL.** Indeks kekuatan komponen $F = \max\{0,\, 1 - \operatorname{Var}(R_t)/\operatorname{Var}(S_t + R_t)\}$ bernilai 0,906 untuk musiman harian, 0,712 untuk musiman mingguan, dan 0,502 untuk tren (data 2019). Musiman harian merupakan sumber variasi paling dominan, diikuti musiman mingguan. Komponen tren dalam satu tahun relatif lemah, sejalan dengan pertumbuhan tahunan 2 sampai 3%.

**Autokorelasi.** ACF bernilai 0,949 pada lag 1, negatif pada lag 12 ($-0{,}381$, fase berlawanan dalam siklus harian), lalu kembali tinggi pada lag 24 (0,777), lag 168 (0,843), dan lag 336 (0,823). Nilai ACF pada lag 168 lebih tinggi daripada lag 24 dan lag 48 (0,658). Hal ini menegaskan bahwa minggu lalu pada jam yang sama merupakan prediktor yang lebih baik daripada kemarin, sehingga *seasonal naive* mingguan menjadi acuan yang wajar. PACF didominasi lag 1 (0,95) dan lag 2 ($-0{,}70$), dengan lonjakan di sekitar lag 24 sampai 26 dan lag 49. Pola ini mendukung komponen AR orde 2 ditambah komponen AR musiman 24 jam, yaitu struktur yang dipakai pada SARIMAX-W.

**Stasioneritas.** Kedua uji pada rata-rata harian memberikan kesimpulan yang bertentangan. Uji ADF menolak hipotesis akar unit (statistik $-3{,}559$; $p = 0{,}0066$), sedangkan uji KPSS juga menolak hipotesis stasioneritas (statistik 3,07; $p \le 0{,}01$). Konflik seperti ini lazim terjadi pada deret yang memiliki tren deterministik atau perubahan struktural, dalam hal ini pergeseran level COVID-19 pada akhir sampel. Setelah pembedaan pertama, kedua uji sepakat bahwa deret stasioner (ADF $p \approx 0$; KPSS $p = 0{,}10$). Hasil ini menjadi dasar penggunaan pembedaan pada model statistik: $d = 1$ pada galat SARIMAX-DHR dan pembedaan musiman 168 jam pada SARIMAX-W.

## 3. Metodologi

### 3.1 Desain evaluasi: *rolling-origin backtest*

Evaluasi dilakukan dengan *backtest* bergulir. Setiap hari pukul 00.00 (origin $T$), setiap model hanya melihat data hingga $T$ lalu meramal $y_{T+1}, \dots, y_{T+24}$. Origin bergeser satu hari dari 1 Januari sampai 26 Juni 2020, sehingga diperoleh 178 origin x 24 jam = 4.272 pasangan ramalan-aktual per model. Origin dibagi menjadi dua regime:

- **Normal**: origin 1 Januari sampai 14 Maret 2020 (74 hari).
- **COVID-19**: origin 15 Maret sampai 26 Juni 2020 (104 hari).

Model yang memerlukan estimasi (SARIMAX-W, SARIMAX-DHR, dan XGBoost) hanya dilatih dengan data sebelum 1 Januari 2020 dan tidak dilatih ulang selama periode uji. *Foundation model* menerima konteks 2.048 jam terakhir (sekitar 85 hari) pada setiap origin. Desain ini memberikan perbandingan yang adil: semua model memakai informasi yang sama-sama tersedia pada waktu $T$.

### 3.2 Model

**(1) *Seasonal naive* mingguan (SNaive-168)** sebagai acuan minimum:
$$\hat{y}_{T+h} = y_{T+h-168}.$$

**(2) Regresi harmonik dinamis dengan galat ARIMA (SARIMAX-DHR).** Musiman ganda dimodelkan dengan suku Fourier, sedangkan autokorelasi sisa ditangkap oleh galat ARIMA(2,1,1):
$$y_t = \sum_{k=1}^{5}\left[a_k \sin\tfrac{2\pi k t}{24} + b_k \cos\tfrac{2\pi k t}{24}\right] + \sum_{k=1}^{5}\left[c_k \sin\tfrac{2\pi k t}{168} + d_k \cos\tfrac{2\pi k t}{168}\right] + \boldsymbol{\gamma}^\top \mathbf{x}_t + u_t,$$
$$(1-\phi_1 B-\phi_2 B^2)(1-B)\,u_t = (1+\theta_1 B)\,\varepsilon_t,\qquad \varepsilon_t \sim N(0,\sigma^2),$$
dengan $\mathbf{x}_t$ berisi suhu tiga kota, `holiday`, dan `school`. Pendekatan ini dipilih karena SARIMA biasa dengan periode musiman 168 tidak praktis diestimasi. Parameter diestimasi dengan MLE pada data 2019. Pada setiap origin, filter Kalman dijalankan pada 28 hari terakhir dengan parameter tetap (`apply`), lalu ramalan dan variansnya dihitung secara analitik. Kuantil ke-$\tau$ diperoleh dari $\hat{y}_{T+h} + z_\tau \hat{\sigma}_{T+h}$.

**(3) SARIMAX pada beda musiman mingguan (SARIMAX-W).** Pola musiman tidak dimodelkan secara deterministik, melainkan dihilangkan dengan pembedaan musiman $z_t = y_t - y_{t-168}$ (operator $1-B^{168}$). Deret $z_t$ dimodelkan sebagai regresi dengan galat ARIMA(2,0,1)(1,0,0)$_{24}$:
$$z_t = \boldsymbol{\delta}^\top \Delta_{168}\mathbf{x}_t + v_t,\qquad (1-\phi_1 B-\phi_2 B^2)(1-\Phi_1 B^{24})\,v_t = (1+\theta_1 B)\,\varepsilon_t,$$
dengan $\Delta_{168}\mathbf{x}_t = \mathbf{x}_t - \mathbf{x}_{t-168}$ untuk suhu tiga kota, `holiday`, dan `school`. Ramalan beban diperoleh kembali melalui $\hat{y}_{T+h} = y_{T+h-168} + \hat{z}_{T+h}$, sehingga varians ramalan $y$ sama dengan varians ramalan $z$. Model ini setara dengan *seasonal naive* yang dikoreksi oleh dinamika ARIMA, sehingga bentuk profil harian ikut diperbarui setiap minggu. Estimasi MLE pada data 2019.

**(4) XGBoost.** Model *gradient boosting* $\hat{y}=\sum_{m=1}^{M} f_m(\mathbf{z})$ dengan fitur kalender (jam, hari, bulan, hari ke-), cuaca, indikator libur, serta lag 24, 48, 72, 168, dan 336 jam dan rata-rata bergulir dari lag 24. Seluruh lag $\geq 24$ sehingga satu model sah dipakai untuk semua horizon 1 sampai 24 jam tanpa kebocoran informasi. Jumlah pohon ditentukan dengan *early stopping* pada data validasi November sampai Desember 2019.

**(5) sampai (8) *Foundation model* zero-shot**: Chronos-Bolt (*small*), Chronos-2 univariat, Chronos-2 dengan kovariat (suhu tiga kota, kelembapan Tocumen, `holiday`, `school` pada masa lalu dan masa depan), dan TimesFM 2.0 (500M). Tidak ada parameter yang diestimasi pada data Panama.

### 3.3 Ukuran akurasi

Dengan $e_t = y_t - \hat{y}_t$ dan $n$ pasangan ramalan-aktual:

| Ukuran | Rumus | Makna |
|---|---|---|
| MAE | $\frac{1}{n}\sum \lvert e_t\rvert$ | Galat rata-rata dalam MWh |
| RMSE | $\sqrt{\frac{1}{n}\sum e_t^2}$ | Menghukum galat besar lebih berat |
| MAPE | $\frac{100}{n}\sum \lvert e_t / y_t\rvert$ | Galat relatif (%) |
| MASE | $\text{MAE} / \frac{1}{m}\sum_{t} \lvert y_t - y_{t-168}\rvert$ | Skala terhadap *seasonal naive* di data latih; < 1 berarti lebih baik daripada naive |
| WQL | $\frac{1}{9}\sum_{\tau} \frac{2\sum_t \rho_\tau(y_t, \hat{q}_{\tau,t})}{\sum_t \lvert y_t\rvert}$ | Akurasi distribusi prediktif; pendekatan diskret CRPS ternormalisasi |
| Cakupan 80% | proporsi $y_t \in [\hat{q}_{0,1}, \hat{q}_{0,9}]$ | Kalibrasi interval; idealnya mendekati 80% |

dengan fungsi kerugian *pinball* $\rho_\tau(y,q) = \max\{\tau(y-q), (\tau-1)(y-q)\}$ dan $\tau \in \{0{,}1, \dots, 0{,}9\}$.

### 3.4 Uji Diebold-Mariano

Untuk menguji $H_0$: kedua model memiliki akurasi yang sama, didefinisikan selisih kerugian harian $d_s = L^{A}_s - L^{B}_s$ dengan $L_s$ adalah rata-rata galat absolut pada origin $s$. Statistik uji
$$DM = \frac{\bar{d}}{\sqrt{\hat{V}(\bar{d})}}, \qquad \hat{V}(\bar{d}) = \frac{1}{S}\left[\hat{\gamma}_0 + 2\sum_{k=1}^{5}\left(1-\tfrac{k}{6}\right)\hat{\gamma}_k\right],$$
dengan varians HAC Newey-West (lag 5) untuk mengakomodasi autokorelasi galat antarhari. Nilai $p$ dihitung dari distribusi $t$ dengan $S-1$ derajat bebas. $DM < 0$ dengan $p < 0{,}05$ berarti model A lebih akurat.

### 3.5 Implementasi model

**Model 1: *Seasonal naive* mingguan.** Acuan ini menyalin pola minggu sebelumnya. Model yang lebih kompleks dianggap berguna hanya jika mengalahkan acuan ini secara meyakinkan.

**Model 2: SARIMAX-DHR.** Suku Fourier untuk periode 24 dan 168 jam masing-masing memakai $K=5$ pasang. Harmonik mingguan $k \leq 5$ tidak berimpit dengan harmonik harian (harmonik harian pertama setara dengan harmonik mingguan ke-7), sehingga matriks regresor tidak kolinear sempurna. Ringkasan estimasi di bawah memuat koefisien, galat baku, serta uji Ljung-Box dan Jarque-Bera untuk residu.

**Model 3: SARIMAX-W.** Pembedaan musiman 168 jam membuat model selalu berangkat dari pola minggu lalu, lalu ARIMA mengoreksi simpangan yang persisten. Jendela filter Kalman sama dengan SARIMAX-DHR (28 hari). Data latih dimulai 8 Januari 2019 agar beda musiman pertama tidak memakai data 2018 secara implisit di luar jendela estimasi.

**Model 4: XGBoost.** Model dilatih pada data hingga Oktober 2019; data November sampai Desember 2019 dipakai untuk *early stopping*. Hiperparameter ditetapkan pada nilai yang lazim tanpa pencarian *grid*, agar perbandingan dengan *foundation model* zero-shot tidak memberi keunggulan penyetelan yang tidak seimbang.

**Model 5 sampai 8: *Foundation model*.** Bobot model diunduh sekali dari Hugging Face ke folder `models/` lalu selalu dimuat dari folder lokal. Pada pemanggilan berikutnya notebook tidak lagi memerlukan internet. Jumlah parameter dan waktu inferensi dicatat untuk membandingkan biaya komputasi.

## 4. Hasil

Seluruh ramalan disatukan dalam satu tabel panjang (satu baris per origin x jam x model) dan disimpan ke `outputs/forecast_backtest.csv` agar analisis lanjutan maupun dashboard tidak perlu menjalankan ulang model.

**Tabel 4.1** Akurasi keseluruhan (178 origin x 24 jam)

| model | MAE | RMSE | MAPE (%) | MASE | WQL | Cakupan 80% (%) | Skill vs SNaive (%) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Chronos-2+Kov | 32.891 | 48.005 | 2.793 | 0.564 | 0.022 | 74.485 | 54.099 |
| Chronos-2 | 33.495 | 50.939 | 2.854 | 0.574 | 0.023 | 74.930 | 53.257 |
| Chronos-Bolt | 37.253 | 56.259 | 3.182 | 0.638 | 0.025 | 80.009 | 48.012 |
| TimesFM-2.0 | 37.976 | 56.580 | 3.221 | 0.651 | 0.026 | 74.953 | 47.003 |
| XGBoost | 48.605 | 69.858 | 4.186 | 0.833 | nan | nan | 32.169 |
| SARIMAX-W | 53.111 | 80.860 | 4.440 | 0.910 | 0.038 | 87.430 | 25.882 |
| SNaive-168 | 71.657 | 100.106 | 6.112 | 1.228 | nan | nan | 0.000 |
| SARIMAX-DHR | 102.237 | 142.880 | 9.024 | 1.752 | 0.071 | 75.281 | -42.676 |

**Tabel 4.2** MAPE dan cakupan interval 80% menurut regime

| model | MAPE (%) COVID-19 | MAPE (%) Normal | Cakupan 80% (%) COVID-19 | Cakupan 80% (%) Normal |
| --- | --- | --- | --- | --- |
| Chronos-2+Kov | 2.772 | 2.822 | 72.396 | 77.421 |
| Chronos-2 | 2.939 | 2.735 | 72.436 | 78.435 |
| Chronos-Bolt | 3.217 | 3.134 | 76.643 | 84.741 |
| TimesFM-2.0 | 3.274 | 3.146 | 69.792 | 82.207 |
| XGBoost | 4.533 | 3.699 | nan | nan |
| SARIMAX-W | 4.237 | 4.726 | 89.503 | 84.516 |
| SNaive-168 | 5.627 | 6.794 | nan | nan |
| SARIMAX-DHR | 11.792 | 5.133 | 64.543 | 90.372 |

### 4.1 Akurasi keseluruhan

Berdasarkan 4.272 pasangan ramalan-aktual per model, urutan akurasi menurut MAPE adalah sebagai berikut.

| Peringkat | Model | MAE (MWh) | MAPE (%) | MASE | WQL | Cakupan 80% (%) |
|---|---|---|---|---|---|---|
| 1 | Chronos-2+Kov | 32,89 | 2,79 | 0,564 | 0,022 | 74,5 |
| 2 | Chronos-2 | 33,49 | 2,85 | 0,574 | 0,023 | 74,9 |
| 3 | Chronos-Bolt | 37,25 | 3,18 | 0,638 | 0,025 | 80,0 |
| 4 | TimesFM-2.0 | 37,98 | 3,22 | 0,651 | 0,026 | 75,0 |
| 5 | XGBoost | 48,61 | 4,19 | 0,833 | - | - |
| 6 | SARIMAX-W | 53,11 | 4,44 | 0,910 | 0,038 | 87,4 |
| 7 | SNaive-168 | 71,66 | 6,11 | 1,228 | - | - |
| 8 | SARIMAX-DHR | 102,24 | 9,02 | 1,752 | 0,071 | 75,3 |

Ada tiga hasil pokok.

1. **Peringkat atas.** Empat peringkat teratas ditempati *foundation model*. Chronos-2 dengan kovariat menurunkan MAE sebesar 54,1% relatif terhadap SNaive-168.
2. **Perbandingan dengan *seasonal naive*.** Semua model kecuali SARIMAX-DHR memiliki MASE di bawah 1, artinya lebih akurat daripada *seasonal naive* mingguan pada skala data latih. SARIMAX-DHR memiliki MAE 42,7% lebih besar daripada SNaive-168.
3. **Akurasi probabilistik.** Menurut WQL, Chronos-2 dengan kovariat paling akurat (0,022) dan SARIMAX-DHR paling buruk (0,071). Cakupan interval 80% yang paling dekat dengan nominal adalah Chronos-Bolt (80,0%). Chronos-2, Chronos-2 dengan kovariat, dan TimesFM berada di kisaran 74,5% sampai 75,0%. Interval SARIMAX-W terlalu lebar (87,4%).

### 4.2 Akurasi menurut regime

| Model | MAPE Normal (%) | MAPE COVID-19 (%) | Perubahan | Cakupan 80% Normal | Cakupan 80% COVID-19 |
|---|---|---|---|---|---|
| Chronos-2+Kov | 2,82 | 2,77 | -0,05 | 77,4 | 72,4 |
| Chronos-2 | 2,74 | 2,94 | +0,20 | 78,4 | 72,4 |
| Chronos-Bolt | 3,13 | 3,22 | +0,08 | 84,7 | 76,6 |
| TimesFM-2.0 | 3,15 | 3,27 | +0,13 | 82,2 | 69,8 |
| XGBoost | 3,70 | 4,53 | +0,83 | - | - |
| SARIMAX-W | 4,73 | 4,24 | -0,49 | 84,5 | 89,5 |
| SNaive-168 | 6,79 | 5,63 | -1,17 | - | - |
| SARIMAX-DHR | 5,13 | 11,79 | +6,66 | 90,4 | 64,5 |

Hasil per regime dapat diringkas sebagai berikut.

- **Regime Normal.** Model terbaik adalah Chronos-2 univariat (MAPE 2,74%).
- **Regime COVID-19.** Model terbaik adalah Chronos-2 dengan kovariat (MAPE 2,77%).
- **Kenaikan MAPE terbesar.** SARIMAX-DHR naik 6,66 poin persentase, diikuti XGBoost dengan kenaikan 0,83 poin persentase.
- **Model yang membaik.** SARIMAX-W dan SNaive-168 justru membaik pada regime COVID-19. Pada regime ini, SARIMAX-W (4,24%) melampaui XGBoost (4,53%).
- **Cakupan interval *foundation model*.** Seluruh *foundation model* mengalami penurunan cakupan interval 80% pada regime COVID-19, ke kisaran 69,8% sampai 76,6%.

### 4.3 Galat menurut horizon dan contoh ramalan

**Galat menurut horizon.** Karena seluruh origin berada pada pukul 00.00, horizon $h$ sekaligus menunjukkan jam dalam sehari. Pola galat per model adalah sebagai berikut.

- ***Foundation model*.** Rata-rata MAE pada $h = 1$ sampai 6 berkisar 15,2 sampai 17,6 MWh. Galat meningkat hingga mencapai puncak pada $h = 15$ (pukul 15.00), dengan MAE maksimum 49,0 MWh (Chronos-2+Kov) sampai 61,2 MWh (TimesFM), lalu menurun kembali pada malam hari.
- **SARIMAX-W.** Pola galatnya serupa, tetapi dengan puncak lebih tinggi, yaitu 80,3 MWh pada $h = 14$.
- **SARIMAX-DHR.** Model ini mencapai MAE 193,1 MWh pada $h = 14$. Galat ini terkonsentrasi pada jam siang, saat beban paling besar.
- **XGBoost.** Galatnya relatif datar, dari 34,2 MWh pada $h = 1$ sampai 6 menjadi 42,9 MWh pada $h = 19$ sampai 24. Model ini tidak memakai informasi jam-jam terakhir sebelum origin, karena seluruh lag $\geq 24$. Akibatnya, galat XGBoost pada horizon pendek dua kali lipat galat *foundation model*.
- **SNaive-168.** Galatnya hampir tidak bergantung pada horizon (58,4 sampai 66,7 MWh).

**Contoh ramalan.**

- **Minggu 3 sampai 9 Februari 2020 (regime Normal).** Chronos-2 dengan kovariat dan XGBoost memiliki akurasi yang mirip, dengan MAE mingguan 22,1 dan 24,5 MWh.
- **Minggu 6 sampai 12 April 2020 (regime COVID-19, memuat libur Pekan Suci).** Indikator `holiday` bernilai 1 pada 9 sampai 12 April. MAE mingguan Chronos-2 dengan kovariat adalah 28,0 MWh, Chronos-2 29,9 MWh, XGBoost 38,5 MWh, dan SARIMAX-DHR 178,5 MWh. Galat semua model meningkat pada 9 dan 10 April. Pada dua hari tersebut, MAE Chronos-2 dengan kovariat adalah 37,3 dan 38,3 MWh, sedangkan MAE XGBoost 48,1 dan 55,8 MWh.

### 4.4 Uji Diebold-Mariano

Model A dalam setiap pasangan adalah Chronos-2+Kov, yaitu model dengan MAE keseluruhan terendah.

| Model B | Semua (selisih MAE; *p*) | Normal (selisih MAE; *p*) | COVID-19 (selisih MAE; *p*) |
|---|---|---|---|
| Chronos-2 | -0,60; 0,531 | +1,41; 0,437 | -2,03; **0,033** |
| Chronos-Bolt | -4,36; **0,004** | -3,52; 0,221 | -4,96; **0,001** |
| TimesFM-2.0 | -5,08; **0,002** | -3,96; 0,107 | -5,88; **0,006** |
| XGBoost | -15,71; **< 0,001** | -11,31; 0,074 | -18,85; **0,003** |
| SARIMAX-W | -20,22; **< 0,001** | -25,11; **< 0,001** | -16,74; **< 0,001** |
| SARIMAX-DHR | -69,35; **< 0,001** | -29,35; **< 0,001** | -97,80; **< 0,001** |
| SNaive-168 | -38,77; **< 0,001** | -49,55; **< 0,001** | -31,09; **< 0,001** |

Selisih MAE dinyatakan dalam MWh, dan nilai *p* yang dicetak tebal signifikan pada $\alpha = 5\%$. Hasil uji dapat diringkas sebagai berikut.

- **Keseluruhan periode.** Chronos-2+Kov signifikan lebih akurat daripada semua model kecuali Chronos-2 univariat.
- **Regime Normal (74 hari).** Keunggulan atas Chronos-Bolt, TimesFM, dan XGBoost tidak signifikan, sedangkan keunggulan atas model statistik tetap signifikan.
- **Regime COVID-19 (104 hari).** Seluruh selisih signifikan, termasuk terhadap Chronos-2 univariat.

**Tabel 4.3** Uji Diebold-Mariano (HAC Newey-West, lag 5)

| Model A | Model B | Regime | Selisih MAE (A-B) | DM | p-value | Kesimpulan (alpha 5%) |
| --- | --- | --- | --- | --- | --- | --- |
| Chronos-2+Kov | Chronos-2 | Semua | -0.604 | -0.628 | 0.531 | Tidak berbeda signifikan |
| Chronos-2+Kov | Chronos-2 | Normal | 1.407 | 0.782 | 0.437 | Tidak berbeda signifikan |
| Chronos-2+Kov | Chronos-2 | COVID-19 | -2.034 | -2.165 | 0.033 | A lebih akurat |
| Chronos-2+Kov | Chronos-Bolt | Semua | -4.362 | -2.955 | 0.004 | A lebih akurat |
| Chronos-2+Kov | Chronos-Bolt | Normal | -3.520 | -1.233 | 0.221 | Tidak berbeda signifikan |
| Chronos-2+Kov | Chronos-Bolt | COVID-19 | -4.960 | -3.357 | 0.001 | A lebih akurat |
| Chronos-2+Kov | TimesFM-2.0 | Semua | -5.085 | -3.219 | 0.002 | A lebih akurat |
| Chronos-2+Kov | TimesFM-2.0 | Normal | -3.965 | -1.631 | 0.107 | Tidak berbeda signifikan |
| Chronos-2+Kov | TimesFM-2.0 | COVID-19 | -5.881 | -2.827 | 0.006 | A lebih akurat |
| Chronos-2+Kov | XGBoost | Semua | -15.714 | -3.512 | 0.001 | A lebih akurat |
| Chronos-2+Kov | XGBoost | Normal | -11.311 | -1.815 | 0.074 | Tidak berbeda signifikan |
| Chronos-2+Kov | XGBoost | COVID-19 | -18.848 | -3.057 | 0.003 | A lebih akurat |
| Chronos-2+Kov | SARIMAX-W | Semua | -20.220 | -5.475 | 0.000 | A lebih akurat |
| Chronos-2+Kov | SARIMAX-W | Normal | -25.106 | -4.108 | 0.000 | A lebih akurat |
| Chronos-2+Kov | SARIMAX-W | COVID-19 | -16.743 | -3.821 | 0.000 | A lebih akurat |
| Chronos-2+Kov | SARIMAX-DHR | Semua | -69.346 | -8.681 | 0.000 | A lebih akurat |
| Chronos-2+Kov | SARIMAX-DHR | Normal | -29.351 | -14.997 | 0.000 | A lebih akurat |
| Chronos-2+Kov | SARIMAX-DHR | COVID-19 | -97.804 | -11.710 | 0.000 | A lebih akurat |
| Chronos-2+Kov | SNaive-168 | Semua | -38.766 | -6.877 | 0.000 | A lebih akurat |
| Chronos-2+Kov | SNaive-168 | Normal | -49.547 | -4.802 | 0.000 | A lebih akurat |
| Chronos-2+Kov | SNaive-168 | COVID-19 | -31.094 | -5.661 | 0.000 | A lebih akurat |

## 5. Penyimpanan dan pemuatan ulang model

Semua model disimpan di folder `models/`:

| Berkas | Isi | Cara memuat |
|---|---|---|
| `xgb_beban.json` | Model XGBoost | `m = xgb.XGBRegressor(); m.load_model('models/xgb_beban.json')` |
| `sarimax_dhr.pkl` | Hasil estimasi SARIMAX-DHR | `SARIMAXResults.load('models/sarimax_dhr.pkl')` |
| `sarimax_w.pkl` | Parameter dan spesifikasi SARIMAX-W (versi ringan, sekitar 1 MB, tanpa matriks *smoother* dan tanpa data latih) | `SARIMAXResults.load('models/sarimax_w.pkl').apply(z_baru, exog=X_baru)` |
| `chronos-bolt-small/` | Bobot Chronos-Bolt | `BaseChronosPipeline.from_pretrained('models/chronos-bolt-small')` |
| `chronos-2/` | Bobot Chronos-2 | `BaseChronosPipeline.from_pretrained('models/chronos-2')` |
| `timesfm-2.0-500m-pytorch/` | Bobot TimesFM 2.0 | `TimesFmModelForPrediction.from_pretrained('models/timesfm-2.0-500m-pytorch')` |

Sel berikut memverifikasi bahwa model XGBoost, SARIMAX-DHR, dan SARIMAX-W yang dimuat ulang menghasilkan prediksi identik dengan hasil *backtest* (pemeriksaan `assert`), lalu memakai Chronos-2 dari folder lokal untuk meramal 24 jam setelah akhir data. Ramalan masa depan memakai Chronos-2 univariat karena nilai cuaca setelah 27 Juni 2020 tidak tersedia dalam dataset.

## 6. Pembahasan

### 6.1 Mengapa *foundation model* unggul atas model yang dibangun dengan pengetahuan domain

Keempat konfigurasi *foundation model* menempati empat peringkat teratas, padahal tidak satu pun parameternya diestimasi pada data Panama. Tiga mekanisme diduga menjelaskan temuan ini.

1. **Konteks panjang sebagai pengganti estimasi.** Konteks 2.048 jam (sekitar 12 minggu) memuat lebih dari dua belas siklus mingguan dan sekitar 85 siklus harian. Dengan konteks sepanjang itu, model dapat membaca bentuk musiman ganda, level terkini, dan variasi antarminggu langsung dari data terbaru. Pada model statistik, struktur yang sama harus dispesifikasikan secara eksplisit oleh analis, misalnya orde ARIMA atau jumlah harmonik Fourier. Kesalahan spesifikasi pada tahap ini langsung menjadi galat ramalan.
2. **Adaptasi tanpa pelatihan ulang.** Setiap origin memberi konteks baru, sehingga *foundation model* secara otomatis menyesuaikan diri dengan level beban yang baru setelah pembatasan COVID-19. Sebaliknya, XGBoost, SARIMAX-W, dan SARIMAX-DHR memakai parameter hasil estimasi 2019 yang tidak diperbarui selama periode uji. Sebagian keunggulan *foundation model* karenanya berasal dari desain evaluasi tanpa pelatihan ulang. Pelatihan ulang bergulir pada model domain dapat mempersempit selisih tersebut, dan hal ini menjadi saran penelitian lanjutan.
3. **Pengetahuan pra-pelatihan.** Pola beban listrik, yaitu musiman harian dan mingguan yang kuat dengan level yang bergeser perlahan, merupakan pola yang lazim pada korpus deret waktu publik. Model yang telah melihat banyak deret sejenis memiliki *prior* yang tepat untuk tipe deret ini. Konsekuensinya, terdapat risiko kontaminasi: jika dataset Panama atau deret beban serupa termasuk dalam korpus pra-pelatihan, akurasi *zero-shot* dapat terlihat lebih baik daripada kinerja pada deret yang benar-benar baru `[RUJUKAN DIPERLUKAN: daftar dataset pra-pelatihan Chronos-2 dan TimesFM 2.0; periksa apakah dataset Panama (Aguilar Madrid, 2021) termasuk]`.

Perbedaan di antara *foundation model* juga informatif. Chronos-2 (119,5 juta parameter) lebih akurat daripada TimesFM 2.0 (498,8 juta parameter) dan Chronos-Bolt (47,7 juta parameter). Jumlah parameter bukan penentu utama akurasi untuk deret ini; arsitektur dan korpus pelatihan lebih berpengaruh. Dari sisi biaya, Chronos-Bolt meramal 178 jendela dalam 12,7 detik di CPU dengan MAPE 3,18%, sehingga menawarkan rasio akurasi terhadap biaya yang paling baik.

### 6.2 Peran kovariat cuaca dan kalender

Penambahan kovariat menurunkan MAE Chronos-2 sebesar 0,60 MWh untuk keseluruhan periode, tetapi selisih ini tidak signifikan ($p = 0{,}53$). Pada regime Normal, kovariat justru sedikit memperburuk akurasi (+1,41 MWh, tidak signifikan). Pada regime COVID-19, kovariat memperbaiki akurasi secara signifikan (−2,03 MWh; $p = 0{,}033$). Pola ini sejalan dengan temuan eksploratif pada Subbab 2.5: dalam kondisi normal, riwayat beban sudah memuat hampir seluruh informasi yang dapat diramalkan. Kovariat baru bernilai ketika riwayat kurang informatif, yaitu setelah perubahan regime.

Kovariat mana yang memberi manfaat? Indikator `school` tetap bernilai 1 sepanjang Maret sampai Juni 2020 karena mengikuti kalender akademik resmi dan tidak mencatat penutupan sekolah akibat COVID-19. Dengan demikian, variabel ini tidak membawa informasi tentang pembatasan. Kandidat yang lebih masuk akal adalah (a) indikator `holiday`, karena April 2020 memuat 96 jam libur nasional yang tidak dapat diantisipasi dari pola minggu sebelumnya, dan (b) suhu, yang naik dari rata-rata 26,96 °C pada Januari menjadi 28,19 °C pada April dan 28,12 °C pada Mei di Tocumen. Atribusi yang pasti memerlukan analisis ablasi per kovariat, yang menjadi saran penelitian lanjutan.

Kovariat cuaca dalam analisis ini adalah nilai observasi, bukan ramalan cuaca, sehingga manfaatnya merupakan batas atas (*oracle*). Dalam operasi nyata, ramalan suhu 24 jam ke depan memiliki galat. Manfaat kovariat suhu karenanya akan lebih kecil, sedangkan manfaat indikator kalender tetap utuh karena kalender diketahui pasti sebelumnya.

### 6.3 Ketangguhan terhadap perubahan struktural COVID-19

Perubahan MAPE dari regime Normal ke regime COVID-19 membedakan model secara tegas.

- ***Foundation model*** relatif stabil: Chronos-2 naik dari 2,74% menjadi 2,94%, Chronos-Bolt dari 3,13% menjadi 3,22%, dan TimesFM dari 3,15% menjadi 3,27%. Chronos-2 dengan kovariat justru membaik dari 2,82% menjadi 2,77%.
- **XGBoost** memburuk dari 3,70% menjadi 4,53% (naik sekitar 23%). Fitur kalender (bulan dan hari ke-) mempelajari hubungan musiman pada level beban sebelum 2020. Setelah level turun 14%, hubungan tersebut menghasilkan bias ke atas yang hanya sebagian dikoreksi oleh fitur lag.
- **SARIMAX-W** membaik dari 4,73% menjadi 4,24% dan pada regime COVID-19 melampaui XGBoost. Pembedaan musiman 168 jam membuat model selalu berangkat dari pola minggu lalu, sehingga pergeseran level dan perubahan bentuk profil harian terserap dalam satu minggu.
- **SNaive-168** juga membaik (dari 6,79% menjadi 5,63%). Dugaannya, regime Normal memuat lebih banyak transisi kalender (Tahun Baru, kembalinya aktivitas awal Januari, dan Karnaval pada Februari) yang membuat pola minggu lalu kurang representatif. Setelah penurunan awal, beban COVID-19 justru relatif datar dari minggu ke minggu.
- **SARIMAX-DHR** gagal paling parah, dari 5,13% menjadi 11,79%. Model ini memakai bentuk musiman deterministik (suku Fourier dengan koefisien tetap dari 2019) dan tidak memiliki interaksi antara pola harian dan pola mingguan. Ketika pembatasan mengubah bentuk profil harian (beban komersial siang hari turun lebih besar daripada beban dini hari), galat ARIMA(2,1,1) hanya mampu mengoreksi level, tidak bentuk. Kasus ini menunjukkan risiko model yang terlalu bergantung pada struktur deterministik yang diestimasi dari satu regime.

Pelajaran metodologisnya: dalam kondisi perubahan struktural, model yang mengkondisikan diri pada data terbaru (*foundation model* melalui konteks, SARIMAX-W melalui pembedaan musiman) lebih tangguh daripada model yang mengandalkan struktur tetap hasil estimasi masa lalu.

### 6.4 Kalibrasi interval prediksi

Pada regime Normal, cakupan interval 80% *foundation model* mendekati nominal: 77,4% untuk Chronos-2 dengan kovariat dan 78,4% untuk Chronos-2. Chronos-Bolt (84,7%) dan TimesFM (82,2%) sedikit terlalu lebar. Pada regime COVID-19, seluruh *foundation model* menghasilkan interval yang terlalu sempit, dengan cakupan 69,8% (TimesFM) sampai 76,6% (Chronos-Bolt). Model mempelajari tingkat ketidakpastian dari konteks yang sebagian besar masih berasal dari periode sebelum perubahan. Akibatnya, ketidakpastian setelah perubahan regime cenderung diremehkan. SARIMAX-DHR menunjukkan pola ekstrem: interval terlalu lebar pada regime Normal (90,4%) dan terlalu sempit pada regime COVID-19 (64,5%), karena varians galatnya tetap dari estimasi 2019. SARIMAX-W menghasilkan interval yang terlalu lebar pada kedua regime (84,5% dan 89,5%), karena $\sigma^2$ hasil estimasi 2019 diduga membesar akibat anomali Januari 2019 dan galat besar di sekitar hari libur. Interval analitik berasumsi Gaussian juga tidak menangkap kesalahan spesifikasi bentuk musiman.

Untuk penggunaan operasional, interval dari *foundation model* sebaiknya dikalibrasi ulang, misalnya dengan *conformal prediction* bergulir yang menyesuaikan lebar interval berdasarkan galat terbaru `[RUJUKAN DIPERLUKAN: metode conformal prediction adaptif untuk deret waktu]`.

### 6.5 Posisi hasil terhadap penelitian terdahulu

Aguilar Madrid dan Antonio (2021) memakai dataset yang sama untuk horizon mingguan (168 jam) dengan model *machine learning*, dengan periode uji sebelum pandemi. Karena horizon, periode uji, dan definisi galat berbeda, angka dalam penelitian ini tidak dapat dibandingkan secara langsung dengan angka mereka. Kesamaannya terletak pada temuan bahwa variabel kalender dan pola musiman merupakan prediktor utama. Penelitian ini menambahkan dua hal: pembanding *foundation model zero-shot* dan pengujian pada periode perubahan struktural. Klaim pengembang bahwa Chronos-2 paling diuntungkan pada tugas yang memiliki kovariat `[verifikasi pada Ansari dkk., 2025]` hanya didukung sebagian oleh data Panama, karena manfaat kovariat signifikan pada regime COVID-19 tetapi tidak pada regime Normal.

### 6.6 Keterbatasan

1. **Kovariat *oracle*.** Cuaca observasi dipakai sebagai kovariat masa depan, sehingga akurasi model berkovariat merupakan batas atas.
2. **Satu deret dan satu negara.** Generalisasi ke sistem lain, misalnya sistem dengan puncak malam hari, memerlukan pengujian tambahan.
3. **Tanpa pelatihan ulang dan tanpa penyetelan hiperparameter.** Pada model domain, keputusan ini membuat perbandingan konservatif bagi model domain.
4. **Kekuatan uji terbatas.** Uji Diebold-Mariano pada regime Normal hanya memakai 74 hari, sehingga beberapa selisih yang cukup besar tidak signifikan.
5. **Kualitas pengukuran variabel kalender.** Indikator `school` tidak mencatat penutupan sekolah tahun 2020.
6. **Model yang tidak dijalankan.** Moirai, Lag-Llama, dan TimeGPT hanya dibahas secara konseptual.
7. **Kemungkinan kontaminasi data pra-pelatihan**, sebagaimana dijelaskan pada Subbab 6.1.

## 7. Kesimpulan dan saran

### 7.1 Kesimpulan

1. **Karakteristik data.** Beban listrik Panama didominasi musiman harian (kekuatan 0,906; puncak sekitar pukul 13.00 dengan rasio puncak terhadap lembah 1,61) dan musiman mingguan (kekuatan 0,712). Tren tahunannya tumbuh 2 sampai 3% per tahun, dan efek hari libur signifikan (sekitar −12,8% pada hari kerja; $p < 0{,}001$). Pembatasan COVID-19 menurunkan beban rata-rata sebesar 14,3%. Hubungan suhu dengan beban pada skala harian lemah ($r \approx 0{,}11$ sampai $0{,}15$) karena variasi suhu antarhari kecil.
2. **Akurasi *foundation model*.** Ketiga *foundation model* yang dijalankan secara *zero-shot* lebih akurat daripada seluruh model statistik dan XGBoost. Chronos-2 univariat mencapai MAPE 2,85%, Chronos-Bolt 3,18%, dan TimesFM 2.0 3,22%. Sebagai pembanding, XGBoost mencapai 4,19%, SARIMAX-W 4,44%, SNaive-168 6,11%, dan SARIMAX-DHR 9,02%.
3. **Manfaat kovariat.** Kovariat cuaca dan kalender menjadikan Chronos-2 model terbaik (MAPE 2,79%). Manfaatnya terhadap Chronos-2 univariat hanya signifikan pada regime COVID-19 ($p = 0{,}033$).
4. **Ketangguhan terhadap COVID-19.** *Foundation model* dan SARIMAX-W tetap stabil setelah perubahan struktural. XGBoost memburuk sekitar 23%, dan SARIMAX-DHR gagal (MAPE 11,79%) karena bentuk musiman deterministiknya tidak lagi sesuai.
5. **Signifikansi.** Keunggulan Chronos-2 dengan kovariat atas Chronos-Bolt, TimesFM, XGBoost, SARIMAX-W, SARIMAX-DHR, dan SNaive-168 signifikan untuk keseluruhan periode ($p < 0{,}01$). Selisihnya terhadap Chronos-2 univariat tidak signifikan untuk keseluruhan periode.

### 7.2 Saran

1. **Bagi praktik peramalan**, Chronos-2 (dengan kovariat kalender) dapat dijadikan acuan awal yang wajib dikalahkan sebelum model baru diadopsi. Interval prediksinya perlu dikalibrasi ulang, misalnya dengan *conformal prediction* bergulir.
2. **Bagi penelitian lanjutan:**
   - (a) Mengulang perbandingan dengan ramalan cuaca, bukan cuaca observasi.
   - (b) Menerapkan pelatihan ulang bergulir pada XGBoost dan SARIMAX-W agar perbandingannya setara dalam hal pemakaian data terbaru.
   - (c) Melakukan ablasi per kovariat untuk mengidentifikasi sumber manfaat pada regime COVID-19.
   - (d) Melakukan *fine-tuning* Chronos-2 pada data Panama sebelum 2020.
   - (e) Menjalankan Moirai dan Lag-Llama di lingkungan Python terpisah.
   - (f) Memperluas horizon ke 168 jam agar sebanding dengan Aguilar Madrid dan Antonio (2021).
3. **Bagi kualitas data**, indikator `school` perlu diperbarui agar mencerminkan penutupan sekolah aktual pada 2020.

## Daftar pustaka

Format mengikuti APA edisi ke-7. Seluruh rujukan telah dicek keberadaannya (judul, penulis, tahun, dan pengenal arXiv/DOI) melalui pencarian pada sesi penyusunan notebook ini.

- Aguilar Madrid, E., & Antonio, N. (2021). Short-term electricity load forecasting with machine learning. *Information, 12*(2), 50. https://doi.org/10.3390/info12020050
- Aguilar Madrid, E. `[verifikasi daftar pengunggah]` (2021). *Short-term electricity load forecasting (Panama case study)* [Data set]. Mendeley Data. https://doi.org/10.17632/byx7sztj59.1
- Ansari, A. F., dkk. (2024). Chronos: Learning the language of time series. *arXiv*. https://arxiv.org/abs/2403.07815
- Ansari, A. F., dkk. (2025). Chronos-2: From univariate to universal forecasting. *arXiv*. https://arxiv.org/abs/2510.15821
- Das, A., Kong, W., Sen, R., & Zhou, Y. (2024). A decoder-only foundation model for time-series forecasting. *arXiv*. https://arxiv.org/abs/2310.10688
- Garza, A., Challu, C., & Mergenthaler-Canseco, M. (2023). TimeGPT-1. *arXiv*. https://arxiv.org/abs/2310.03589
- Rasul, K., dkk. (2023). Lag-Llama: Towards foundation models for probabilistic time series forecasting. *arXiv*. https://arxiv.org/abs/2310.08278
- Woo, G., dkk. (2024). Unified training of universal time series forecasting transformers. *arXiv*. https://arxiv.org/abs/2402.02592

Catatan verifikasi: untuk rujukan bertanda "dkk.", pencarian hanya mengonfirmasi judul, pengenal arXiv, dan penulis pertama; daftar penulis lengkap perlu disalin dari halaman arXiv sebelum dipakai di naskah resmi. Rujukan untuk Diebold-Mariano (1995), Newey-West (1987), MSTL, dan regresi harmonik dinamis belum dicantumkan `[RUJUKAN DIPERLUKAN: Diebold & Mariano (1995) Journal of Business & Economic Statistics; Newey & West (1987) Econometrica; Hyndman & Athanasopoulos, Forecasting: Principles and Practice]`.
