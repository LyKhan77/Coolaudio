const ARCHITECTURE_CARDS = [
  {
    kicker: '01 · CLIENT-SIDE WASM',
    accentColor: 'var(--primary)',
    title: 'Zero Server Uploads',
    body: 'Powered by single-threaded FFmpeg.wasm directly inside your browser tab—fast, private, and deployable as pure static files.',
  },
  {
    kicker: '02 · DUAL CUT ENGINE',
    accentColor: 'var(--accent)',
    title: 'Fast Copy or Frame-Exact',
    body: 'Trim MP4 clips instantaneously with lossless stream copy, or switch to H.264/AAC re-encoding for frame-accurate boundaries.',
  },
  {
    kicker: '03 · STUDIO EXPORT',
    accentColor: 'var(--primary)',
    title: 'Bitrate & ID3v2.3 Tags',
    body: 'Encode 128, 192, or 320 kbps MP3 audio using libmp3lame with embedded Title, Artist, and Album metadata.',
  },
];

const FORMAT_ROWS = [
  {
    tool: 'MP4 → MP3',
    input: '.mp4, .m4v, .mov',
    output: '.mp3',
    controls: 'Trim · 128/192/320k · ID3v2.3',
  },
  {
    tool: 'Trim MP4',
    input: '.mp4, .m4v, .mov',
    output: '.mp4',
    controls: 'Fast Copy · Frame Accurate',
  },
  {
    tool: 'Compress MP4',
    input: '.mp4, .m4v, .mov',
    output: '.mp4',
    controls: 'Target size in MB · Trim',
  },
  {
    tool: 'Video → GIF',
    input: '.mp4, .m4v, .mov',
    output: '.gif, .webp',
    controls: 'Trim (max 30s) · 10/12/15 fps · 320/480/640px',
  },
  {
    tool: 'Trim MP3',
    input: '.mp3',
    output: '.mp3',
    controls: 'Trim · 128/192/320k · ID3v2.3',
  },
  {
    tool: 'Audio → MP3',
    input: '.wav, .m4a, .ogg, .flac, .aac, .opus, .webm',
    output: '.mp3',
    controls: 'Trim · 128/192/320k · ID3v2.3',
  },
];

const FAQ_ITEMS = [
  {
    q: 'Are my video or audio files uploaded anywhere?',
    a: 'Never. All decoding, trimming, and MP3 encoding run locally inside your browser using WebAssembly memory.',
  },
  {
    q: 'What file sizes work best?',
    a: 'Your browser holds several copies of the file in memory while encoding. Aim for under about 500 MB on desktop and about 200 MB on phones. Long videos take a while, so keep the tab open until it finishes.',
  },
  {
    q: 'When should I choose Fast Copy vs Accurate in Trim MP4?',
    a: 'Use Fast Copy for instant, lossless cuts on keyframe boundaries. Switch to Accurate when you need frame-exact start and end times.',
  },
  {
    q: 'How exact is Compress MP4?',
    a: 'It aims for your target size in MB and usually lands at or a bit under it. Very small targets for long videos are blocked because the picture would be unwatchable.',
  },
  {
    q: 'Why ID3v2.3 instead of ID3v2.4?',
    a: 'ID3v2.3 provides the widest compatibility across Windows Explorer, macOS Finder, car stereos, and mobile audio players.',
  },
];

export function LandingSections() {
  return (
    <div className="space-y-10 pt-4">
      <section aria-labelledby="arch-heading" className="space-y-3">
        <h2
          id="arch-heading"
          className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[var(--muted)]"
        >
          Architecture &amp; Capabilities
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ARCHITECTURE_CARDS.map((card) => (
            <article key={card.kicker} className="brutal-box p-4 space-y-1.5">
              <div
                className="font-mono-tabular text-[11px] font-bold"
                style={{ color: card.accentColor }}
              >
                {card.kicker}
              </div>
              <h3 className="text-base font-bold">{card.title}</h3>
              <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="formats-heading" className="space-y-3">
        <h2
          id="formats-heading"
          className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[var(--muted)]"
        >
          Supported Tools &amp; Formats
        </h2>
        <div className="brutal-box overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="bg-[var(--surface)] border-b-2 border-[var(--ink)]">
                <th className="font-mono-tabular py-2.5 px-3 font-bold uppercase text-[11px]">
                  Tool
                </th>
                <th className="font-mono-tabular py-2.5 px-3 font-bold uppercase text-[11px]">
                  Input Formats
                </th>
                <th className="font-mono-tabular py-2.5 px-3 font-bold uppercase text-[11px]">
                  Output
                </th>
                <th className="font-mono-tabular py-2.5 px-3 font-bold uppercase text-[11px]">
                  Controls
                </th>
              </tr>
            </thead>
            <tbody>
              {FORMAT_ROWS.map((row, idx) => (
                <tr
                  key={row.tool}
                  className={idx < FORMAT_ROWS.length - 1 ? 'border-b border-[var(--ink)]' : ''}
                >
                  <td className="py-2.5 px-3 font-bold whitespace-nowrap">{row.tool}</td>
                  <td className="py-2.5 px-3 font-mono-tabular text-xs">{row.input}</td>
                  <td className="py-2.5 px-3 font-mono-tabular text-xs font-bold">{row.output}</td>
                  <td className="py-2.5 px-3 text-[var(--muted)]">{row.controls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="space-y-4">
        <h2
          id="faq-heading"
          className="font-mono-tabular text-xs font-bold uppercase tracking-wider text-[var(--muted)]"
        >
          Frequently Asked
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FAQ_ITEMS.map((item) => (
            <div key={item.q} className="border-t-2 border-[var(--ink)] pt-3 space-y-1">
              <h3 className="font-mono-tabular text-xs font-bold uppercase">{item.q}</h3>
              <p className="text-xs sm:text-sm text-[var(--muted)] leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
