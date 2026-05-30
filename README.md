# BYODMCSE

Browser-based multi-channel audio renderer for live performances. Each participant's device plays part of the mix, controlled via WebMIDI (dev and local preview) or MQTT.

**Live:** [byod.live](https://byod.live)

## Development

```bash
npm install
cp .env.example .env   # set VITE_MQTT_BROKER_URL for your broker
npm dev
```

The dev server runs at [http://localhost:5173](http://localhost:5173).

Without a `.env` file, local dev falls back to `connection.broker.local` in the config (`ws://localhost:9001`).

## Routes

- `/` — SoundCheck: local testing with on-screen keyboard and track controls
- `/rooms/:roomId` — audience view for a live session (subscribes to `byod/<roomId>` over MQTT)

## Configuration

There is no CMS yet. Configuration lives in JSON — by default the app loads `src/assets/config.json`. To use an external config, pass a URL-encoded link via the `config` query parameter:

```
http://localhost:5173/#/?config=<encoded-config-url>
```

Example:

```javascript
encodeURIComponent(
  "https://raw.githubusercontent.com/grantler-instruments/BYODMCSE/master/src/assets/config.json"
)
// → "https%3A%2F%2Fraw.githubusercontent.com%2Fthomasgeissl%2FBYODMCSE%2Fmaster%2Fsrc%2Fassets%2Fconfig.json"
```

```
http://localhost:5173/#/?config=https%3A%2F%2Fraw.githubusercontent.com%2Fthomasgeissl%2FBYODMCSE%2Fmaster%2Fsrc%2Fassets%2Fconfig.json
```

The config defines tracks, instruments, effects, sample files, and MIDI CC mappings.

### MQTT broker

Broker credentials are not stored in config JSON. Set them via environment variable:

| Variable | Description |
|---|---|
| `VITE_MQTT_BROKER_URL` | WebSocket URL, e.g. `ws://localhost:9001` or `wss://user:pass@host:443` |

Resolution order: `VITE_MQTT_BROKER_URL` → `connection.broker.local` (dev only) → `connection.broker` in config.

For production builds, add `VITE_MQTT_BROKER_URL` as a GitHub Actions secret so the deploy workflow can bake it in.

## MIDI over MQTT

To send MIDI from a DAW to browser clients:

1. Run an MQTT broker (local or hosted).
2. Start [ofMIDI2MQTT](https://github.com/thomasgeissl/ofMIDI2MQTT) pointed at your broker.
3. Route DAW output to the MIDI port configured in ofMIDI2MQTT.
4. Set `VITE_MQTT_BROKER_URL` and open a room at `/rooms/<roomId>`.
