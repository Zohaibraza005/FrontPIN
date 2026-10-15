# HR Pro Bridge

Office ke LAN par Hikvision attendance machines hain, jin tak live (cPanel) server directly nahi pahunch sakta. Ye chhota program office ke kisi bhi PC/Mac par chalta hai: machines se punches leta hai aur HTTPS ke zariye live server ko bhej deta hai.

```
Hikvision machines (192.168.88.x) ──► HR Pro Bridge (office PC) ──HTTPS──► backend.attendance.frontforcecrm.com
```

- Machines ki list (IP, username, password) live server se khud aati hai, jo app ke Devices page par set hoti hai.
- Har 1 minute par har machine se pichle 2 ghante ke punches uthata hai. Jo punch pehle bheja ja chuka ho, wo dobara nahi jata.
- Agar machine ka firmware `alertStream` support karta hai to punch usi waqt bhi bhej deta hai.
- Internet band ho to punches `queue.json` mein save rehte hain aur internet aate hi bhej diye jaate hain.

## Server side (ek dafa)

Backend ki `.env` mein ye 2 lines add karo:

```
DEVICE_MODE=bridge
BRIDGE_TOKEN=<lamba random secret>
```

`DEVICE_MODE=bridge` ka matlab hai ki live server khud machines se connect karne ki koshish nahi karega.

## Windows

1. `HRProBridge-win-x64.exe` ko kisi permanent folder mein rakho, jaise `C:\HRProBridge\`.
2. Double-click karo, phir Backend URL aur Bridge token daalo. Ye `config.json` mein save ho jayenge.
3. Har login par background mein khud chale, iske liye Command Prompt mein ye chalao:
   ```
   C:\HRProBridge\HRProBridge-win-x64.exe --install
   ```

## macOS

Intel Mac par `HRProBridge-macos-intel` use karo, M1/M2/M3 par `HRProBridge-macos-apple-silicon`.

```bash
mkdir -p ~/HRProBridge && mv HRProBridge-macos-* ~/HRProBridge/ && cd ~/HRProBridge
chmod +x HRProBridge-macos-*
xattr -dr com.apple.quarantine HRProBridge-macos-*
codesign --sign - HRProBridge-macos-apple-silicon   # sirf Apple Silicon par zaroori
./HRProBridge-macos-apple-silicon                   # pehli dafa: URL + token setup
./HRProBridge-macos-apple-silicon --install         # background + har login par start
```

## Commands

| Command | Kaam |
|---|---|
| *(kuch nahi)* | Bridge chalao |
| `--setup` | URL/token dobara set karo |
| `--install` / `--uninstall` | Login par autostart on/off |
| `--version` | Version dikhao |

**Status:** browser mein http://127.0.0.1:47811 kholo. Wahan har machine ka haal, pending punches aur aakhri error dikhega.
**Logs:** exe ke saath wala `bridge.log` dekho.

Ek computer par ek hi bridge chalta hai. Dusri dafa chalane par ye bata dega ki pehle se chal raha hai.

## Build

```bash
npm install
npm run build      # dist/ mein .exe aur dono macOS binaries ban jayengi
```
