import { useState, useEffect, useMemo } from 'react';
import {
  FileText, Download, User, TrendingUp,
  Award, BookOpen, Heart, CheckCircle, Search
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateRaporPDF } from '../lib/pdf';
import type { Murid, Kelas, Profile, ShowToast } from '../types';

interface RaporData {
  murid: Murid & { kelas_data?: Kelas };
  absensi: { hadir: number; izin: number; sakit: number; alfa: number; total: number };
  nilaiList: { mapel: string; nilai: number; predikat: string }[];
  sikapAvg: { disiplin: number; adab: number; kerajinan: number; kejujuran: number; tanggung_jawab: number };
  nilaiAkhir: number;
  predikat: string;
  deskripsi: string;
}

export default function RaporPage({ showToast, profile }: { showToast: ShowToast; profile: Profile | null }) {
  const [muridList, setMuridList] = useState<Murid[]>([]);
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKelas, setSelectedKelas] = useState<string>('');
  const [selectedMurid, setSelectedMurid] = useState<string>('');
  const [raporData, setRaporData] = useState<RaporData | null>(null);
  const [loadingRapor, setLoadingRapor] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: muridData } = await supabase
        .from('murid')
        .select('*, kelas:user_id(id, nama_kelas)')
        .eq('status', 'Aktif')
        .order('nama_murid');

      const { data: kelasData } = await supabase
        .from('kelas')
        .select('*')
        .order('nama_kelas');

      if (muridData) setMuridList(muridData as Murid[]);
      if (kelasData) setKelasList(kelasData as Kelas[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const filteredMurid = useMemo(() => {
    return muridList.filter(m => {
      const matchKelas = !selectedKelas || m.kelas_id === selectedKelas;
      const nama = m.nama_murid || m.nama || '';
      const matchSearch = !searchQuery || nama.toLowerCase().includes(searchQuery.toLowerCase());
      return matchKelas && matchSearch;
    });
  }, [muridList, selectedKelas, searchQuery]);

  const generateRapor = async (muridId: string) => {
    setLoadingRapor(true);
    try {
      const murid = muridList.find(m => m.id === muridId);
      if (!murid) throw new Error('Murid tidak ditemukan');

      // Fetch absensi data
      const { data: absensiData } = await supabase
        .from('absensi')
        .select('status')
        .eq('murid_id', muridId);

      const absensi = { hadir: 0, izin: 0, sakit: 0, alfa: 0, total: 0 };
      (absensiData || []).forEach((a: any) => {
        if (a.status === 'Hadir') absensi.hadir++;
        else if (a.status === 'Izin') absensi.izin++;
        else if (a.status === 'Sakit') absensi.sakit++;
        else if (a.status === 'Alfa') absensi.alfa++;
        absensi.total++;
      });

      // Fetch nilai data
      const { data: detailNilai } = await supabase
        .from('detail_nilai')
        .select('nilai, penilaian:penilaian_id(mapel:mapel_id(nama_mapel))')
        .eq('murid_id', muridId);

      const nilaiMap = new Map<string, number[]>();
      (detailNilai || []).forEach((dn: any) => {
        const mapel = dn.penilaian?.mapel?.nama_mapel || 'Tidak Diketahui';
        if (!nilaiMap.has(mapel)) nilaiMap.set(mapel, []);
        nilaiMap.get(mapel)!.push(dn.nilai || 0);
      });

      const nilaiList = Array.from(nilaiMap.entries()).map(([mapel, nilaiArr]) => {
        const avg = nilaiArr.reduce((a, b) => a + b, 0) / nilaiArr.length;
        return { mapel, nilai: Math.round(avg * 10) / 10, predikat: getPredikat(avg) };
      });

      // Fetch sikap data
      const { data: sikapData } = await supabase
        .from('sikap')
        .select('disiplin, adab, kerajinan, kejujuran, tanggung_jawab')
        .eq('murid_id', muridId);

      const sikapAvg = {
        disiplin: 0, adab: 0, kerajinan: 0, kejujuran: 0, tanggung_jawab: 0,
      };
      if (sikapData && sikapData.length > 0) {
        sikapData.forEach((s: any) => {
          sikapAvg.disiplin += s.disiplin || 0;
          sikapAvg.adab += s.adab || 0;
          sikapAvg.kerajinan += s.kerajinan || 0;
          sikapAvg.kejujuran += s.kejujuran || 0;
          sikapAvg.tanggung_jawab += s.tanggung_jawab || 0;
        });
        const count = sikapData.length;
        sikapAvg.disiplin = Math.round((sikapAvg.disiplin / count) * 10) / 10;
        sikapAvg.adab = Math.round((sikapAvg.adab / count) * 10) / 10;
        sikapAvg.kerajinan = Math.round((sikapAvg.kerajinan / count) * 10) / 10;
        sikapAvg.kejujuran = Math.round((sikapAvg.kejujuran / count) * 10) / 10;
        sikapAvg.tanggung_jawab = Math.round((sikapAvg.tanggung_jawab / count) * 10) / 10;
      }

      // Calculate final score
      const nilaiAkademikAvg = nilaiList.length > 0
        ? nilaiList.reduce((a, b) => a + b.nilai, 0) / nilaiList.length
        : 0;
      const sikapAvgTotal = (sikapAvg.disiplin + sikapAvg.adab + sikapAvg.kerajinan + sikapAvg.kejujuran + sikapAvg.tanggung_jawab) / 5;
      const kehadiranPersen = absensi.total > 0 ? (absensi.hadir / absensi.total) * 100 : 100;

      const nilaiAkhir = Math.round((nilaiAkademikAvg * 0.6 + sikapAvgTotal * 0.25 + kehadiranPersen * 0.15) * 10) / 10;
      const predikat = getPredikat(nilaiAkhir);
      const namaMurid = murid.nama_murid || murid.nama || '';
      const deskripsi = generateDeskripsi(nilaiAkhir, predikat, namaMurid);

      const kelasData = kelasList.find(k => k.id === murid.kelas_id);

      setRaporData({
        murid: { ...murid, kelas_data: kelasData } as Murid & { kelas_data?: Kelas },
        absensi,
        nilaiList,
        sikapAvg,
        nilaiAkhir,
        predikat,
        deskripsi,
      });
      setSelectedMurid(muridId);
    } catch (error: any) {
      showToast(error.message || 'Gagal memuat rapor', 'error');
    }
    setLoadingRapor(false);
  };

  const getPredikat = (nilai: number): string => {
    if (nilai >= 90) return 'A';
    if (nilai >= 80) return 'B';
    if (nilai >= 70) return 'C';
    if (nilai >= 60) return 'D';
    return 'E';
  };

  const getPredikatColor = (predikat: string): string => {
    switch (predikat) {
      case 'A': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'B': return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'C': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'D': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-rose-100 text-rose-700 border-rose-200';
    }
  };

  const generateDeskripsi = (_nilai: number, predikat: string, nama: string): string => {
    if (predikat === 'A') {
      return `${nama} menunjukkan prestasi yang sangat baik dalam pembelajaran. Santri aktif, disiplin, dan memiliki kemampuan memahami materi dengan sangat baik. Tingkatkan konsistensi untuk mempertahankan prestasi.`;
    } else if (predikat === 'B') {
      return `${nama} menunjukkan prestasi yang baik dalam pembelajaran. Santri cukup aktif dan disiplin. Diharapkan meningkatkan fokus dan ketelitian dalam mengerjakan tugas.`;
    } else if (predikat === 'C') {
      return `${nama} menunjukkan perkembangan yang cukup dalam pembelajaran. Santri perlu meningkatkan keaktifan dan konsistensi dalam mengikuti kegiatan belajar mengajar.`;
    } else {
      return `${nama} perlu mendapat perhatian khusus dalam pembelajaran. Diharapkan lebih aktif dalam kegiatan KBM dan meningkatkan kedisiplinan. Koordinasi dengan wali murid diperlukan.`;
    }
  };

  const handleExportPDF = () => {
    if (!raporData) return;
    const { murid, absensi, nilaiList } = raporData;

    generateRaporPDF(
      {
        nama: murid.nama_murid || murid.nama || '',
        kelas: raporData.murid.kelas_data?.nama_kelas || '-',
        domisili: '',
        alamat: '',
      },
      absensi,
      nilaiList.map(n => ({ pelajaran: n.mapel, jenis_ujian: 'Rata-rata', skor: n.nilai })),
      [],
      [],
      profile?.email
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h2 className="section-title">Rapor Modern</h2>
        <p className="section-subtitle">Laporan perkembangan santri terintegrasi</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Filter & List */}
        <div className="space-y-4">
          <div className="card p-4">
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Filter Kelas</label>
            <select
              value={selectedKelas}
              onChange={e => { setSelectedKelas(e.target.value); setSelectedMurid(''); setRaporData(null); }}
              className="input-field text-sm"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map(k => (
                <option key={k.id} value={k.id}>{k.nama_kelas}</option>
              ))}
            </select>
          </div>

          <div className="card p-4">
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari santri..."
                className="input-field text-sm pl-9"
              />
            </div>

            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {filteredMurid.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Tidak ada santri</p>
              ) : (
                filteredMurid.map(m => (
                  <button
                    key={m.id}
                    onClick={() => generateRapor(m.id)}
                    disabled={loadingRapor}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all border flex items-center justify-between ${
                      selectedMurid === m.id
                        ? 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-100'
                    }`}
                  >
                    <span className="truncate">{m.nama_murid}</span>
                    {loadingRapor && selectedMurid === m.id && (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Rapor Detail */}
        <div className="lg:col-span-2">
          {!raporData ? (
            <div className="card border-dashed border-slate-200 p-12 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
              <Award className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-sm text-slate-400 font-medium">
                Pilih santri untuk melihat rapor digital
              </p>
              <p className="text-xs text-slate-300 mt-1">
                Data nilai, sikap, dan kehadiran akan ditampilkan di sini
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Card */}
              <div className="card overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5" />
                        <span className="font-bold text-lg">Rapor Digital</span>
                      </div>
                      <p className="text-emerald-100 text-sm">Periode Semester Aktif</p>
                    </div>
                    <div className="text-right">
                      <div className="text-4xl font-bold">{raporData.nilaiAkhir}</div>
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold border ${getPredikatColor(raporData.predikat)}`}>
                        Predikat {raporData.predikat}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
                    <User className="w-7 h-7 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{raporData.murid.nama_murid}</h3>
                    <p className="text-sm text-slate-500">Kelas {raporData.murid.kelas_data?.nama_kelas || '-'}</p>
                    {raporData.murid.nis && <p className="text-xs text-slate-400">NIS: {raporData.murid.nis}</p>}
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button onClick={handleExportPDF} className="btn-primary text-sm flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Attendance Ring */}
              <div className="card p-5">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  Rekap Kehadiran
                </h3>

                <div className="flex items-center gap-6">
                  {/* Donut Chart */}
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90">
                      {(() => {
                        const total = raporData.absensi.total || 1;
                        const hadirPct = (raporData.absensi.hadir / total) * 100;
                        const izinPct = (raporData.absensi.izin / total) * 100;
                        const sakitPct = (raporData.absensi.sakit / total) * 100;
                        const alfaPct = (raporData.absensi.alfa / total) * 100;
                        const radius = 50;
                        const circumference = 2 * Math.PI * radius;

                        return (
                          <>
                            <circle cx="64" cy="64" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="12" />
                            {hadirPct > 0 && (
                              <circle cx="64" cy="64" r={radius} fill="none" stroke="#10b981" strokeWidth="12"
                                strokeDasharray={`${hadirPct * circumference / 100} ${circumference}`}
                                strokeLinecap="round" />
                            )}
                            {izinPct > 0 && (
                              <circle cx="64" cy="64" r={radius} fill="none" stroke="#f59e0b" strokeWidth="12"
                                strokeDasharray={`${izinPct * circumference / 100} ${circumference}`}
                                strokeDashoffset={`${-hadirPct * circumference / 100}`}
                                strokeLinecap="round" />
                            )}
                            {sakitPct > 0 && (
                              <circle cx="64" cy="64" r={radius} fill="none" stroke="#0ea5e9" strokeWidth="12"
                                strokeDasharray={`${sakitPct * circumference / 100} ${circumference}`}
                                strokeDashoffset={`${-(hadirPct + izinPct) * circumference / 100}`}
                                strokeLinecap="round" />
                            )}
                            {alfaPct > 0 && (
                              <circle cx="64" cy="64" r={radius} fill="none" stroke="#f43f5e" strokeWidth="12"
                                strokeDasharray={`${alfaPct * circumference / 100} ${circumference}`}
                                strokeDashoffset={`${-(hadirPct + izinPct + sakitPct) * circumference / 100}`}
                                strokeLinecap="round" />
                            )}
                          </>
                        );
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-2xl font-bold text-emerald-600">
                          {raporData.absensi.total > 0
                            ? Math.round((raporData.absensi.hadir / raporData.absensi.total) * 100)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    {[
                      { label: 'Hadir', value: raporData.absensi.hadir, color: 'bg-emerald-500' },
                      { label: 'Izin', value: raporData.absensi.izin, color: 'bg-amber-500' },
                      { label: 'Sakit', value: raporData.absensi.sakit, color: 'bg-sky-500' },
                      { label: 'Alfa', value: raporData.absensi.alfa, color: 'bg-rose-500' },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="text-xs text-slate-600">{item.label}</span>
                        <span className="text-xs font-bold text-slate-800 ml-auto">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Subject Grades */}
              <div className="card p-5">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                  <BookOpen className="w-4 h-4 text-sky-500" />
                  Nilai Mata Pelajaran
                </h3>

                {raporData.nilaiList.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">Belum ada data nilai</p>
                ) : (
                  <div className="space-y-2">
                    {raporData.nilaiList.map((n, i) => (
                      <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
                        <span className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700 font-bold text-xs">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm font-medium text-slate-700">{n.mapel}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-sm font-bold ${getPredikatColor(n.predikat)}`}>
                          {n.nilai}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Character Progress */}
              <div className="card p-5">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                  <Heart className="w-4 h-4 text-rose-500" />
                  Perkembangan Karakter
                </h3>

                <div className="space-y-3">
                  {[
                    { label: 'Disiplin', value: raporData.sikapAvg.disiplin },
                    { label: 'Adab', value: raporData.sikapAvg.adab },
                    { label: 'Kerajinan', value: raporData.sikapAvg.kerajinan },
                    { label: 'Kejujuran', value: raporData.sikapAvg.kejujuran },
                    { label: 'Tanggung Jawab', value: raporData.sikapAvg.tanggung_jawab },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600">{item.label}</span>
                        <span className="text-xs font-bold text-slate-800">{item.value}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.value >= 80 ? 'bg-emerald-500' :
                            item.value >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="card p-5 bg-gradient-to-br from-emerald-50 to-white border-emerald-100">
                <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Deskripsi Perkembangan
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">{raporData.deskripsi}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
