# Peramalan Beban Listrik Per Jam Panama dengan Chronos-2, Chronos-Bolt, TimesFM 2.0, dan XGBoost

**Abstrak.** Penjadwalan pembangkit listrik bergantung pada ramalan beban per jam untuk hari berikutnya. Penelitian ini membandingkan tiga *foundation model* deret waktu yang dijalankan secara *zero-shot*, yaitu Chronos-2, Chronos-Bolt, dan TimesFM 2.0, dengan model *machine learning* XGBoost untuk meramal beban listrik nasional Panama 24 jam ke depan. Chronos-2 diuji dalam dua konfigurasi: tanpa kovariat dan dengan kovariat cuaca serta kalender. Evaluasi memakai *rolling-origin backtest* dengan 178 origin harian (1 Januari sampai 26 Juni 2020) yang mencakup regime Normal dan regime pembatasan COVID-19. Ukuran akurasi yang dipakai adalah MAE, RMSE, MAPE, MASE, *weighted quantile loss* (WQL), dan cakupan interval 80%, disertai uji Diebold-Mariano. Chronos-2 dengan kovariat menghasilkan galat terendah (MAPE 2,79%; MAE 32,9 MWh; MASE 0,564). Urutan berikutnya adalah Chronos-2 tanpa kovariat (2,85%), Chronos-Bolt (3,18%), TimesFM 2.0 (3,22%), dan XGBoost (4,19%). Keunggulan Chronos-2 dengan kovariat atas Chronos-Bolt, TimesFM, dan XGBoost signifikan ($p < 0{,}01$). Manfaat kovariat hanya signifikan pada regime COVID-19 ($p = 0{,}033$). Analisis cuaca tiga kota menunjukkan bahwa korelasi suhu dan beban yang tinggi pada data per jam ($r \approx 0{,}63$ sampai $0{,}65$) sebagian besar berasal dari pola harian bersama. Di dalam jam yang sama, korelasinya hanya $r \approx 0{,}11$ sampai $0{,}13$. Simulasi skenario suhu menunjukkan bahwa kenaikan suhu 1 °C di Tocumen menaikkan ramalan rata-rata sekitar 4,5 MWh per jam pada XGBoost dan 12,0 MWh per jam pada Chronos-2 dengan kovariat.

**Kata kunci:** peramalan beban jangka pendek; *foundation model* deret waktu; Chronos-2; XGBoost; uji Diebold-Mariano; COVID-19.

> **Cara membaca laporan ini.** Notebook `Analisis_Forecasting_Beban_Listrik_Panama.ipynb` disusun bertahap (Tahap 0 sampai 10). Setiap sel *markdown* di notebook hanya berisi satu kalimat, sedangkan penjelasan rinci setiap tahap ada di laporan ini. Angka pada tabel berasal dari folder `outputs/`. Grafik interaktif tersedia di dashboard (`dashboard/index.html`).

| Tahap di notebook | Isi | Subbab laporan |
|---|---|---|
| 0–1 | Persiapan dan memuat data | 2 |
| 2 | Prapemrosesan | 3 |
| 3 | Analisis eksploratif beban | 4 |
| 4 | Analisis cuaca tiga kota | 5 |
| 5 | Pemodelan | 6 |
| 6 | Evaluasi | 7 |
| 7 | Simulasi skenario suhu | 8 |
| 8 | Ramalan 24 jam ke depan | 9 |
| 9–10 | Penyimpanan model dan ekspor dashboard | 10 |

## 1. Pendahuluan

### 1.1 Latar belakang

Operator sistem tenaga listrik harus menyeimbangkan pasokan dan permintaan setiap jam. Ramalan beban yang terlalu rendah memaksa pengoperasian pembangkit cadangan berbiaya tinggi, sedangkan ramalan yang terlalu tinggi menimbulkan kapasitas siaga yang tidak terpakai `[RUJUKAN DIPERLUKAN: kuantifikasi biaya kesalahan peramalan beban jangka pendek]`. Karena itu, peramalan beban jangka pendek (*short-term load forecasting*, STLF) menjadi salah satu masalah peramalan deret waktu yang paling banyak dikaji.

Data yang dianalisis adalah beban listrik nasional Panama per jam yang dipublikasikan oleh Aguilar Madrid dan Antonio (2021) beserta dataset pendampingnya. Dataset memuat beban nasional, variabel cuaca dari tiga kota (Tocumen di Kota Panama, Santiago, dan David), serta indikator hari libur dan masa sekolah.

Dalam beberapa tahun terakhir muncul *foundation model* deret waktu, yaitu jaringan *transformer* yang dilatih sekali pada korpus deret waktu lintas domain berukuran sangat besar, lalu dipakai untuk meramal deret baru tanpa pelatihan ulang (*zero-shot*). Contohnya Chronos (Ansari dkk., 2024), Chronos-2 (Ansari dkk., 2025), dan TimesFM (Das dkk., 2024). Pertanyaan praktisnya: apakah model tanpa estimasi parameter pada data lokal ini mampu menyaingi model *machine learning* yang dilatih khusus pada data Panama dengan fitur kalender, lag, dan cuaca?

Data Panama juga memuat ujian ketangguhan yang alami. Mulai pertengahan Maret 2020, pembatasan aktivitas akibat COVID-19 menurunkan beban rata-rata sekitar 14%. Perubahan struktural ini tidak pernah dilihat model selama pelatihan, sehingga periode tersebut menguji kemampuan adaptasi setiap pendekatan.

### 1.2 Rumusan masalah

1. Bagaimana karakteristik deret beban listrik Panama, yaitu tren, musiman harian dan mingguan, serta pengaruh hari libur?
2. Bagaimana hubungan cuaca di Tocumen, Santiago, dan David dengan beban listrik nasional?
3. Seberapa akurat Chronos-2, Chronos-Bolt, dan TimesFM 2.0 secara *zero-shot* dibandingkan XGBoost untuk peramalan 24 jam ke depan?
4. Apakah penambahan kovariat cuaca dan kalender pada Chronos-2 meningkatkan akurasi, termasuk pada periode COVID-19?
5. Apakah perbedaan akurasi antarmodel signifikan menurut uji Diebold-Mariano?
6. Seberapa sensitif ramalan terhadap perubahan suhu di setiap kota?

### 1.3 Tujuan

Penelitian ini bertujuan (a) mendeskripsikan pola beban listrik Panama dan hubungannya dengan cuaca tiga kota, (b) membandingkan akurasi titik dan akurasi probabilistik empat model melalui *backtest* bergulir, (c) mengukur kontribusi kovariat pada Chronos-2, (d) menguji signifikansi perbedaan akurasi, dan (e) menyimulasikan respons ramalan terhadap skenario suhu.

### 1.4 Batasan

- Horizon peramalan 24 jam (*day-ahead*) dengan origin setiap pukul 00.00, sebanyak 178 origin dari 1 Januari sampai 26 Juni 2020.
- Kovariat cuaca memakai nilai observasi, bukan ramalan cuaca. Akurasi model yang memakai cuaca (Chronos-2 dengan kovariat dan XGBoost) karenanya merupakan batas atas (*oracle*).
- *Foundation model* dijalankan *zero-shot* di CPU tanpa *fine-tuning*. XGBoost dilatih sekali pada data sebelum 2020 dan tidak dilatih ulang selama periode uji.
- Empat model dipilih dari analisis sebelumnya. SARIMAX, regresi harmonik dinamis, dan *seasonal naive* tidak lagi dibahas sebagai model. Galat *seasonal naive* hanya dipakai sebagai penyebut MASE.

### 1.5 *Foundation model* deret waktu

**Konsep.** *Foundation model* deret waktu adalah model berparameter besar yang dilatih satu kali pada kumpulan deret dari banyak domain, kemudian dipakai langsung pada deret baru. Dari sudut pandang statistika, model ini memperkirakan distribusi prediktif bersyarat

$$p\left(y_{T+1:T+H} \mid y_{T-C+1:T},\; \mathbf{x}\right)$$

secara langsung. Jendela konteks sepanjang $C$ titik berperan sebagai data pengkondisi (*in-context learning*), bukan sebagai data untuk mengestimasi parameter. Pengetahuan tentang bentuk musiman, tren, dan derau yang lazim berasal dari pra-pelatihan, sehingga fungsinya mirip *prior* yang sangat informatif.

**Perbandingan paradigma.**

| Aspek | *Machine learning* (XGBoost) | *Foundation model* (Chronos-2, Chronos-Bolt, TimesFM) |
|---|---|---|
| Cakupan model | Satu model per dataset | Satu model untuk semua deret |
| Estimasi | Pelatihan pada data lokal | Tidak ada; hanya inferensi |
| Asumsi | Rekayasa fitur oleh analis | Implisit, dipelajari dari korpus |
| Ketidakpastian | Perlu metode tambahan | Kuantil langsung |
| Adaptasi pada data baru | Perlu pelatihan ulang | Otomatis melalui konteks terbaru |
| Interpretabilitas | Sedang (kepentingan fitur) | Rendah |

**Model yang dipakai.**

| Model | Pengembang | Arsitektur dan gagasan kunci | Keluaran | Kovariat |
|---|---|---|---|---|
| Chronos-2 (Ansari dkk., 2025) | Amazon | *Encoder transformer* dengan *group attention* untuk *in-context learning* lintas target dan kovariat | Kuantil | Ya, masa lalu dan masa depan |
| Chronos-Bolt (*small*) | Amazon | Varian Chronos (Ansari dkk., 2024) berbasis *patch* yang langsung menghasilkan kuantil untuk banyak langkah sekaligus | Kuantil 0,1 sampai 0,9 | Tidak |
| TimesFM 2.0 (Das dkk., 2024) | Google | *Decoder-only* dengan masukan berupa *patch*, 500 juta parameter | Rata-rata dan kuantil | Tidak (versi yang dipakai) |
| XGBoost (Chen & Guestrin, 2016) | Komunitas *open source* | *Gradient boosting* pohon keputusan | Satu nilai titik | Ya, sebagai fitur |

## 2. Persiapan dan data (Tahap 0–1)

**Tahap 0** memuat pustaka (pandas, statsmodels, xgboost, chronos-forecasting, dan transformers), lalu menetapkan horizon $H = 24$ jam, panjang konteks $C = 2.048$ jam, kuantil $\tau \in \{0{,}1, \dots, 0{,}9\}$, awal periode uji (1 Januari 2020), dan awal regime COVID-19 (15 Maret 2020). *Seed* acak ditetapkan agar hasil dapat diulang.

**Tahap 1** membaca lembar `data` pada berkas Excel dan menetapkan indeks waktu berfrekuensi per jam. Data terdiri atas 48.048 observasi (3 Januari 2015 pukul 01.00 sampai 27 Juni 2020 pukul 00.00) dalam zona waktu Panama (UTC−05.00). Variabel respons adalah `nat_demand`, yaitu beban listrik nasional (MWh). Variabel penjelas terdiri atas:

- **Cuaca** di tiga kota (akhiran `_toc` untuk Tocumen, `_san` untuk Santiago, `_dav` untuk David): suhu 2 m (`T2M`), kelembapan 2 m (`QV2M`), presipitasi cair (`TQL`), dan kecepatan angin 2 m (`W2M`).
- **Kalender**: `holiday` (indikator hari libur nasional), `Holiday_ID` (jenis hari libur), dan `school` (indikator masa sekolah).

Lembar `deskripsi` mencatat bahwa satuan kelembapan, presipitasi, dan angin bersumber dari README dataset. Nilai `QV2M` yang berkisar 0,01 sampai 0,02 lebih sesuai dengan kelembapan spesifik (kg/kg) daripada kelembapan relatif (%), sehingga satuan ini perlu diverifikasi pada sumber aslinya.

## 3. Prapemrosesan (Tahap 2)

### 3.1 Pemeriksaan kualitas data

Pemeriksaan pertama menghitung nilai hilang, stempel waktu ganda, jam yang terlewat, dan beban tidak positif. Keempatnya bernilai nol, sehingga tidak diperlukan imputasi maupun penyesuaian frekuensi.

### 3.2 Deteksi anomali

Anomali didefinisikan sebagai simpangan terhadap median bergulir 168 jam yang melebihi 5 kali MAD terskala ($1{,}4826 \times \text{MAD}$), dengan ambang sekitar 1.079 MWh. Kriteria ini hanya menandai dua titik, yaitu 20 Januari 2019 pukul 12.00 (85,2 MWh) dan pukul 13.00 (135,8 MWh). Hari tersebut adalah hari Minggu dan bukan hari libur nasional. Beban pulih bertahap pada pukul 14.00 (263,6 MWh) dan 15.00 (417,4 MWh). Pola penurunan mendadak lalu pemulihan bertahap ini lebih konsisten dengan gangguan pasokan atau kesalahan pencatatan daripada perubahan perilaku konsumen `[RUJUKAN DIPERLUKAN: konfirmasi gangguan sistem 20 Januari 2019 dari operator CND Panama]`.

Anomali tidak dikoreksi karena jumlahnya sangat kecil (kurang dari 0,01% observasi) dan berada di luar periode uji. Median bergulir juga sengaja tidak menandai penurunan COVID-19, karena median beradaptasi terhadap pergeseran level dalam satu minggu. Dengan demikian, gangguan sesaat (anomali titik) dibedakan dari perubahan regime (perubahan struktural).

### 3.3 Rekayasa fitur untuk XGBoost

Fungsi `make_features` menyusun 26 fitur:

- **Kalender**: jam (0–23), hari dalam minggu, bulan, dan hari ke-$n$ dalam tahun.
- **Lag beban**: $y_{t-24}, y_{t-48}, y_{t-72}, y_{t-168}, y_{t-336}$.
- **Rata-rata bergulir**: rata-rata 24 jam dan 168 jam dari deret yang sudah digeser 24 jam.
- **Cuaca**: 12 variabel cuaca tiga kota pada jam yang diramal.
- **Kalender khusus**: `Holiday_ID`, `holiday`, dan `school`.

Semua lag minimal 24 jam. Untuk origin pukul 00.00 dan horizon $h \le 24$, nilai $y_{t-24}$ selalu sudah diketahui pada saat origin, sehingga satu model sah dipakai untuk seluruh horizon tanpa kebocoran informasi. Baris lengkap (tanpa nilai hilang akibat lag) berjumlah 47.712. Fungsi yang sama dipakai lagi pada Tahap 8 untuk menyusun fitur masa depan.

### 3.4 Desain *rolling-origin backtest*

Setiap hari pukul 00.00 (origin $T$), setiap model hanya melihat data hingga $T$ lalu meramal $y_{T+1}, \dots, y_{T+24}$. Origin bergeser satu hari dari 1 Januari sampai 26 Juni 2020, sehingga diperoleh 178 origin × 24 jam = 4.272 pasangan ramalan-aktual per model. Origin dibagi menjadi dua regime:

- **Normal**: origin 1 Januari sampai 14 Maret 2020 (74 hari).
- **COVID-19**: origin 15 Maret sampai 26 Juni 2020 (104 hari).

Skala MASE adalah rata-rata galat absolut *seasonal naive* mingguan, $|y_t - y_{t-168}|$, pada data sebelum 2020, yaitu 58,37 MWh.

### 3.5 Konteks dan kovariat *foundation model*

Pada setiap origin, *foundation model* menerima 2.048 jam terakhir (sekitar 85 hari, atau lebih dari 12 siklus mingguan). Untuk Chronos-2 dengan kovariat, setiap masukan berisi tiga bagian:

- `target`: beban 2.048 jam terakhir.
- `past_covariates`: enam kovariat pada 2.048 jam yang sama, yaitu suhu tiga kota, kelembapan Tocumen, `holiday`, dan `school`.
- `future_covariates`: enam kovariat yang sama untuk 24 jam yang diramal.

Bobot model diunduh sekali dari Hugging Face ke folder `models/` melalui fungsi `local_model`, lalu selalu dimuat dari folder lokal.

## 4. Analisis eksploratif beban (Tahap 3)

### 4.1 Tren tahunan

Rata-rata beban tahunan meningkat dari 1.131,5 MWh (2015) menjadi 1.243,6 MWh (2019), dengan laju pertumbuhan 2,27%, 2,17%, 1,98%, dan 3,14% per tahun (sekitar 2,4% per tahun secara majemuk). Rata-rata 2020 tercatat 5,90% lebih rendah daripada 2019. Angka ini tidak setara dengan laju tahunan lain karena data 2020 hanya mencakup Januari sampai Juni dan memuat pembatasan COVID-19.

### 4.2 Perubahan struktural COVID-19

Rata-rata beban pada regime Normal (1 Januari sampai 14 Maret 2020) adalah 1.277,3 MWh, sedangkan pada regime COVID-19 (15 Maret sampai 26 Juni 2020) adalah 1.094,1 MWh, atau turun 14,3%. Perubahan ini berupa pergeseran level yang persisten, bukan pencilan sesaat. Grafik deret per jam dan rata-rata mingguan memperlihatkan bahwa penurunan terkonsentrasi setelah pertengahan Maret 2020.

### 4.3 Musiman harian, musiman mingguan, dan efek hari libur

Peta panas rata-rata beban per jam × hari (2019) memperlihatkan dua pola musiman yang saling bertumpuk:

- **Musiman harian.** Beban terendah terjadi sekitar pukul 04.00 sampai 06.00 dan puncaknya sekitar pukul 13.00. Rasio puncak terhadap lembah sebesar 1,61 berarti beban siang hari sekitar 61% lebih tinggi daripada dini hari. Puncak siang hari, bukan malam hari, merupakan ciri sistem tropis dengan beban pendingin ruangan dan aktivitas komersial yang dominan `[RUJUKAN DIPERLUKAN: karakteristik kurva beban harian negara tropis]`.
- **Musiman mingguan.** Senin sampai Jumat relatif setara. Beban turun pada Sabtu dan lebih rendah lagi pada Minggu.

**Efek hari libur.** Pada hari kerja, rata-rata beban harian saat libur nasional adalah 1.069,3 MWh, sedangkan pada hari biasa 1.226,0 MWh. Selisih sekitar 157 MWh (−12,8%; 84 hari libur) signifikan menurut uji *t* Welch ($t = -16{,}11$; $p = 3{,}99 \times 10^{-28}$). Profil harian hari libur juga lebih datar dan menyerupai profil hari Minggu. Temuan ini menjadi dasar untuk memasukkan indikator `holiday` ke Chronos-2 dengan kovariat dan ke XGBoost. Model yang hanya membaca riwayat beban tidak tahu bahwa besok adalah hari libur.

**Profil bulanan.** Rata-rata bulanan per tahun memperlihatkan beban tertinggi sekitar Maret sampai Mei, yang bertepatan dengan akhir musim kemarau dan suhu tertinggi, lalu menurun pada pertengahan tahun. Garis 2020 memperlihatkan patahan tajam mulai Maret.

### 4.4 Dekomposisi, autokorelasi, dan stasioneritas

**Dekomposisi MSTL.** Indeks kekuatan komponen $F = \max\{0,\, 1 - \operatorname{Var}(R_t)/\operatorname{Var}(S_t + R_t)\}$ bernilai 0,906 untuk musiman harian, 0,712 untuk musiman mingguan, dan 0,502 untuk tren (data 2019). Musiman harian merupakan sumber variasi paling dominan, diikuti musiman mingguan.

**Autokorelasi.** ACF bernilai 0,777 pada lag 24 dan 0,843 pada lag 168. Nilai pada lag 168 lebih tinggi daripada lag 24, artinya minggu lalu pada jam yang sama adalah prediktor yang lebih baik daripada kemarin. Temuan ini mendasari dua keputusan: konteks *foundation model* harus jauh lebih panjang dari 168 jam, dan XGBoost membutuhkan lag 168 dan 336 jam.

**Stasioneritas.** Pada rata-rata harian, uji ADF menolak hipotesis akar unit (statistik −3,559; $p = 0{,}0066$), tetapi uji KPSS juga menolak hipotesis stasioneritas (statistik 3,07; $p \le 0{,}01$). Konflik seperti ini lazim pada deret yang memiliki tren deterministik atau perubahan struktural, dalam hal ini pergeseran level COVID-19 pada akhir sampel. Setelah pembedaan pertama, kedua uji sepakat bahwa deret stasioner (ADF $p \approx 0$; KPSS $p = 0{,}10$). Keempat model yang dipakai tidak memerlukan asumsi stasioneritas, tetapi hasil ini menjelaskan mengapa model yang memakai level masa lalu tanpa pembaruan rentan terhadap pergeseran level.

## 5. Analisis cuaca tiga kota (Tahap 4)

### 5.1 Karakteristik cuaca

| Kota | Suhu rata-rata (°C) | Simpangan baku suhu (°C) | Rentang suhu (°C) |
|---|---|---|---|
| Tocumen | 27,40 | 1,68 | 22,95 – 35,04 |
| Santiago | 26,92 | 3,02 | 19,77 – 39,06 |
| David | 24,72 | 2,41 | 19,93 – 34,22 |

Tocumen, yang mewakili Kota Panama sebagai pusat beban, paling hangat dan paling stabil. Santiago memiliki variasi suhu terbesar. Ketiga kota memiliki suhu tertinggi pada Maret sampai April dan presipitasi yang meningkat mulai Mei, sesuai pola musim kemarau dan musim hujan Panama.

### 5.2 Korelasi dengan beban

**Tabel 5.1** Korelasi Pearson variabel cuaca dengan beban

| Variabel | Kota | *r* per jam | *r* harian | *r* di jam yang sama |
|---|---|---|---|---|
| Suhu | Tocumen | 0,653 | 0,153 | 0,130 |
| Suhu | Santiago | 0,627 | 0,112 | 0,106 |
| Suhu | David | 0,648 | 0,140 | 0,129 |
| Kelembapan | Tocumen | −0,037 | 0,072 | 0,080 |
| Presipitasi cair | Tocumen | 0,073 | −0,165 | −0,131 |
| Angin | Tocumen | 0,098 | −0,007 | 0,016 |

Korelasi suhu dan beban pada data per jam tampak kuat ($r \approx 0{,}63$ sampai $0{,}65$). Namun, korelasi tersebut turun drastis menjadi $0{,}11$ sampai $0{,}15$ pada rata-rata harian. Kolom “di jam yang sama” menghitung korelasi secara terpisah untuk setiap jam (0 sampai 23), lalu merata-ratakannya. Cara ini menghapus pola harian bersama, karena suhu dan beban sama-sama naik pada siang hari. Hasilnya juga hanya $0{,}11$ sampai $0{,}13$. Dengan demikian, korelasi per jam sebagian besar merupakan korelasi palsu (*spurious*) dengan jam dalam sehari sebagai faktor pengacau (*confounder*).

Presipitasi berkorelasi negatif dengan beban pada skala harian ($r = -0{,}165$ di Tocumen). Hari hujan cenderung lebih sejuk dan mengurangi kebutuhan pendingin ruangan. Kelembapan dan angin hampir tidak berhubungan dengan beban.

Grafik korelasi per jam memperlihatkan bahwa hubungan suhu dan beban paling lemah pada jam-jam transisi aktivitas, yaitu sekitar pukul 06.00, 10.00 sampai 11.00, dan 18.00. Hubungannya lebih kuat pada dini hari dan malam hari ($r \approx 0{,}15$ sampai $0{,}22$), ketika suhu lebih menentukan pemakaian pendingin ruangan rumah tangga.

### 5.3 Bentuk hubungan pada hari kerja biasa

Plot sebar suhu harian terhadap beban harian dibatasi pada hari kerja biasa sebelum 15 Maret 2020 (tanpa akhir pekan, libur, dan masa COVID-19). Pembatasan ini dipakai agar efek kalender tidak tercampur dengan efek suhu. Kemiringan regresi linearnya adalah 29,0 MWh per °C di Tocumen, 12,4 MWh per °C di Santiago, dan 21,4 MWh per °C di David. Kemiringan ini masih tercampur dengan musim dan tren tahunan (bulan panas juga bulan dengan aktivitas tinggi), sehingga tidak dapat ditafsirkan sebagai efek kausal.

### 5.4 Implikasi untuk pemodelan

Variasi suhu antarhari di Panama kecil. Simpangan baku rata-rata harian suhu Tocumen hanya 0,69 °C, sedangkan simpangan baku per jam 1,68 °C. Dengan rentang yang sempit, kontribusi cuaca untuk peramalan 24 jam diperkirakan moderat, terutama melalui deviasi suhu terhadap pola musimannya. Dugaan ini diuji pada Subbab 7 melalui perbandingan Chronos-2 dengan dan tanpa kovariat, dan pada Subbab 8 melalui simulasi skenario suhu.

Profil harian pada notebook digambar sebagai indeks (rata-rata harian = 100) agar beban dan suhu dapat dibandingkan pada satu sumbu. Beban naik lebih curam pada pagi hari dan memiliki puncak kedua sekitar pukul 19.00 yang tidak dimiliki suhu. Pola ini menunjukkan bahwa ritme aktivitas manusia lebih menentukan bentuk kurva beban daripada suhu.

## 6. Pemodelan (Tahap 5)

### 6.1 XGBoost

XGBoost membangun ramalan sebagai jumlah pohon keputusan, $\hat{y} = \sum_{m=1}^{M} f_m(\mathbf{z})$, yang dilatih bertahap untuk mengurangi galat pohon sebelumnya. Model dilatih pada data hingga Oktober 2019 (41.975 jam). Data November sampai Desember 2019 (1.464 jam) dipakai untuk *early stopping*. Hiperparameter ditetapkan pada nilai yang lazim (laju belajar 0,03, kedalaman 7, *subsample* 0,8) tanpa pencarian *grid*, agar perbandingan dengan *foundation model zero-shot* tidak memberi keunggulan penyetelan yang tidak seimbang. Iterasi terbaik adalah 151 pohon dengan MAE validasi 49,11 MWh.

Kepentingan fitur (persentase *total gain*) didominasi lag 168 jam (57,7%), lag 336 jam (18,3%), dan lag 24 jam (8,9%), diikuti jam (3,4%), `Holiday_ID` (2,6%), hari dalam minggu (1,7%), dan `holiday` (1,2%). Suhu Tocumen hanya menyumbang 1,1%. Urutan ini sejalan dengan EDA: pola minggu lalu adalah informasi terpenting, kalender kedua, dan cuaca kecil.

### 6.2 Chronos-Bolt

Chronos-Bolt (*small*, 47,7 juta parameter) membagi konteks 2.048 jam menjadi potongan (*patch*), menormalisasi skalanya, lalu memakai arsitektur *encoder-decoder* keluarga T5 untuk mengeluarkan sembilan kuantil secara langsung untuk 24 jam ke depan. Model ini hanya membaca riwayat beban.

### 6.3 Chronos-2 tanpa dan dengan kovariat

Chronos-2 (119,5 juta parameter) memakai *group attention* sehingga target dan kovariat dalam satu kelompok dapat saling “melihat” di dalam konteks. Dalam konfigurasi tanpa kovariat, masukannya sama dengan Chronos-Bolt. Dalam konfigurasi dengan kovariat, masukannya ditambah enam kovariat masa lalu dan masa depan (Subbab 3.5). Kovariat masa depan memungkinkan model mengetahui, misalnya, bahwa jam-jam yang diramal jatuh pada hari libur. Di dashboard, kedua konfigurasi ditampilkan sebagai satu model (Chronos-2) dengan sakelar kovariat.

### 6.4 TimesFM 2.0

TimesFM 2.0 (498,8 juta parameter) adalah model *decoder-only*. Konteks dipotong menjadi *patch* masukan 32 jam, diproses secara autoregresif, dan menghasilkan *patch* keluaran 128 jam yang dipotong menjadi 24 jam. Keluarannya berupa rata-rata dan kuantil 0,1 sampai 0,9. Inferensi dilakukan dalam *batch* berukuran 16.

### 6.5 Ukuran akurasi

Dengan $e_t = y_t - \hat{y}_t$ dan $n$ pasangan ramalan-aktual:

| Ukuran | Rumus | Makna |
|---|---|---|
| MAE | $\frac{1}{n}\sum \lvert e_t\rvert$ | Galat rata-rata dalam MWh |
| RMSE | $\sqrt{\frac{1}{n}\sum e_t^2}$ | Menghukum galat besar lebih berat |
| MAPE | $\frac{100}{n}\sum \lvert e_t / y_t\rvert$ | Galat relatif (%) |
| MASE | $\text{MAE} / \frac{1}{m}\sum_{t} \lvert y_t - y_{t-168}\rvert$ | Skala terhadap *seasonal naive* di data latih; < 1 berarti lebih baik daripada cara naif itu |
| WQL | $\frac{1}{9}\sum_{\tau} \frac{2\sum_t \rho_\tau(y_t, \hat{q}_{\tau,t})}{\sum_t \lvert y_t\rvert}$ | Akurasi distribusi prediktif; pendekatan diskret CRPS ternormalisasi |
| Cakupan 80% | proporsi $y_t \in [\hat{q}_{0,1}, \hat{q}_{0,9}]$ | Kalibrasi interval; idealnya mendekati 80% |

dengan fungsi kerugian *pinball* $\rho_\tau(y,q) = \max\{\tau(y-q), (\tau-1)(y-q)\}$. XGBoost hanya menghasilkan nilai titik, sehingga WQL dan cakupan interval tidak dihitung untuk model ini. Untuk *foundation model*, ramalan titik yang dievaluasi adalah median atau rata-rata yang dikembalikan model.

## 7. Evaluasi (Tahap 6)

Seluruh ramalan disatukan dalam satu tabel panjang (satu baris per origin × jam × model, 21.360 baris) dan disimpan ke `outputs/forecast_backtest.csv`.

### 7.1 Akurasi keseluruhan

**Tabel 7.1** Akurasi keseluruhan (178 origin × 24 jam)

| Peringkat | Model | MAE (MWh) | RMSE (MWh) | MAPE (%) | MASE | WQL | Cakupan 80% (%) |
|---|---|---|---|---|---|---|---|
| 1 | Chronos-2 + kovariat | 32,89 | 48,00 | 2,79 | 0,564 | 0,0223 | 74,5 |
| 2 | Chronos-2 tanpa kovariat | 33,49 | 50,94 | 2,85 | 0,574 | 0,0229 | 74,9 |
| 3 | Chronos-Bolt | 37,25 | 56,26 | 3,18 | 0,638 | 0,0255 | 80,0 |
| 4 | TimesFM 2.0 | 37,98 | 56,58 | 3,22 | 0,651 | 0,0257 | 75,0 |
| 5 | XGBoost | 48,61 | 69,86 | 4,19 | 0,833 | – | – |

Ada tiga hasil pokok.

1. **Model terpilih.** Chronos-2 dengan kovariat memiliki galat terendah pada semua ukuran titik dan pada WQL. Model ini meleset rata-rata 32,9 MWh per jam, atau 2,79% dari beban aktual.
2. **Semua model lebih baik daripada cara naif.** MASE keempat model berada di bawah 1. Artinya, semuanya lebih akurat daripada menyalin beban minggu lalu. Ketiga *foundation model* menurunkan galat sekitar 35% sampai 44% dibandingkan cara naif, sedangkan XGBoost sekitar 17%.
3. **Akurasi probabilistik.** Interval 80% Chronos-Bolt paling mendekati nominal (80,0%). Interval Chronos-2 dan TimesFM sedikit terlalu sempit (74,5% sampai 75,0%).

### 7.2 Akurasi menurut regime

**Tabel 7.2** MAPE dan cakupan interval 80% menurut regime

| Model | MAPE Normal (%) | MAPE COVID-19 (%) | Perubahan (poin) | Cakupan Normal (%) | Cakupan COVID-19 (%) |
|---|---|---|---|---|---|
| Chronos-2 + kovariat | 2,82 | 2,77 | −0,05 | 77,4 | 72,4 |
| Chronos-2 tanpa kovariat | 2,74 | 2,94 | +0,20 | 78,4 | 72,4 |
| Chronos-Bolt | 3,13 | 3,22 | +0,08 | 84,7 | 76,6 |
| TimesFM 2.0 | 3,15 | 3,27 | +0,13 | 82,2 | 69,8 |
| XGBoost | 3,70 | 4,53 | +0,83 | – | – |

- **Regime Normal.** Model terbaik adalah Chronos-2 tanpa kovariat (MAPE 2,74%). Kovariat sedikit memperburuk akurasi pada periode ini.
- **Regime COVID-19.** Model terbaik adalah Chronos-2 dengan kovariat (MAPE 2,77%), dan model ini satu-satunya yang membaik dibandingkan regime Normal.
- **XGBoost** memburuk paling besar (+0,83 poin, atau naik sekitar 23%).
- **Interval.** Seluruh *foundation model* mengalami penurunan cakupan interval 80% pada regime COVID-19, ke kisaran 69,8% sampai 76,6%.

### 7.3 Galat menurut horizon

Karena seluruh origin berada pada pukul 00.00, horizon $h$ sekaligus menunjukkan jam dalam sehari.

- ***Foundation model*.** Rata-rata MAE pada $h = 1$ sampai 6 berkisar 15,2 sampai 17,6 MWh. Galat meningkat hingga puncaknya pada $h = 15$ (pukul 15.00), dengan MAE maksimum 49,0 MWh (Chronos-2 dengan kovariat) sampai 61,2 MWh (TimesFM), lalu menurun pada malam hari.
- **XGBoost.** Galatnya lebih datar, dari 34,2 MWh pada $h = 1$ sampai 6 menjadi 42,9 MWh pada $h = 19$ sampai 24, dengan puncak 68,9 MWh pada $h = 14$. Model ini tidak memakai jam-jam terakhir sebelum origin karena seluruh lag $\geq 24$. Akibatnya, galat XGBoost pada horizon pendek dua kali lipat galat *foundation model*.

### 7.4 Contoh ramalan

- **Minggu 3 sampai 9 Februari 2020 (regime Normal).** MAE mingguan semua model berdekatan: TimesFM 21,3 MWh, Chronos-2 dengan dan tanpa kovariat 22,1 MWh, Chronos-Bolt 23,8 MWh, dan XGBoost 24,5 MWh.
- **Minggu 6 sampai 12 April 2020 (regime COVID-19, memuat libur Pekan Suci).** Indikator `holiday` bernilai 1 pada 9 sampai 12 April. MAE mingguan Chronos-2 dengan kovariat adalah 28,0 MWh, Chronos-2 tanpa kovariat 29,9 MWh, TimesFM 34,0 MWh, Chronos-Bolt 34,4 MWh, dan XGBoost 38,5 MWh. Pada Jumat Agung (10 April), MAE Chronos-2 dengan kovariat adalah 38,3 MWh, sedangkan TimesFM 53,6 MWh dan XGBoost 55,8 MWh.

Dashboard (tab Hasil prediksi) memungkinkan penelusuran setiap hari uji beserta galat harian tiap model.

### 7.5 Uji Diebold-Mariano

Untuk menguji $H_0$: kedua model memiliki akurasi yang sama, didefinisikan selisih kerugian harian $d_s = L^{A}_s - L^{B}_s$ dengan $L_s$ adalah rata-rata galat absolut pada origin $s$. Statistik uji

$$DM = \frac{\bar{d}}{\sqrt{\hat{V}(\bar{d})}}, \qquad \hat{V}(\bar{d}) = \frac{1}{S}\left[\hat{\gamma}_0 + 2\sum_{k=1}^{5}\left(1-\tfrac{k}{6}\right)\hat{\gamma}_k\right],$$

memakai varians HAC Newey-West (lag 5) untuk mengakomodasi autokorelasi galat antarhari. Nilai $p$ dihitung dari distribusi $t$ dengan $S-1$ derajat bebas. $DM < 0$ dengan $p < 0{,}05$ berarti model A lebih akurat. Model A dalam setiap pasangan adalah Chronos-2 dengan kovariat.

**Tabel 7.3** Uji Diebold-Mariano (selisih MAE dalam MWh; *p*)

| Model B | Semua (178 hari) | Normal (74 hari) | COVID-19 (104 hari) |
|---|---|---|---|
| Chronos-2 tanpa kovariat | −0,60; 0,531 | +1,41; 0,437 | −2,03; **0,033** |
| Chronos-Bolt | −4,36; **0,004** | −3,52; 0,221 | −4,96; **0,001** |
| TimesFM 2.0 | −5,08; **0,002** | −3,96; 0,107 | −5,88; **0,006** |
| XGBoost | −15,71; **< 0,001** | −11,31; 0,074 | −18,85; **0,003** |

Nilai *p* yang dicetak tebal signifikan pada $\alpha = 5\%$.

- **Keseluruhan periode.** Chronos-2 dengan kovariat signifikan lebih akurat daripada Chronos-Bolt, TimesFM, dan XGBoost, tetapi tidak berbeda signifikan dari Chronos-2 tanpa kovariat.
- **Regime Normal.** Tidak ada selisih yang signifikan. Dengan hanya 74 hari, kekuatan uji terbatas.
- **Regime COVID-19.** Seluruh selisih signifikan, termasuk terhadap Chronos-2 tanpa kovariat.

### 7.6 Biaya komputasi

| Model | Parameter | Waktu untuk 178 ramalan (CPU 6 *thread*) |
|---|---|---|
| Chronos-2 + kovariat | 119,5 juta | sekitar 6 menit |
| Chronos-2 tanpa kovariat | 119,5 juta | sekitar 50 detik |
| Chronos-Bolt | 47,7 juta | sekitar 10 detik |
| TimesFM 2.0 | 498,8 juta | sekitar 2 menit |
| XGBoost | ratusan pohon | sekitar 3 detik (pelatihan dan prediksi) |

Waktu dapat sedikit berbeda antar eksekusi. Kovariat membuat Chronos-2 sekitar tujuh kali lebih lambat karena setiap masukan berisi tujuh deret (target dan enam kovariat). Chronos-Bolt menawarkan rasio akurasi terhadap biaya yang paling baik di antara *foundation model*.

## 8. Simulasi skenario suhu (Tahap 7)

### 8.1 Desain simulasi

Simulasi menjawab pertanyaan: jika suhu 24 jam yang diramal lebih panas atau lebih dingin, bagaimana ramalan beban berubah? Suhu digeser −3 sampai +3 °C (langkah 1 °C) pada satu kota (Tocumen, Santiago, atau David) atau pada ketiganya sekaligus. Kovariat lain dan seluruh data masa lalu tidak diubah.

- **XGBoost**: fitur suhu pada jam yang diramal digeser, lalu model memprediksi ulang untuk seluruh 178 origin.
- **Chronos-2 dengan kovariat**: kovariat suhu masa depan digeser. Karena setiap ramalan memerlukan sekitar 2 detik, simulasi dibatasi pada 12 hari contoh yang mencakup kedua regime dan tiga hari libur (9 Januari, 25 Februari, dan 10 April), ditambah 27 Juni 2020 (Subbab 9). Totalnya 300 ramalan pada backtest dan 25 ramalan pada hari masa depan.

### 8.2 Hasil

**Tabel 8.1** Perubahan rata-rata ramalan per kenaikan suhu (MWh per jam)

| Suhu diubah di | XGBoost, +1 °C (178 hari) | XGBoost, +1 °C (12 hari) | Chronos-2 + kovariat, +1 °C (12 hari) | Chronos-2 + kovariat, +3 °C (12 hari) |
|---|---|---|---|---|
| Tocumen | +4,50 | +4,78 | +12,03 | +27,43 |
| Santiago | +0,92 | +0,77 | +3,91 | +7,39 |
| David | +1,25 | +1,14 | +6,16 | +12,40 |
| Ketiga kota | +6,85 | +6,80 | +19,51 | +46,59 |

Ada empat temuan.

1. **Arah respons masuk akal.** Kedua model menaikkan ramalan ketika suhu naik, sesuai dengan kebutuhan pendingin ruangan.
2. **Tocumen paling berpengaruh.** Pada kedua model, suhu Tocumen (Kota Panama) memberi respons terbesar. Hal ini konsisten dengan peran Kota Panama sebagai pusat beban nasional.
3. **Chronos-2 lebih sensitif daripada XGBoost.** Kenaikan 1 °C di Tocumen menaikkan ramalan Chronos-2 sekitar 12 MWh per jam (sekitar 1%), sedangkan XGBoost hanya 4,5 MWh. XGBoost memotong suhu pada ambang-ambang pohon yang dipelajari dari data latih, sehingga perubahan suhu yang tidak melewati ambang tidak mengubah ramalan, dan responsnya bertangga. Chronos-2 membaca hubungan suhu-beban dari 85 hari konteks secara *in-context*.
4. **Respons tidak linear.** Untuk Chronos-2, kenaikan 3 °C memberi respons sekitar 2,3 kali respons kenaikan 1 °C, bukan 3 kali. Pada contoh 10 April 2020, kenaikan 2 °C di Tocumen menaikkan ramalan rata-rata 38,8 MWh (3,4%).

Hasil simulasi harus dibaca sebagai sensitivitas model, bukan efek kausal suhu terhadap beban. Suhu digeser tanpa mengubah kelembapan dan tanpa mengubah perilaku konsumen. Selain itu, pergeseran +3 °C pada seluruh 24 jam berada di luar variasi antarhari yang lazim di Panama (simpangan baku suhu harian Tocumen 0,69 °C).

## 9. Ramalan 24 jam ke depan (Tahap 8)

Data berakhir 27 Juni 2020 pukul 00.00. Keempat model meramal 24 jam berikutnya (27 Juni 2020 pukul 01.00 sampai 28 Juni 2020 pukul 00.00) dengan asumsi berikut.

- **Cuaca.** Cuaca setelah 27 Juni 2020 tidak tersedia dalam dataset, sehingga suhu dan kelembapan masa depan diasumsikan sama dengan 24 jam terakhir (asumsi persistensi). Asumsi ini memengaruhi Chronos-2 dengan kovariat dan XGBoost.
- **Kalender.** 27 Juni 2020 jatuh pada hari Sabtu dan diasumsikan bukan hari libur nasional (`holiday = 0`, `Holiday_ID = 0`). Indikator `school` mengikuti nilai terakhir.
- **Model univariat.** Chronos-Bolt, TimesFM, dan Chronos-2 tanpa kovariat hanya membaca riwayat beban.

Berbeda dengan analisis sebelumnya, ramalan masa depan kini dibuat oleh keempat model, termasuk model terpilih (Chronos-2 dengan kovariat), sehingga informasi kalender tetap dipakai. Rata-rata ramalan 24 jam berkisar 1.029 MWh (Chronos-Bolt) sampai 1.065 MWh (XGBoost), dengan titik terendah sekitar 876 sampai 952 MWh pada dini hari dan puncak sekitar 1.149 sampai 1.180 MWh. Nilai per jam disimpan di `outputs/forecast_masa_depan_24jam.csv`. Skenario suhu untuk hari ini juga dihitung dan dapat dicoba di dashboard.

## 10. Penyimpanan model dan dashboard (Tahap 9–10)

| Berkas | Isi | Cara memuat |
|---|---|---|
| `models/xgb_beban.json` | Model XGBoost | `m = xgb.XGBRegressor(); m.load_model('models/xgb_beban.json')` |
| `models/chronos-bolt-small/` | Bobot Chronos-Bolt (sekitar 191 MB) | `BaseChronosPipeline.from_pretrained('models/chronos-bolt-small')` |
| `models/chronos-2/` | Bobot Chronos-2 (sekitar 478 MB) | `BaseChronosPipeline.from_pretrained('models/chronos-2')` |
| `models/timesfm-2.0-500m-pytorch/` | Bobot TimesFM 2.0 (sekitar 2 GB) | `TimesFmModelForPrediction.from_pretrained('models/timesfm-2.0-500m-pytorch')` |

Tahap 9 memuat ulang XGBoost dan memastikan dengan `assert` bahwa prediksinya identik dengan hasil *backtest*. Folder `models/` masih memuat `sarimax_dhr.pkl` dan `sarimax_w.pkl` dari analisis sebelumnya. Kedua berkas ini tidak lagi dipakai dan aman dihapus.

Tahap 10 mengekspor ringkasan seluruh hasil ke `dashboard/data.js` (sekitar 1 MB). Dashboard GitHub Pages (`dashboard/index.html`) dan versi Streamlit (`streamlit_app.py`) membaca berkas yang sama, sehingga angka di keduanya selalu sama dengan notebook. Bobot *foundation model* tidak dapat dijalankan di GitHub Pages karena halaman tersebut hanya melayani berkas statis dan ukuran bobotnya 190 MB sampai 2 GB. Oleh karena itu, dashboard menampilkan hasil yang sudah dihitung, termasuk skenario suhu.

Dashboard terdiri atas lima tab:

1. **Beranda**: klimatograf tiga kota, temuan utama, beban harian 2015–2020, dan ringkasan apa yang diramal.
2. **Eksplorasi data**: deret harian dengan pilihan rentang, penjelajah satu minggu per jam, peta panas, efek hari libur, profil bulanan, dekomposisi, ACF, dan uji stasioneritas.
3. **Cuaca tiga kota**: pilihan kota, variabel, dan jenis hari; plot sebar dengan regresi; matriks korelasi tiga jenis; korelasi per jam; profil harian dan bulanan.
4. **Performa model**: pilihan periode, metrik, dan sakelar kovariat Chronos-2; tabel metrik; galat menurut horizon dan hari; uji Diebold-Mariano; alur kerja setiap model.
5. **Hasil prediksi**: penelusuran setiap hari uji, simulasi suhu dengan *slider*, dan ramalan 24 jam setelah akhir data.

## 11. Pembahasan

### 11.1 Mengapa *foundation model* mengungguli XGBoost

Ketiga *foundation model* lebih akurat daripada XGBoost, padahal tidak satu pun parameternya diestimasi pada data Panama. Tiga mekanisme diduga menjelaskan temuan ini.

1. **Informasi jam terakhir.** *Foundation model* membaca beban sampai tepat pada origin, sedangkan XGBoost hanya memakai lag minimal 24 jam. Keunggulan terbesar *foundation model* memang terlihat pada horizon pendek (Subbab 7.3).
2. **Adaptasi tanpa pelatihan ulang.** Setiap origin memberi konteks baru, sehingga *foundation model* otomatis menyesuaikan diri dengan level beban baru setelah pembatasan COVID-19. XGBoost memakai pohon hasil pelatihan 2019 yang tidak diperbarui. Fitur bulan dan hari ke-$n$ mempelajari level musiman sebelum 2020, sehingga menghasilkan bias ke atas setelah level turun 14%. Sebagian keunggulan *foundation model* karenanya berasal dari desain evaluasi tanpa pelatihan ulang. Pelatihan ulang bergulir pada XGBoost dapat mempersempit selisih tersebut.
3. **Pengetahuan pra-pelatihan.** Pola beban listrik (musiman harian dan mingguan yang kuat dengan level yang bergeser perlahan) lazim pada korpus deret waktu publik. Konsekuensinya, terdapat risiko kontaminasi: jika dataset Panama atau deret sejenis termasuk dalam korpus pra-pelatihan, akurasi *zero-shot* dapat terlihat lebih baik daripada kinerja pada deret yang benar-benar baru `[RUJUKAN DIPERLUKAN: daftar dataset pra-pelatihan Chronos-2 dan TimesFM 2.0]`.

Perbedaan di antara *foundation model* juga informatif. Chronos-2 (119,5 juta parameter) lebih akurat daripada TimesFM 2.0 (498,8 juta parameter) dan Chronos-Bolt (47,7 juta parameter). Jumlah parameter bukan penentu utama akurasi untuk deret ini; arsitektur dan korpus pelatihan lebih berpengaruh.

### 11.2 Peran kovariat cuaca dan kalender

Penambahan kovariat menurunkan MAE Chronos-2 sebesar 0,60 MWh untuk keseluruhan periode, tetapi selisih ini tidak signifikan ($p = 0{,}53$). Pada regime Normal, kovariat justru sedikit memperburuk akurasi (+1,41 MWh, tidak signifikan). Pada regime COVID-19, kovariat memperbaiki akurasi secara signifikan (−2,03 MWh; $p = 0{,}033$). Pola ini sejalan dengan analisis cuaca (Subbab 5): setelah pola harian dikendalikan, korelasi cuaca dengan beban lemah, sehingga dalam kondisi normal riwayat beban sudah memuat hampir seluruh informasi yang dapat diramalkan.

Kovariat mana yang memberi manfaat pada regime COVID-19? Indikator `school` tetap bernilai 1 sepanjang Maret sampai Juni 2020 karena mengikuti kalender akademik resmi dan tidak mencatat penutupan sekolah, sehingga tidak membawa informasi tentang pembatasan. Kandidat yang lebih masuk akal adalah (a) indikator `holiday`, karena April 2020 memuat 96 jam libur nasional yang tidak dapat diantisipasi dari riwayat beban, dan (b) suhu, yang naik pada April dan Mei. Contoh 10 April 2020 (Subbab 7.4) mendukung dugaan pertama. Atribusi yang pasti memerlukan analisis ablasi per kovariat.

Kovariat cuaca dalam *backtest* adalah nilai observasi, sehingga manfaatnya merupakan batas atas. Dalam operasi nyata, ramalan suhu memiliki galat, sehingga manfaat kovariat suhu akan lebih kecil. Manfaat indikator kalender tetap utuh karena kalender diketahui pasti sebelumnya.

### 11.3 Ketangguhan terhadap perubahan struktural COVID-19

*Foundation model* relatif stabil: Chronos-2 tanpa kovariat naik dari 2,74% menjadi 2,94%, Chronos-Bolt dari 3,13% menjadi 3,22%, dan TimesFM dari 3,15% menjadi 3,27%. Chronos-2 dengan kovariat justru membaik dari 2,82% menjadi 2,77%. Sebaliknya, XGBoost memburuk dari 3,70% menjadi 4,53%. Pelajaran metodologisnya: dalam kondisi perubahan struktural, model yang mengkondisikan diri pada data terbaru lebih tangguh daripada model yang mengandalkan hubungan tetap hasil estimasi masa lalu.

### 11.4 Kalibrasi interval prediksi

Pada regime Normal, cakupan interval 80% Chronos-2 mendekati nominal (77,4% dengan kovariat dan 78,4% tanpa kovariat), sedangkan Chronos-Bolt (84,7%) dan TimesFM (82,2%) sedikit terlalu lebar. Pada regime COVID-19, seluruh *foundation model* menghasilkan interval yang terlalu sempit, dengan cakupan 69,8% (TimesFM) sampai 76,6% (Chronos-Bolt). Model mempelajari tingkat ketidakpastian dari konteks yang sebagian besar masih berasal dari periode sebelum perubahan, sehingga ketidakpastian setelah perubahan regime diremehkan. Untuk penggunaan operasional, interval sebaiknya dikalibrasi ulang, misalnya dengan *conformal prediction* bergulir `[RUJUKAN DIPERLUKAN: metode conformal prediction adaptif untuk deret waktu]`.

### 11.5 Posisi hasil terhadap penelitian terdahulu

Aguilar Madrid dan Antonio (2021) memakai dataset yang sama untuk horizon mingguan (168 jam) dengan model *machine learning* dan periode uji sebelum pandemi. Karena horizon, periode uji, dan definisi galat berbeda, angka dalam penelitian ini tidak dapat dibandingkan secara langsung. Kesamaannya terletak pada temuan bahwa variabel kalender dan pola musiman merupakan prediktor utama, sebagaimana juga terlihat dari kepentingan fitur XGBoost. Penelitian ini menambahkan pembanding *foundation model zero-shot*, pengujian pada periode perubahan struktural, dan simulasi sensitivitas suhu.

### 11.6 Keterbatasan

1. **Kovariat *oracle*.** Cuaca observasi dipakai sebagai kovariat masa depan pada *backtest*, sehingga akurasi model berkovariat merupakan batas atas.
2. **Asumsi persistensi** pada ramalan 27 Juni 2020 karena cuaca masa depan tidak tersedia.
3. **Satu deret dan satu negara.** Generalisasi ke sistem lain, misalnya sistem dengan puncak malam hari, memerlukan pengujian tambahan.
4. **Tanpa pelatihan ulang dan tanpa penyetelan hiperparameter** pada XGBoost, sehingga perbandingannya konservatif bagi XGBoost.
5. **Kekuatan uji terbatas.** Uji Diebold-Mariano pada regime Normal hanya memakai 74 hari.
6. **Simulasi Chronos-2 hanya pada 12 hari contoh** karena biaya komputasi di CPU.
7. **Kualitas variabel kalender.** Indikator `school` tidak mencatat penutupan sekolah tahun 2020.
8. **Kemungkinan kontaminasi data pra-pelatihan**, sebagaimana dijelaskan pada Subbab 11.1.

## 12. Kesimpulan dan saran

### 12.1 Kesimpulan

1. **Karakteristik data.** Beban listrik Panama didominasi musiman harian (kekuatan 0,906; puncak sekitar pukul 13.00 dengan rasio puncak terhadap lembah 1,61) dan musiman mingguan (kekuatan 0,712). Tren tahunannya tumbuh sekitar 2,4% per tahun. Efek hari libur signifikan (−12,8% pada hari kerja; $p < 0{,}001$), dan pembatasan COVID-19 menurunkan beban rata-rata sebesar 14,3%.
2. **Cuaca tiga kota.** Korelasi suhu dan beban per jam tinggi ($r \approx 0{,}63$ sampai $0{,}65$), tetapi setelah pola harian dikendalikan hanya $r \approx 0{,}11$ sampai $0{,}13$. Suhu Tocumen paling berhubungan dengan beban. Presipitasi berhubungan negatif lemah, sedangkan kelembapan dan angin hampir tidak berhubungan.
3. **Model terpilih.** Chronos-2 dengan kovariat cuaca dan kalender adalah model paling akurat (MAPE 2,79%; MAE 32,9 MWh), diikuti Chronos-2 tanpa kovariat (2,85%), Chronos-Bolt (3,18%), TimesFM 2.0 (3,22%), dan XGBoost (4,19%).
4. **Signifikansi.** Keunggulan Chronos-2 dengan kovariat atas Chronos-Bolt, TimesFM, dan XGBoost signifikan untuk keseluruhan periode ($p < 0{,}01$). Manfaat kovariat hanya signifikan pada regime COVID-19 ($p = 0{,}033$).
5. **Ketangguhan.** *Foundation model* tetap stabil setelah perubahan struktural COVID-19, sedangkan XGBoost memburuk sekitar 23%.
6. **Sensitivitas suhu.** Kenaikan suhu 1 °C di Tocumen menaikkan ramalan sekitar 12 MWh per jam pada Chronos-2 dengan kovariat dan 4,5 MWh pada XGBoost. Suhu Tocumen paling berpengaruh di antara ketiga kota.

### 12.2 Saran

1. **Bagi praktik peramalan**, Chronos-2 dengan kovariat kalender dapat dijadikan acuan awal yang harus dikalahkan sebelum model baru diadopsi. Interval prediksinya perlu dikalibrasi ulang.
2. **Bagi penelitian lanjutan:**
   - (a) Mengulang perbandingan dengan ramalan cuaca, bukan cuaca observasi.
   - (b) Menerapkan pelatihan ulang bergulir pada XGBoost.
   - (c) Melakukan ablasi per kovariat (suhu, libur, sekolah) untuk mengidentifikasi sumber manfaat pada regime COVID-19.
   - (d) Melakukan *fine-tuning* Chronos-2 pada data Panama sebelum 2020.
   - (e) Memperluas simulasi suhu Chronos-2 ke seluruh 178 hari dengan GPU.
   - (f) Memperluas horizon ke 168 jam agar sebanding dengan Aguilar Madrid dan Antonio (2021).
3. **Bagi kualitas data**, indikator `school` perlu diperbarui agar mencerminkan penutupan sekolah aktual pada 2020.

## Daftar pustaka

Format mengikuti APA edisi ke-7.

- Aguilar Madrid, E., & Antonio, N. (2021). Short-term electricity load forecasting with machine learning. *Information, 12*(2), 50. https://doi.org/10.3390/info12020050
- Aguilar Madrid, E. `[verifikasi daftar pengunggah]` (2021). *Short-term electricity load forecasting (Panama case study)* [Data set]. Mendeley Data. https://doi.org/10.17632/byx7sztj59.1
- Ansari, A. F., dkk. (2024). Chronos: Learning the language of time series. *arXiv*. https://arxiv.org/abs/2403.07815
- Ansari, A. F., dkk. (2025). Chronos-2: From univariate to universal forecasting. *arXiv*. https://arxiv.org/abs/2510.15821
- Chen, T., & Guestrin, C. (2016). XGBoost: A scalable tree boosting system. In *Proceedings of the 22nd ACM SIGKDD International Conference on Knowledge Discovery and Data Mining* (pp. 785–794). https://doi.org/10.1145/2939672.2939785
- Das, A., Kong, W., Sen, R., & Zhou, Y. (2024). A decoder-only foundation model for time-series forecasting. *arXiv*. https://arxiv.org/abs/2310.10688

Catatan verifikasi: untuk rujukan bertanda “dkk.”, daftar penulis lengkap perlu disalin dari halaman arXiv sebelum dipakai di naskah resmi. Rujukan untuk Diebold-Mariano (1995), Newey-West (1987), dan MSTL belum dicantumkan `[RUJUKAN DIPERLUKAN: Diebold & Mariano (1995) Journal of Business & Economic Statistics; Newey & West (1987) Econometrica; Bandara, Hyndman & Bergmeir (2021) tentang MSTL]`.
