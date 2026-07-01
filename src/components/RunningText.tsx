import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface RunningTextProps {
  profileName?: string;
  nextClass?: { pelajaran: string; jam_mulai: string; kelas?: string } | null;
}

export default function RunningText({ profileName, nextClass }: RunningTextProps) {
  const [globalText, setGlobalText] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalText();

    // Subscribe to pengaturan changes
    const channel = supabase
      .channel('pengaturan-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengaturan' }, () => {
        fetchGlobalText();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchGlobalText = async () => {
    try {
      const { data } = await supabase
        .from('pengaturan')
        .select('nilai')
        .eq('kunci', 'running_text_global')
        .maybeSingle();

      if (data?.nilai) {
        setGlobalText(data.nilai);
      }
    } catch (error) {
      console.error('Error fetching running text:', error);
    }
    setLoading(false);
  };

  // Build the complete message
  const buildMessage = () => {
    const parts: string[] = [];

    // Greeting
    if (profileName) {
      const hour = new Date().getHours();
      let greeting = 'Assalamu\'alaikum';
      if (hour < 11) greeting += ' selamat pagi';
      else if (hour < 15) greeting += ' selamat siang';
      else if (hour < 18) greeting += ' selamat sore';
      else greeting += ' selamat malam';
      parts.push(`${greeting}, Ustaz ${profileName}.`);
    }

    // Global announcement
    if (globalText) {
      parts.push(globalText);
    }

    // Next class reminder
    if (nextClass) {
      parts.push(`Pengingat: Jadwal selanjutnya adalah ${nextClass.pelajaran}${nextClass.kelas ? ` Kelas ${nextClass.kelas}` : ''} Jam ${nextClass.jam_mulai.slice(0, 5)} WIB.`);
    }

    return parts.join(' ');
  };

  const message = buildMessage();

  if (!message && loading) return null;

  // If no message at all, don't render
  if (!message) return null;

  return (
    <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 text-white py-2 overflow-hidden">
      <div className="relative w-full">
        <div
          className="animate-marquee whitespace-nowrap flex items-center gap-8 text-sm font-medium"
          style={{ animationDuration: `${Math.max(15, message.length / 5)}s` }}
        >
          {/* Triple the content for seamless loop */}
          <span>{message}</span>
          <span className="text-emerald-300">|</span>
          <span>{message}</span>
          <span className="text-emerald-300">|</span>
          <span>{message}</span>
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
      `}</style>
    </div>
  );
}
