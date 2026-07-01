import { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Users, CalendarDays, Clock, Bell, Megaphone,
  CheckCircle, Timer, TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Profile, JadwalMengajar, AgendaPenting, Pengumuman, ShowToast } from '../types';

interface DashboardPageProps {
  showToast: ShowToast;
  profile: Profile | null;
}

export default function DashboardPage({ profile }: DashboardPageProps) {
  const [loading, setLoading] = useState(true);
  const [jadwalHariIni, setJadwalHariIni] = useState<JadwalMengajar[]>([]);
  const [agendaList, setAgendaList] = useState<AgendaPenting[]>([]);
  const [pengumumanList, setPengumumanList] = useState<Pengumuman[]>([]);
  const [absensiStats, setAbsensiStats] = useState({ hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 });
  const [muridCount, setMuridCount] = useState(0);
  const [now, setNow] = useState(new Date());

  const namaHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayHari = namaHari[new Date().getDay()];
  const todayDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch jadwal hari ini
      const { data: jadwalData } = await supabase
        .from('jadwal_mengajar')
        .select('*')
        .eq('hari', todayHari)
        .order('jam_mulai');

      // Fetch agenda mendatang
      const { data: agendaData } = await supabase
        .from('agenda_penting')
        .select('*')
        .gte('tanggal', todayDate)
        .order('tanggal', { ascending: true })
        .limit(5);

      // Fetch pengumuman
      const { data: pengumumanData } = await supabase
        .from('pengumuman')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      // Fetch absensi stats hari ini
      const { data: absensiData } = await supabase
        .from('absensi')
        .select('status')
        .eq('tanggal', todayDate);

      // Fetch murid count
      const { count: muridTotal } = await supabase
        .from('murid')
        .select('*', { count: 'exact', head: true })
        .eq('status_aktif', true);

      setJadwalHariIni((jadwalData || []) as JadwalMengajar[]);
      setAgendaList((agendaData || []) as AgendaPenting[]);
      setPengumumanList((pengumumanData || []) as Pengumuman[]);

      const absenStats = { hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 };
      (absensiData || []).forEach((a: any) => {
        if (a.status === 'Hadir') absenStats.hadir++;
        else if (a.status === 'Izin') absenStats.izin++;
        else if (a.status === 'Sakit') absenStats.sakit++;
        else if (a.status === 'Alpha') absenStats.alpha++;
        absenStats.total++;
      });
      setAbsensiStats(absenStats);
      setMuridCount(muridTotal || 0);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Find ongoing or next class
  const ongoingClass = useMemo(() => {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return jadwalHariIni.find(j => {
      const [h, m] = j.jam_mulai.split(':').map(Number);
      const [h2, m2] = j.jam_selesai.split(':').map(Number);
      const start = h * 60 + m;
      const end = h2 * 60 + m2;
      return nowMin >= start && nowMin < end;
    });
  }, [jadwalHariIni, now]);

  const nextClass = useMemo(() => {
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return jadwalHariIni.find(j => {
      const [h, m] = j.jam_mulai.split(':').map(Number);
      return h * 60 + m > nowMin;
    });
  }, [jadwalHariIni, now]);

  // Countdown to next class
  const countdown = useMemo(() => {
    if (!nextClass) return null;
    const [h, m] = nextClass.jam_mulai.split(':').map(Number);
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { hours, minutes, seconds };
  }, [nextClass, now]);

  const greeting = () => {
    const h = now.getHours();
    if (h < 11) return 'Selamat Pagi';
    if (h < 15) return 'Selamat Siang';
    if (h < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-4 animate-pulse h-24 bg-slate-50 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Greeting Header */}
      <div className="card overflow-hidden border-0 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-lg">{greeting()}, Ustaz {profile?.nama_panggilan || profile?.nama_lengkap?.split(' ')[0] || ''}</p>
              <p className="text-emerald-100 text-sm">
                {now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Ongoing or Next Class */}
          {ongoingClass ? (
            <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
                <span className="text-xs font-bold text-emerald-100 uppercase">Sedang Berlangsung</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <BookOpen className="w-5 h-5 text-emerald-100" />
                <span className="font-bold">{ongoingClass.pelajaran}</span>
                <span className="badge bg-white/20 text-white text-xs">{ongoingClass.kelas}</span>
              </div>
              <div className="flex items-center gap-3 mt-2 text-sm text-emerald-100">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {ongoingClass.jam_mulai} - {ongoingClass.jam_selesai}
                </span>
                {ongoingClass.ruangan && (
                  <span>{ongoingClass.ruangan}</span>
                )}
              </div>
            </div>
          ) : nextClass ? (
            <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="w-4 h-4 text-emerald-100" />
                <span className="text-xs font-bold text-emerald-100">Jadwal Berikutnya</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <BookOpen className="w-5 h-5 text-emerald-100" />
                <span className="font-bold">{nextClass.pelajaran}</span>
                <span className="badge bg-white/20 text-white text-xs">{nextClass.kelas}</span>
                <span className="text-sm text-emerald-100 ml-auto">{nextClass.jam_mulai} - {nextClass.jam_selesai}</span>
              </div>
              {countdown && (
                <div className="flex items-center gap-2 bg-emerald-800/40 rounded-xl px-3 py-2">
                  <Timer className="w-4 h-4 text-emerald-200" />
                  <span className="text-xs font-semibold text-emerald-100">Masuk dalam:</span>
                  <div className="flex items-center gap-1.5 ml-auto font-mono text-sm">
                    <span className="bg-white/20 rounded px-2 py-0.5 font-bold">{String(countdown.hours).padStart(2, '0')}</span>
                    <span className="text-emerald-200">:</span>
                    <span className="bg-white/20 rounded px-2 py-0.5 font-bold">{String(countdown.minutes).padStart(2, '0')}</span>
                    <span className="text-emerald-200">:</span>
                    <span className="bg-white/20 rounded px-2 py-0.5 font-bold">{String(countdown.seconds).padStart(2, '0')}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white/15 rounded-2xl p-4 backdrop-blur-sm">
              <p className="text-sm text-emerald-100">Tidak ada jadwal mengajar hari ini.</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{muridCount}</p>
              <p className="text-xs text-slate-500">Total Santri</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{absensiStats.total > 0 ? Math.round((absensiStats.hadir / absensiStats.total) * 100) : 0}%</p>
              <p className="text-xs text-slate-500">Kehadiran Hari Ini</p>
            </div>
          </div>
        </div>
      </div>

      {/* Absensi Stats */}
      {absensiStats.total > 0 && (
        <div className="card p-4">
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4" />
            Statistik Kehadiran Hari Ini
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Hadir', val: absensiStats.hadir, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Izin', val: absensiStats.izin, color: 'bg-amber-50 text-amber-700' },
              { label: 'Sakit', val: absensiStats.sakit, color: 'bg-sky-50 text-sky-700' },
              { label: 'Alpha', val: absensiStats.alpha, color: 'bg-rose-50 text-rose-700' },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-2 text-center ${s.color}`}>
                <p className="text-lg font-bold">{s.val}</p>
                <p className="text-[10px] font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jadwal Hari Ini */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
            <CalendarDays className="w-4 h-4" />
            Jadwal Hari Ini
          </h3>
          <span className="badge badge-info text-xs">{jadwalHariIni.length} jadwal</span>
        </div>

        {jadwalHariIni.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Tidak ada jadwal hari ini</p>
        ) : (
          <div className="space-y-2">
            {jadwalHariIni.map((j) => {
              const isActive = ongoingClass?.id === j.id;
              const isDone = (() => {
                const [h, m] = j.jam_selesai.split(':').map(Number);
                const endMin = h * 60 + m;
                const nowMin = now.getHours() * 60 + now.getMinutes();
                return nowMin >= endMin;
              })();

              return (
                <div
                  key={j.id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${isActive ? 'bg-emerald-50 border border-emerald-200' : isDone ? 'bg-slate-50 opacity-60' : 'bg-slate-50'}`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white text-xs font-bold text-slate-600">
                    {j.jam_mulai.slice(0, 5)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{j.pelajaran}</p>
                    <span className="badge badge-success text-[10px]">{j.kelas}</span>
                  </div>
                  {isActive && (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Aktif
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Agenda & Pengumuman */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Agenda */}
        {agendaList.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                <Bell className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-700 text-sm">Agenda Mendatang</h3>
            </div>
            <div className="space-y-2">
              {agendaList.map(a => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex flex-col items-center justify-center">
                    <span className="text-sm font-bold text-amber-700">{new Date(a.tanggal).getDate()}</span>
                    <span className="text-[8px] text-amber-500">{new Date(a.tanggal).toLocaleString('id-ID', { month: 'short' })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">{a.judul}</p>
                    <span className="badge badge-warning text-[9px]">{a.jenis}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pengumuman */}
        {pengumumanList.length > 0 && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-sky-50 rounded-lg flex items-center justify-center">
                <Megaphone className="w-4 h-4 text-sky-600" />
              </div>
              <h3 className="font-bold text-slate-700 text-sm">Pengumuman</h3>
            </div>
            <div className="space-y-2">
              {pengumumanList.map(p => (
                <div key={p.id} className="bg-slate-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-700">{p.judul}</span>
                    <span className="badge badge-info text-[9px]">{p.kategori ?? ''}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{p.isi}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
