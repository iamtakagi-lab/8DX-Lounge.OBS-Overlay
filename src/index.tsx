process.env.TZ = "Asia/Tokyo";

import Koa from "koa";
import Router from "@koa/router";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import got from "got";
import $ from "transform-ts";
import fs from "fs";

const app = new Koa();
const router = new Router();

const endpoint = "https://www.mk8dx-lounge.com/api" as const;
const userAgent =
  `${process.env.npm_package_name}/${process.env.npm_package_version} (+https://github.com/iamtakagi/8DX-Lounge.OBS-Overlay)` as const;

type PlayerDetails = {
  playerId: number;
  name: string;
  mkcId: number;
  countryCode: string;
  countryName: string;
  switchFc: number;
  isHidden: boolean;
  season: number;
  mmr: number;
  maxMmr: number;
  overallRank: number;
  eventsPlayed: number;
  winRate: number;
  winsLastTen: number;
  lossesLastTen: number;
  winLossLastTen: string;
  gainLossLastTen: number;
  largestGain: number;
  largestGanumberableId: number;
  largestLoss: number;
  largestLossTableId: number;
  averageScore: number;
  averageLastTen: number;
  partnerAverage: number;
  mmrChanges: {
    changeId: number;
    newMmr: number;
    mmrDelta: number;
    reason: string;
    time: string;
    score: number;
    partnerScores: number[];
    rank: number;
    tier: string;
    numTeams: number;
  }[];
  rank: string;
  forumLink: string;
};

const getPlayerDetails = (name: string, season: number) =>
  new Promise<PlayerDetails | null>(async (resolve) => {
    const url = `${endpoint}/player/details?name=${name}&season=${season}`;
    try {
      got<PlayerDetails | null>(url, {
        responseType: "json",
        headers: {
          "User-Agent": userAgent,
        },
      }).then((r) => resolve(r.body));
    } catch (err) {
      resolve(null);
    }
  });

//切り捨て用の関数
const f = (num: number) => Math.floor(num * Math.pow(10, 1)) / Math.pow(10, 1);

const Overlay: React.FC<{ details: PlayerDetails }> = ({ details }) => (
  <div className="overlay">
    <h1 className="title">MK8DX 150cc Lounge</h1>
    <div className="items">
      <p>Season {details.season}</p>
      <p>Player: {details.name}</p>
      <p>Country: {details.countryName}</p>
      <p>Rank: {details.overallRank}</p>
      <p>
        MMR: {details.mmr} ({details.rank})
      </p>
      <p>Peak MMR: {details.maxMmr}</p>
      <p>W-L (Last 10): {details.winLossLastTen}</p>
      <p>+/- (Last 10): {details.gainLossLastTen}</p>
      <p>Events Played: {details.eventsPlayed}</p>
      <p>Win Rate: {f(details.winRate * 100)}%</p>
      <p>Avg Last 10: {f(details.averageLastTen)}</p>
      <p>Avg: {f(details.averageScore)}</p>
      <p>Partner Avg: {f(details.partnerAverage)}</p>
    </div>
    <p className="link">8dxlounge-obs-overlay.vercel.app</p>
  </div>
);

// 静的assetsのルーティング
try {
  const STATIC_DIR = __dirname + "/../static";
  const allowedFiles = fs.readdirSync(STATIC_DIR);

  if (allowedFiles.length)
    router.get("/static/:filename", async (ctx, next) => {
      const filename = $.string.transformOrThrow(ctx.params.filename);
      if (!allowedFiles.includes(filename)) return next();
      const ext = filename.split(".");
      ctx.type =
        (
          {
            js: "application/javascript",
            css: "text/css",
          } as { [key: string]: string }
        )[ext.slice(-1)[0]] ?? "application/octet-stream";
      ctx.body = fs.createReadStream(STATIC_DIR + "/" + filename);
    });
} catch (e) {}

// ここから下は全てSSR
router.get("/", async (ctx, next) => {
  ctx.body = renderToStaticMarkup(
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <link rel="stylesheet" href="/static/style.css" />
        <title>MK8DX-Lounge.OBS-Overlay</title>
        <meta name="twitter:card" content="summary" />
        <meta property="og:title" content="MK8DX-Lounge.OBS-Overlay" />
        <meta property="og:description" content="MK8DX-Lounge.OBS-Overlay" />
      </head>
      <body>
        <main>
          <h1>8DX-Lounge.OBS-Overlay</h1>
          <p>
            OBS等の配信ツールで{" "}
            <a href="https://www.mk8dx-lounge.com/">MK8DX 150cc Lounge</a> の
            Stats を表示するオーバーレイです。
          </p>
          <section>
            <p>
              GitHub Repository:{" "}
              <a href="https://github.com/iamtakagi/8DX-Lounge.OBS-Overlay">
                https://github.com/iamtakagi/8DX-Lounge.OBS-Overlay
              </a>
            </p>
          </section>
          <section>
            <h2>使い方</h2>
            <p>
              OBSでブラウザソースに{" "}
              <a href="https://8dxlounge-obs-overlay.vercel.app/overlay/(ラウンジのプレイヤー名)/(シーズン)">
                https://8dxlounge-obs-overlay.vercel.app/overlay/(ラウンジのプレイヤー名)/(シーズン)
              </a>{" "}
              を貼り付け、幅300 高さ800 を指定します。
            </p>
            <p>
              例:{" "}
              <a href="https://8dxlounge-obs-overlay.vercel.app/overlay/takagi/5">
                https://8dxlounge-obs-overlay.vercel.app/overlay/takagi/5
              </a>
            </p>
            <img src="/static/sample.jpg" alt="" max-width="800" height="500" />
          </section>
        </main>
      </body>
    </html>
  );
  // 1日キャッシュ
  ctx.set("Cache-Control", "s-maxage=86400");
});

router.get("/overlay/:name/:season", async (ctx, next) => {
  const { name, season } = ctx.params;
  const details = await getPlayerDetails(name, Number(season));
  if (!details) return next();
  ctx.body = renderToStaticMarkup(
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin={"anonymous"} />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="/static/style.css" />
        <title>{name} | MK8DX-Lounge.OBS-Overlay</title>
        <meta name="twitter:card" content="summary" />
        <meta property="og:title" content={`${name} | MK8DX-Lounge.OBS-Overlay`} />
        <meta
          property="og:description"
          content={`${name} | MK8DX-Lounge.OBS-Overlay`}
        />
        {/* 10分毎に自動リロード */}
        <meta httpEquiv="refresh" content="600" />
      </head>
      <body>
        <Overlay details={details} />
      </body>
    </html>
  );
  // 10分キャッシュ
  ctx.set("Cache-Control", "s-maxage=600");
});

app.use(router.routes());
app.listen(process.env.PORT || 3000);
