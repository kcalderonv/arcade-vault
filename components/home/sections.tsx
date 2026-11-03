import Link from "next/link";
import { Reveal } from "@/components/reveal";
import { GAMES } from "@/lib/data";
import {
  FAQ,
  FEATURES,
  PRICING_PERKS,
  RECENT_SCORES,
  STATS,
  TOP_PLAYERS,
} from "@/lib/home-data";
import type { Game, NeonColor } from "@/lib/types";
import { FeatureIcon } from "./feature-icon";

function SectionHead({
  n,
  color,
  title,
}: {
  n: string;
  color: NeonColor;
  title: string;
}) {
  return (
    <div className="section-head">
      <div className={`kicker pixel neon-${color}`}>{`// ${n}`}</div>
      <h2 className="section-title">{title}</h2>
      <div className="section-rule"></div>
    </div>
  );
}

export function Features() {
  return (
    <Reveal className="home-section">
      <SectionHead n="01" color="magenta" title="¿POR QUÉ ARCADE VAULT?" />
      <div className="feature-grid">
        {FEATURES.map((f, i) => (
          <div
            key={f.title}
            className={"feature-card " + f.color}
            style={{ transitionDelay: i * 80 + "ms" }}
          >
            <FeatureIcon kind={f.icon} />
            <div className="ft-title pixel">{f.title}</div>
            <div className="ft-desc">{f.desc}</div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

function MiniCard({ game }: { game: Game }) {
  return (
    <Link className="mini-card" href={`/juegos/${game.id}`}>
      <div className="mini-cover">
        <div className={"cover-bg " + game.cover}></div>
      </div>
      <div className="mini-meta">
        <div className="mini-title">{game.title}</div>
        <div className="mini-cat">{game.cat}</div>
      </div>
    </Link>
  );
}

export function GamesPreview() {
  return (
    <Reveal className="home-section">
      <SectionHead n="02" color="cyan" title="JUEGOS DISPONIBLES AHORA" />
      <div className="mini-rail">
        {GAMES.slice(0, 6).map((g) => (
          <MiniCard key={g.id} game={g} />
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <Link className="btn lg" href="/biblioteca">
          VER TODOS LOS JUEGOS →
        </Link>
      </div>
    </Reveal>
  );
}

export function Stats() {
  return (
    <Reveal className="home-stats">
      <div className="stats-inner">
        {STATS.map((st, i) => (
          <div
            key={st.u}
            className="stat-block"
            style={{ transitionDelay: i * 90 + "ms" }}
          >
            <div className="stat-n neon-yellow">{st.n}</div>
            <div className="stat-u pixel">{st.u}</div>
            <div className="stat-s">{st.s}</div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

export function Activity() {
  return (
    <Reveal className="home-section">
      <SectionHead n="03" color="yellow" title="ACTIVIDAD EN VIVO" />
      <div className="activity-grid">
        <div className="activity-card">
          <div className="ac-head">
            <div className="ac-title pixel">▸ ÚLTIMAS PUNTUACIONES</div>
          </div>
          <div className="ticker">
            {RECENT_SCORES.map((r, i) => (
              <div
                key={r.player}
                className="tick-row"
                style={{ animationDelay: i * 60 + "ms" }}
              >
                <span className={"tk-p neon-" + r.color}>{r.player}</span>
                <span className="tk-mid">▸ {r.game}</span>
                <span className="tk-s">+{r.score.toLocaleString("es-ES")}</span>
                <span className="tk-t">{r.ago}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="activity-card">
          <div className="ac-head">
            <div className="ac-title pixel neon-magenta">▸ TOP JUGADORES · HOY</div>
            <Link className="lb-link" href="/salon">
              VER SALÓN →
            </Link>
          </div>
          <div className="top-list">
            {TOP_PLAYERS.map((r, i) => (
              <div
                key={r.player}
                className={
                  "top-row" +
                  (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
                }
              >
                <span className="tp-rk">#{String(r.rank).padStart(2, "0")}</span>
                <span className="tp-bar">
                  <span className="tp-fill" style={{ width: 100 - i * 16 + "%" }}></span>
                </span>
                <span className="tp-p">{r.player}</span>
                <span className="tp-s">{r.score.toLocaleString("es-ES")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export function Pricing() {
  return (
    <Reveal className="home-section">
      <SectionHead n="04" color="green" title="PRECIOS" />
      <div className="pricing-grid">
        <div className="price-card">
          <div className="pc-label pixel">PLAN ÚNICO</div>
          <div className="pc-name pixel">JUGADOR VAULT</div>
          <div className="pc-amount">
            <span className="pc-amount-n">$0</span>
            <span className="pc-amount-u">/ SIEMPRE</span>
          </div>
          <div className="pc-tag">SIN TRUCOS · SIN LETRA PEQUEÑA</div>
          <ul className="pc-list">
            {PRICING_PERKS.map((p) => (
              <li key={p}>✔ {p}</li>
            ))}
          </ul>
          <Link className="btn xl pulse" style={{ width: "100%" }} href="/auth">
            EMPEZAR GRATIS →
          </Link>
          <div className="pc-foot">No pedimos tarjeta. Nunca lo haremos.</div>
          <div className="pc-stamp pixel">
            FREE
            <br />
            PLAY
          </div>
        </div>

        <div className="pricing-faq">
          {FAQ.map((f) => (
            <div key={f.q} className="faq-item">
              <div className="faq-q pixel">{f.q}</div>
              <div className="faq-a">{f.a}</div>
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}

export function FinalCta() {
  return (
    <Reveal className="home-final">
      <h2 className="final-title pixel">¿LISTO PARA JUGAR?</h2>
      <Link className="btn xl pulse final-cta" href="/biblioteca">
        INSERTAR MONEDA →
      </Link>
      <div className="final-tag">
        Gratis. Sin registro obligatorio. Empieza en segundos.
      </div>
    </Reveal>
  );
}
