// A version-proof heatmap overlay for Google Maps. The built-in
// `visualization.HeatmapLayer` was removed in Maps JS v3.65, so we draw our own
// density overlay on a <canvas> via OverlayView: each point is an additive
// radial blob in the layer's hue, so overlapping records build up into "hot"
// areas. One hue per entity keeps stacked layers readable.
//
// `google.maps` only exists at runtime, so the OverlayView subclass is created
// lazily inside this factory (it can't extend the namespace at module load).

/* eslint-disable @typescript-eslint/no-explicit-any */

export type HeatPoint = { lat: number; lng: number };

/** Build a heatmap OverlayView instance. Toggle it with `.setMap(map | null)`. */
export function createHeatmapOverlay(
  maps: any,
  points: HeatPoint[],
  rgb: string,
  radius = 30,
): any {
  class HeatmapOverlay extends maps.OverlayView {
    private canvas: HTMLCanvasElement | null = null;

    onAdd() {
      const canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.pointerEvents = "none";
      this.canvas = canvas;
      this.getPanes().overlayLayer.appendChild(canvas);
    }

    onRemove() {
      this.canvas?.parentNode?.removeChild(this.canvas);
      this.canvas = null;
    }

    draw() {
      const proj = this.getProjection();
      const canvas = this.canvas;
      const map = this.getMap();
      if (!proj || !canvas || !map) return;
      const bounds = map.getBounds();
      if (!bounds) return;

      // Size the canvas to the visible viewport (plus a blob-radius margin so
      // points just off-screen still bleed in), positioned in div-pixel space.
      const sw = proj.fromLatLngToDivPixel(bounds.getSouthWest());
      const ne = proj.fromLatLngToDivPixel(bounds.getNorthEast());
      const left = Math.min(sw.x, ne.x) - radius;
      const top = Math.min(sw.y, ne.y) - radius;
      const width = Math.max(1, Math.round(Math.abs(ne.x - sw.x) + radius * 2));
      const height = Math.max(1, Math.round(Math.abs(sw.y - ne.y) + radius * 2));

      canvas.style.left = `${left}px`;
      canvas.style.top = `${top}px`;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter"; // additive → density builds up

      for (const p of points) {
        const px = proj.fromLatLngToDivPixel(new maps.LatLng(p.lat, p.lng));
        const x = px.x - left;
        const y = px.y - top;
        if (x < -radius || y < -radius || x > width + radius || y > height + radius) {
          continue;
        }
        const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
        grad.addColorStop(0, `rgba(${rgb},0.55)`);
        grad.addColorStop(1, `rgba(${rgb},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  return new HeatmapOverlay();
}
