# Primanota Cassa

PWA installabile (login + invio file a Primanota di cassa).

## File

- `index.html` — schermata di login (chiama `bgla_chkpwd_ai_ws`) e, dopo l'accesso, la schermata di invio file (chiama `bapp_cassa_ws`, con `p_usercassa` = `nrute` restituito dal login).
- `manifest.json` — manifest PWA.
- `sw.js` — service worker (cache della sola shell statica; le chiamate ai web service vanno sempre in rete).
- `gla_logo_color.jpg` — logo usato come icona per la schermata Home e nell'header dell'app.

## Pubblicazione su GitHub Pages

1. Crea un repository su GitHub e carica questi file nella root (o in `/docs`).
2. Impostazioni repo → **Pages** → Source: branch `main`, cartella `/ (root)` (o `/docs`) → Save.
3. Dopo un paio di minuti la app è online su `https://<utente>.github.io/<repo>/`.
4. Apri quell'URL da telefono (Chrome su Android, Safari su iPhone) e usa "Aggiungi a schermata Home" / "Installa app" (istruzioni anche dentro l'app, in fondo alla pagina).

GitHub Pages serve tutto in HTTPS, requisito necessario per registrare il service worker e rendere l'app installabile.

## Nota su CORS

Le chiamate a `www.lucchi.com:448` partono dal browser dell'utente verso un altro dominio. Se il server non risponde con gli header CORS (`Access-Control-Allow-Origin`) per l'origine di GitHub Pages, il browser blocca la risposta. Se succede, va abilitato il CORS sul servlet lato server (non è qualcosa che si possa risolvere solo dal lato client).
