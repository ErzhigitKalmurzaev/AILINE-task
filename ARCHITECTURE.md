# Architecture Overview

## Throttling & Buffering

- Incoming WebSocket messages are decoded using `src/utils/BinaryDecoder.js` (required). The `OrderBookSocket` service collects decoded updates into an in-memory buffer.
- A flusher runs at a fixed interval of 100ms (10 FPS) and emits a single combined batch to the UI consumers. This guarantees the DOM updates at most 10 times per second and prevents UI freezes under hundreds of messages/sec.

Why this approach:
- Fixed-interval flushing simplifies reasoning and provides consistent UI update cadence. It also decouples raw socket throughput from render frequency.
- Buffering minimizes allocation churn by batching many small updates into one processed payload.

## Data Flow Separation

- `OrderBookSocket` (src/services/socket.ts): Responsible for connection, decoding via `BinaryDecoder`, buffering, and emitting batched raw updates.
- `groupOrders` (src/utils/grouping.ts): Stateless processing utility that aggregates price levels according to a tick size.
- `OrderBook` (src/components/OrderBook.tsx): Presentation layer that subscribes to the socket, requests grouping, and renders UI.

This separation keeps heavy decoding and ingestion logic out of React rendering, and the grouping/aggregation step is a pure function suitable for offloading to a Web Worker if needed.

## Performance Considerations

- Throttling to 10 FPS prevents layout thrashing and keeps React re-renders bounded.
- Memoization and controlled state writes ensure only processed snapshots update React state.
- Grouping is pure and fast; for even higher loads it can be migrated to a Web Worker.

## Extensibility

- Web Worker: move `groupOrders` into a worker and postMessage batches from `OrderBookSocket`.
- Canvas overlay: depth histograms can be drawn once per flush on a single canvas behind the lists.
- Drift detection: `OrderBookSocket` exposes sequence numbers (`U`/`E`) and can detect gaps; UI can surface alerts.
