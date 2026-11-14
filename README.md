# AETHER
Astronaut Evaluation, Tracking &amp; Health Emergency Response
Demo dashboard with a full-screen Emergency Mode (voice activation included). All data is illustrative, not medical information.

## Run

1. Install Node.js 18 or newer (LTS) from <https://nodejs.org>.
2. Extract the archive and open a terminal inside the `astra-dashboard` folder.
3. Run:

   ```bash
   npm install
   npm run dev
   ```

4. Open <http://localhost:5173> in Chrome or Edge. Stop with `Ctrl + C`.

Other commands: `npm run build` (type-check and production build), `npm test` (unit tests).

## Voice activation

- Works in Chrome and Edge, needs internet and microphone permission. If voice is unavailable, use the manual button.
- Say "AETHER, Emergency Situation." (the word "emergency" anywhere in speech activates it).

## Note

Emergency messages to crew and the Flight Surgeon are simulated. Nothing is ever sent.
