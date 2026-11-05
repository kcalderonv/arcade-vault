"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GAMES } from "@/lib/data";
import { getBestScore, getTopScores } from "@/lib/scores";
import { useSession } from "@/lib/session";
import type { LeaderboardRow } from "@/lib/types";

const fmt = (n: number) => n.toLocaleString("es-ES");
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
const tier = (i: number) =>
  i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "";

type Loaded = {
  key: string;
  status: "ok" | "error";
  rows: LeaderboardRow[];
  best: LeaderboardRow | null;
};

function Slot({ row }: { row?: LeaderboardRow }) {
  return (
    <>
      <div className="name">{row ? row.player_name : "—"}</div>
      <div className="score">{row ? fmt(row.score) : "—"}</div>
      <div className="date">{row ? fmtDate(row.created_at) : ""}</div>
    </>
  );
}

export function HallOfFame() {
  const { user } = useSession();
  const [tab, setTab] = useState(GAMES[0].id);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const game = GAMES.find((g) => g.id === tab)!;
  const userName = user?.name ?? null;
  const key = `${tab}|${userName ?? ""}|${attempt}`;

  useEffect(() => {
    // Bandera de cancelación: ignora respuestas de pestañas anteriores.
    let cancelled = false;
    Promise.all([
      getTopScores(tab),
      userName ? getBestScore(tab, userName) : Promise.resolve(null),
    ])
      .then(([rows, best]) => {
        if (!cancelled) setLoaded({ key, status: "ok", rows, best });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key, status: "error", rows: [], best: null });
      });
    return () => {
      cancelled = true;
    };
  }, [tab, userName, key]);

  // Los datos solo valen si corresponden a la pestaña/sesión actual.
  const current = loaded?.key === key ? loaded : null;
  const loading = current === null;
  const error = current?.status === "error";
  const rows = current?.status === "ok" ? current.rows : [];
  const best = current?.status === "ok" ? current.best : null;
  const empty = !loading && !error && rows.length === 0;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {GAMES.map((g) => (
          <button
            key={g.id}
            className={"chip" + (tab === g.id ? " active" : "")}
            onClick={() => setTab(g.id)}
          >
            {g.title}
          </button>
        ))}
      </div>

      {loading && (
        <div
          className="pixel"
          role="status"
          style={{ textAlign: "center", fontSize: 11, padding: "48px 0" }}
        >
          CARGANDO PUNTAJES…
        </div>
      )}

      {error && (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div
            className="pixel"
            role="alert"
            style={{ fontSize: 11, color: "var(--magenta)", marginBottom: 16 }}
          >
            NO SE PUDIERON CARGAR LOS PUNTAJES
          </div>
          <button className="btn yellow" onClick={() => setAttempt((a) => a + 1)}>
            REINTENTAR
          </button>
        </div>
      )}

      {empty && (
        <div
          className="pixel"
          style={{ textAlign: "center", fontSize: 12, padding: "48px 0" }}
        >
          AÚN NO HAY PUNTAJES
        </div>
      )}

      {!loading && !error && !empty && (
        <>
          <div className="podium">
            <div className="podium-slot silver">
              <div className="rank-num">02</div>
              <Slot row={rows[1]} />
            </div>
            <div className="podium-slot gold">
              <div
                className="pixel"
                style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
              >
                CAMPEÓN
              </div>
              <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
                01
              </div>
              <div className="name">{rows[0].player_name}</div>
              <div className="score" style={{ fontSize: 20 }}>
                {fmt(rows[0].score)}
              </div>
              <div className="date">{fmtDate(rows[0].created_at)}</div>
            </div>
            <div className="podium-slot bronze">
              <div className="rank-num">03</div>
              <Slot row={rows[2]} />
            </div>
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={tab + r.id}
                className={"tr" + tier(i)}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(i + 1).padStart(2, "0")}</div>
                <div className="pl">{r.player_name}</div>
                <div className="sc">{fmt(r.score)}</div>
                <div className="dt">{fmtDate(r.created_at)}</div>
              </div>
            ))}
            {user && best && (
              <>
                <div className="tr you-label">▸ TU MEJOR MARCA EN {game.title}</div>
                <div
                  className="tr you"
                  style={{ animationDelay: `${rows.length * 50 + 50}ms` }}
                >
                  <div className="rk" style={{ color: "var(--yellow)" }}>
                    ★
                  </div>
                  <div className="pl" style={{ color: "var(--yellow)" }}>
                    {best.player_name}
                  </div>
                  <div
                    className="sc"
                    style={{
                      color: "var(--yellow)",
                      textShadow: "0 0 6px rgba(245,255,0,0.5)",
                    }}
                  >
                    {fmt(best.score)}
                  </div>
                  <div className="dt">{fmtDate(best.created_at)}</div>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link className="btn lg" href="/biblioteca">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
