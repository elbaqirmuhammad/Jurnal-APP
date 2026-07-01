import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Megaphone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import type { AgendaPenting, Pengumuman, ShowToast } from '../types';

type Tab = 'agenda' | 'pengumuman';

const JENIS_AGENDA = ['Ujian', 'Liburan', 'Rapat', 'Kegiatan', 'Lainnya'];
const KATEGORI_PENGUMUMAN = ['Umum', 'Akademik', 'Keuangan', 'Acara', 'Darurat'];

const JENIS_COLOR: Record<string, string> = {
  Ujian: 'badge-danger', Liburan: 'badge-success', Rapat: 'badge-info',
  Kegiatan: 'badge-warning', Lainnya: 'bg-slate-100 text-slate-600',
};
const KAT_COLOR: Record<string, string> = {
  Umum: 'bg-slate-100 text-slate-600', Akademik: 'badge-info', Keuangan: 'badge-warning',
  Acara: 'badge-success', Darurat: 'badge-danger',
};

export default function AgendaPage({ showToast }: { showToast: ShowToast }) {
  const [tab, setTab] = useState<Tab>('agenda');
  const [agendaList, setAgendaList] = useState<AgendaPenting[]>([]);
  const [pengumumanList, setPengumumanList] = useState<Pengumuman[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const [agendaForm, setAgendaForm] = useState({ judul: '', catatan: '', jenis: 'Kegiatan', tanggal: today });
  const [pengForm, setPengForm] = useState({ judul: '', isi: '', kategori: 'Umum', tanggal: today });

  const fetchAll = async () => {
    setLoading(true);
    const [ar, pr] = await Promise.all([
      supabase.from('agenda_penting').select('*').order('tanggal', { ascending: true }),
      supabase.from('pengumuman').select('*').order('tanggal', { ascending: false }),
    ]);
    if (ar.data) setAgendaList(ar.data);
    if (pr.data) setPengumumanList(pr.data);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAddAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('agenda_penting').insert({
      judul: agendaForm.judul, catatan: agendaForm.catatan || null,
      jenis: agendaForm.jenis, tanggal: agendaForm.tanggal,
    });
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Agenda ditambahkan!', 'success');
    setShowModal(false);
    setAgendaForm({ judul: '', catatan: '', jenis: 'Kegiatan', tanggal: today });
    fetchAll();
  };

  const handleAddPengumuman = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('pengumuman').insert({
      judul: pengForm.judul, isi: pengForm.isi,
      kategori: pengForm.kategori, tanggal: pengForm.tanggal,
    });
    setSaving(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Pengumuman ditambahkan!', 'success');
    setShowModal(false);
    setPengForm({ judul: '', isi: '', kategori: 'Umum', tanggal: today });
    fetchAll();
  };

  const deleteAgenda = async (id: number) => {
    await supabase.from('agenda_penting').delete().eq('id', id);
    setAgendaList(prev => prev.filter(a => a.id !== id));
    showToast('Agenda dihapus', 'info');
  };

  const deletePeng = async (id: string | number) => {
    await supabase.from('pengumuman').delete().eq('id', id);
    setPengumumanList(prev => prev.filter(p => p.id !== id));
    showToast('Pengumuman dihapus', 'info');
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const isUpcoming = (d: string) => new Date(d) >= new Date(today);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="section-title">Agenda & Pengumuman</h2>
          <p className="section-subtitle">Jadwal penting dan informasi sekolah</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          <span>Tambah</span>
        </button>
      </div>

      <div className="tab-switcher mb-5">
        <button onClick={() => setTab('agenda')} className={`tab-btn ${tab === 'agenda' ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
          Agenda Penting
        </button>
        <button onClick={() => setTab('pengumuman')} className={`tab-btn ${tab === 'pengumuman' ? 'tab-btn-active' : 'tab-btn-inactive'}`}>
          Pengumuman
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="card p-4 animate-pulse h-20 bg-slate-50 rounded-2xl" />)}
        </div>
      ) : (
        <>
          {tab === 'agenda' && (
            agendaList.length === 0 ? (
              <EmptyState title="Belum ada agenda" description="Tambahkan agenda penting seperti ujian, kegiatan, atau liburan." icon={<Calendar className="w-8 h-8 text-slate-300" />} />
            ) : (
              <div className="space-y-3">
                {agendaList.map(a => {
                  const upcoming = isUpcoming(a.tanggal);
                  return (
                    <div key={a.id} className={`card p-4 flex gap-3 ${upcoming ? 'border-l-4 border-l-emerald-400' : 'opacity-70'}`}>
                      <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 ${upcoming ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        <span className={`text-base font-bold ${upcoming ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {new Date(a.tanggal).getDate()}
                        </span>
                        <span className={`text-[9px] font-semibold ${upcoming ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {new Date(a.tanggal).toLocaleString('id-ID', { month: 'short' })}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-slate-800 text-sm">{a.judul}</span>
                          <span className={`badge text-[10px] ${JENIS_COLOR[a.jenis] ?? 'bg-slate-100 text-slate-600'}`}>{a.jenis}</span>
                        </div>
                        <p className="text-xs text-slate-400">{formatDate(a.tanggal)}</p>
                        {a.catatan && <p className="text-xs text-slate-500 mt-1 italic">{a.catatan}</p>}
                      </div>
                      <button onClick={() => deleteAgenda(a.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors self-start flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {tab === 'pengumuman' && (
            pengumumanList.length === 0 ? (
              <EmptyState title="Belum ada pengumuman" description="Tambahkan pengumuman untuk santri dan wali santri." icon={<Megaphone className="w-8 h-8 text-slate-300" />} />
            ) : (
              <div className="space-y-3">
                {pengumumanList.map(p => (
                  <div key={p.id} className="card p-4">
                    <div className="flex items-start gap-2 justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm">{p.judul}</span>
                          <span className={`badge text-[10px] ${KAT_COLOR[p.kategori ?? ''] ?? 'bg-slate-100 text-slate-600'}`}>{p.kategori}</span>
                        </div>
                        <p className="text-xs text-slate-400 mb-2">{p.tanggal ? formatDate(p.tanggal) : ''}</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{p.isi}</p>
                      </div>
                      <button onClick={() => deletePeng(String(p.id))} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={tab === 'agenda' ? 'Tambah Agenda' : 'Tambah Pengumuman'} size="sm">
        {tab === 'agenda' ? (
          <form onSubmit={handleAddAgenda} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Judul Agenda</label>
              <input type="text" value={agendaForm.judul} onChange={e => setAgendaForm(p => ({ ...p, judul: e.target.value }))} className="input-field text-sm" placeholder="cth. Ujian Tengah Semester..." required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jenis</label>
                <select value={agendaForm.jenis} onChange={e => setAgendaForm(p => ({ ...p, jenis: e.target.value }))} className="input-field text-sm">
                  {JENIS_AGENDA.map(j => <option key={j}>{j}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal</label>
                <input type="date" value={agendaForm.tanggal} onChange={e => setAgendaForm(p => ({ ...p, tanggal: e.target.value }))} className="input-field text-sm" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Catatan (opsional)</label>
              <textarea value={agendaForm.catatan} onChange={e => setAgendaForm(p => ({ ...p, catatan: e.target.value }))} className="input-field text-sm resize-none" rows={2} />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleAddPengumuman} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Judul Pengumuman</label>
              <input type="text" value={pengForm.judul} onChange={e => setPengForm(p => ({ ...p, judul: e.target.value }))} className="input-field text-sm" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Kategori</label>
                <select value={pengForm.kategori} onChange={e => setPengForm(p => ({ ...p, kategori: e.target.value }))} className="input-field text-sm">
                  {KATEGORI_PENGUMUMAN.map(k => <option key={k}>{k}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tanggal</label>
                <input type="date" value={pengForm.tanggal} onChange={e => setPengForm(p => ({ ...p, tanggal: e.target.value }))} className="input-field text-sm" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Isi Pengumuman</label>
              <textarea value={pengForm.isi} onChange={e => setPengForm(p => ({ ...p, isi: e.target.value }))} className="input-field text-sm resize-none" rows={4} required />
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 text-sm">Batal</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1 text-sm">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
