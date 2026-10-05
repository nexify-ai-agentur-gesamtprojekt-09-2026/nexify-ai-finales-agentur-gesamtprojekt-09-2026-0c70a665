import { cockpit } from '../../lib/cockpit'

export const dynamic = 'force-dynamic'

const card: React.CSSProperties = {
  background: 'var(--nx-color-graphit-600)',
  border: '1px solid var(--nx-color-linie-mittel)',
  borderRadius: 'var(--nx-radius-karte)',
  boxShadow: 'var(--nx-shadow-karte)',
  padding: 'var(--nx-space-5)',
}

const kpi: React.CSSProperties = {
  fontFamily: 'var(--nx-font-mono)',
  fontSize: '2rem',
  color: 'var(--nx-color-text-primaer)',
  lineHeight: 1.1,
}

const label: React.CSSProperties = {
  color: 'var(--nx-color-text-gedaempft)',
  fontSize: '0.85rem',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}

function Punkt({ ok }: { ok: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        width: 12,
        height: 12,
        borderRadius: '999px',
        background: ok ? 'var(--nx-color-marke-lime)' : 'var(--nx-color-marke-rot, #FF8A7A)',
        marginRight: 8,
      }}
    />
  )
}

export default async function CockpitPage() {
  const data = await cockpit('nexify')
  const zeit = new Date(data.erzeugt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })
  const diensteOk = data.dienste.filter((d) => d.ok).length

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--nx-space-6)' }}>
      <header style={{ marginBottom: 'var(--nx-space-6)' }}>
        <p style={{ ...label, margin: 0 }}>myADMIN · Leitstand</p>
        <h1 style={{ color: 'var(--nx-color-text-primaer)', fontSize: '2rem', margin: '4px 0' }}>
          Cockpit
        </h1>
        <p style={{ margin: 0, color: 'var(--nx-color-text-gedaempft)' }}>
          Stand {zeit} · Daten live gelesen, nichts zwischengespeichert.
        </p>
      </header>

      <section
        aria-label="Kennzahlen"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 'var(--nx-space-4)',
          marginBottom: 'var(--nx-space-6)',
        }}
      >
        <div style={card}>
          <p style={label}>Dienste erreichbar</p>
          <p style={kpi}>
            {diensteOk}/{data.dienste.length}
          </p>
        </div>
        <div style={card}>
          <p style={label}>Last (1 min)</p>
          <p style={kpi}>{data.system.last1.toFixed(2)}</p>
        </div>
        <div style={card}>
          <p style={label}>Speicher frei</p>
          <p style={kpi}>{data.system.speicherFreiGb} GB</p>
        </div>
        <div style={card}>
          <p style={label}>Platte frei</p>
          <p style={kpi}>
            {data.system.plattenFreiGb}
            <span style={{ fontSize: '1rem', color: 'var(--nx-color-text-gedaempft)' }}>
              /{data.system.plattenGesamtGb} GB
            </span>
          </p>
        </div>
      </section>

      <section style={{ display: 'grid', gap: 'var(--nx-space-5)', gridTemplateColumns: '1fr' }}>
        <div style={card}>
          <h2 style={{ marginTop: 0, color: 'var(--nx-color-text-primaer)', fontSize: '1.15rem' }}>
            Dienste
          </h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {data.dienste.map((d) => (
              <li
                key={d.url}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: 'var(--nx-target-min)',
                  borderBottom: '1px solid var(--nx-color-linie-fein)',
                }}
              >
                <span>
                  <Punkt ok={d.ok} />
                  {d.name}
                </span>
                <span style={{ fontFamily: 'var(--nx-font-mono)', color: 'var(--nx-color-text-tertiaer)' }}>
                  {d.status ?? 'keine Antwort'} · {d.ms} ms
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div style={card}>
          <h2 style={{ marginTop: 0, color: 'var(--nx-color-text-primaer)', fontSize: '1.15rem' }}>
            Kennzahlen
          </h2>
          {data.kennzahlen.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--nx-color-text-gedaempft)' }}>
              Noch keine Kennzahlen gespeichert. Die Ablage ist bereit und mandantengetrennt.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <caption style={{ textAlign: 'left', color: 'var(--nx-color-text-gedaempft)', paddingBottom: 8 }}>
                Mandant nexify · letzte 20 Einträge
              </caption>
              <thead>
                <tr>
                  {['Name', 'Wert', 'Quelle', 'Zeitpunkt'].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      style={{ textAlign: 'left', ...label, borderBottom: '1px solid var(--nx-color-linie-stark)', padding: '8px 0' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.kennzahlen.map((k, i) => (
                  <tr key={`${k.name}-${i}`}>
                    <td style={{ padding: '8px 0' }}>{k.name}</td>
                    <td style={{ padding: '8px 0', fontFamily: 'var(--nx-font-mono)' }}>
                      {k.wert}
                      {k.einheit ? ` ${k.einheit}` : ''}
                    </td>
                    <td style={{ padding: '8px 0', color: 'var(--nx-color-text-gedaempft)' }}>{k.quelle}</td>
                    <td style={{ padding: '8px 0', color: 'var(--nx-color-text-gedaempft)' }}>
                      {new Date(k.zeitpunkt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <footer style={{ marginTop: 'var(--nx-space-6)', color: 'var(--nx-color-text-gedaempft)', fontSize: '0.85rem' }}>
        Laufzeit {data.system.prozessUptimeStunden} h · Host {data.system.hostUptimeStunden} h ·{' '}
        {data.system.cpus} Kerne · JSON unter <code>/myadmin/api/cockpit</code>
      </footer>
    </main>
  )
}
