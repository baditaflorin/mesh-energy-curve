import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/**
 * Load-bearing cross-peer assertion for the advertised core action:
 * "Each phone runs a 0–100 slider; the rolling average curve and min/max band
 * are visible on every phone in the room."
 *
 * Peer A drags its slider to a distinctive value. Because every peer publishes
 * its energy into Yjs awareness every second and recomputes the room aggregate
 * locally, peer B's room average / band readout must move toward A's value —
 * even though B never touched its own slider. If energy were kept in local
 * React state (the failure mode this guards against), B's HUD would stay at
 * B's own value and this assertion would fail.
 */
async function connect(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /connect/i }).click();
  await expect(page.getByRole("slider", { name: /your energy/i })).toBeVisible();
}

test("peer A's slider value crosses the mesh into peer B's room aggregate", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await connect(a);
    await connect(b);

    // Drive the advertised core action on peer A: drag the energy slider to a
    // value far from the 70 default so the cross-peer effect is unambiguous.
    const aSlider = a.getByRole("slider", { name: /your energy/i });
    await aSlider.fill("8");
    await expect(a.locator(".energy-slider-value")).toHaveText("8");

    // Peer B never moved its own slider (still at its 70 default). With two
    // peers publishing 8 and 70, B's locally-computed room band must span both
    // ends — proving A's value reached B over the awareness mesh. Read the
    // min/max band readout on the OPPOSITE peer.
    const bBand = b.locator(".energy-range-readout");
    await expect(bBand).toContainText(/band 8[–-]70/, { timeout: 15_000 });

    // And the room average on B (still showing B's own slider untouched) must
    // have pulled below the 70 it started at — i.e. it is averaging in A's 8.
    await expect
      .poll(
        async () => {
          const txt = (await b.locator(".energy-hud").textContent()) ?? "";
          const m = txt.match(/avg\s+(\d+)/);
          return m ? Number(m[1]) : NaN;
        },
        { timeout: 15_000 },
      )
      .toBeLessThan(50);
  } finally {
    await cleanup();
  }
});

/**
 * Second advertised signal: the facilitator "suggest break" overlay is a single
 * key in a shared Y.Map; toggling it must light up every other phone.
 */
test("facilitator break suggestion broadcasts to the other peer", async ({ browser, baseURL }) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    await connect(a);
    await connect(b);

    // Peer B must NOT show the overlay before A broadcasts.
    await expect(b.locator(".energy-callout-break")).toHaveCount(0);

    // Peer A becomes facilitator and suggests a break.
    await a.getByRole("checkbox", { name: /facilitator/i }).check();
    await a.getByRole("button", { name: /suggest break/i }).click();

    // Peer B (never a facilitator, never clicked) must see the overlay.
    await expect(b.locator(".energy-callout-break")).toBeVisible({ timeout: 15_000 });
    await expect(b.locator(".energy-callout-break")).toHaveText(/suggest a break/i);

    // Clearing on A must also clear on B.
    await a.getByRole("button", { name: /clear break suggestion/i }).click();
    await expect(b.locator(".energy-callout-break")).toHaveCount(0, { timeout: 15_000 });
  } finally {
    await cleanup();
  }
});
