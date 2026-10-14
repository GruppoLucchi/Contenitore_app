# APP Gruppo Lucchi

PWA installabile e multi-cliente. Dopo il login mostra un menu con le
applicazioni disponibili per l'utente (Scontrini, Riscossione con file Excel,
Riscossione con estrazione dati, Aggiornamento clienti/fornitori). Tutte le
chiamate ai dati passano dai web service Wigest su `www.lucchi.com:448`.

## File

- `index.html` — tutta l'applicazione: login, menu e le quattro app.
- `config.json` — configurazione multi-cliente (clienti, url dei web service, istanze).
- `manifest.json` — manifest PWA (nome, colori, icone).
- `sw.js` — service worker (cache della sola shell statica; le chiamate ai web service vanno sempre in rete).
- `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png` —
  icone PNG dell'app installata (monogramma "C" ottone su fondo scuro), nella root
  come il logo. Sono dichiarate nel `manifest.json` e **necessarie** per poter
  installare l'app su Android.
- `gla_logo_color.jpg` — logo usato come favicon e `apple-touch-icon` (iPhone).
  Non è usato nel manifest: è piccolo (181×106 px) e in JPEG.

## Configurazione multi-cliente (`config.json`)

Il file contiene un elenco di **profili**. Ogni profilo ha un `id` numerico, un
`nome` e una o più **aziende** (ognuna con `url` del servlet e `istanze`
selezionabili). Un profilo può anche referenziare altri profili con
`aziende_ref` (per raggruppare più clienti senza duplicare i dati).

```json
{
  "profili": [
    { "id": 1, "nome": "WIGEST Amici di GIGI",
      "aziende": [ { "nome": "…", "url": "https://www.lucchi.com:448/wigest617/servlet/", "istanze": ["SERVLET_WIGEST_AMICIGIGI_1105"] } ] },
    { "id": 4, "nome": "Multicliente", "aziende_ref": [1, 2] }
  ]
}
```

Il cliente si sceglie con il parametro `?cfg=<id>` nell'URL (es.
`…/Contenitore_app/?cfg=1`). Il valore viene memorizzato in `localStorage`, così
l'app installata riapre sempre lo stesso cliente. Aprendo l'URL **senza** `cfg`
e senza un valore salvato, vengono proposti tutti i clienti reali.

Nella maschera di login compaiono, solo se servono, le combo **Cliente** (se il
profilo ha più aziende) e **Istanza** (se l'azienda ha più istanze).

## Flusso di login

Al submit vengono chiamati in sequenza due servizi:

1. **Query `start_login_companies_user_app`** — `POST` su
   `…/servlet/SQLDataProviderServer/start_login_companies_user_app`
   (namespace con l'istanza: `http://start_login_companies_user_app.<istanza>.ws.localhost/`).
   Riceve utente e istanza; restituisce una o più aziende. Se ne restituisce
   più di una, compare la combo **Azienda**. Da questa risposta si ricavano i
   parametri usati da tutte le chiamate successive: `m_Company` (`CODAZI`),
   `p_Site`/`p_PhiSite` (`P801CODE`), `p_Subs` (`P801S`), `p_Sect` (`P801E`),
   `p_Branc` (`P801B`), `p_Curr` (`EUR`).
2. **`bgla_chkpwd_ai_ws`** — `POST` su `…/servlet/bgla_chkpwd_ai_ws`. Autentica
   con istanza, utente e password (più i valori del punto 1). La risposta JSON
   contiene `pwdok`, `nrute` (codice utente, usato come `p_user`/`p_usercassa`)
   e `listapp` (app abilitate per l'utente).

## Applicazioni

- **Scontrini** — carica un file/foto e lo invia a `bapp_cassa_ws`.
- **Riscossione con file Excel (RISCEXCEL)** — importa il tracciato Excel del
  partitario, mostra clienti e fatture, permette di marcare gli incassi ed
  esporta un report Excel (`report_incassi_<codice cliente>_<data-ora>.xlsx`).
- **Riscossione con estrazione dati (RISCTABELLE)** — chiama la query
  `qapp_risc_ws` (`…/servlet/SQLDataProviderServer/qapp_risc_ws`, namespace
  `http://qapp_risc_ws.<istanza>.ws.localhost/`) e mostra l'elenco clienti
  (Conto/Cliente/Ragione sociale) con ricerca testuale e vocale (microfono).
  Scelto un cliente, **`bapp_risc_ws`** (`…/servlet/bapp_risc_ws`) restituisce un
  JSON: se `okexp` = `N` mostra `messaggio`; se `okexp` = `Y` trasforma `dati`
  (array o Excel base64) e prosegue nello stesso flusso di RISCEXCEL. La
  "Partita" è data da `Anno\Prefisso\No`.
- **Aggiornamento clienti/fornitori (CLIFORUPDATE)** — tre sotto-schermate:
  elenco, maschera anagrafica, conferma.

  1. *Elenco*: chiama la query `qapp_cli_ws`
     (`…/servlet/SQLDataProviderServer/qapp_cli_ws`, namespace
     `http://qapp_cli_ws.<istanza>.ws.localhost/`) e mostra Cliente (`A19CLIEN`) e
     Ragione sociale (`G19DESC`) — senza la colonna Conto — con ricerca testuale e
     vocale. Sotto il pulsante **Estrai anagrafica** ci sono due bottoni di
     diagnostica (**Chiamata (E)** / **Risposta (E)**) che mostrano l'envelope e la
     risposta dell'estrazione.

  2. *Estrazione*: **Estrai anagrafica** chiama **`bapp_cli_ws`**
     (`…/servlet/bapp_cli_ws`, web service, namespace generico
     `http://bapp_cli_ws.ws.localhost/`, operazione `bapp_cli_ws_Run`) con
     `p_tipo=E` e `p_cliente` = cliente scelto (gli altri `p_*` di campo vuoti; i
     valori di contesto — `m_Company`, `m_Instance`, `p_user`, `p_Subs`, `p_Branc`,
     `p_Sect`, `p_Curr`, `p_PhiSite` — dal login). La risposta è un JSON con
     `okexp`, `messaggio` e `dati` (array): se `okexp=N` mostra `messaggio`; se
     `okexp=Y` i campi sono in **`dati[0]`** e popolano la maschera. I valori
     arrivano riempiti di spazi a lunghezza fissa e vengono ripuliti (trim).

  3. *Maschera anagrafica* — campi (nome JSON = etichetta):
     - `Cli-For` → Codice cliente — **sola lettura**
     - `Ragione Sociale` → Ragione Sociale — **sola lettura**
     - `Indirizzo` → Indirizzo — modificabile
     - `Città` → Città — modificabile
     - `Provincia` → Provincia — modificabile
     - `Mail` → Mail — modificabile
     - `Autorizzazione Spedizione Fatture via Email` → check-box (`Y`/`N`)
     - `Cellulare` → Cellulare — modificabile
     - `Autorizzazione invio con Whatsapp` → check-box (`Y`/`N`)
     - `PEC Comunicazioni ordinarie` → PEC Comunicazioni ordinarie — modificabile
       **solo se arriva vuota** dal JSON, altrimenti sola lettura
     - `Autorizzazione Spedizione PEC` → check-box (`Y`/`N`)

  4. *Aggiornamento*: **Aggiorna anagrafica** richiama `bapp_cli_ws` con
     `p_tipo=U` e i valori del form, con questa mappatura:
     `p_cliente`=Cli-For, `p_cellu`=Cellulare, `p_aucell1`=Autorizzazione Whatsapp,
     `p_ladd1`=Indirizzo, `p_lemai`=Mail, `p_autsp`=Autorizzazione Spedizione
     Fatture via Email, `p_lcitt`=Città, `p_lprov`=Provincia,
     `p_l2pec`=PEC Comunicazioni ordinarie, `p_aupec`=Autorizzazione Spedizione PEC.
     Con `okexp=Y` compare il bottone "Anagrafica correttamente aggiornata" che
     torna all'elenco; con `okexp=N` mostra `messaggio`. **Torna all'elenco**
     riporta alla lista senza aggiornare.

  5. *Firma e PDF del consenso*:
     - **Quando compare la firma**: nella maschera, sotto i campi, appare il
       riquadro "Firma per le autorizzazioni modificate" quando l'utente
       **modifica una spunta** rispetto a quanto estratto, sia aggiungendo sia
       togliendo l'autorizzazione. Le spunte considerate sono *Autorizzazione
       Spedizione Fatture via Email*, *Autorizzazione invio con Whatsapp* e
       *Autorizzazione Spedizione PEC*. Se l'utente rimette la spunta com'era, il
       riquadro scompare e la firma viene cancellata.
     - **Firma**: `<canvas>` su cui si scrive col dito/penna (Pointer Events,
       risoluzione adattata al pixel ratio del dispositivo). Pulsante *Cancella
       firma*. Viene esportata come PNG con sfondo trasparente, in base64 senza
       prefisso `data:`. Se il riquadro è visibile e vuoto, **Aggiorna
       anagrafica** non procede e chiede di firmare.
     - **Invio**: nessun web service aggiuntivo. La firma viaggia nella stessa
       chiamata `bapp_cli_ws`, nel parametro **`firmacli`** (nome nella costante
       `CLI_FIRMA_PARAM` di `index.html`), inserito dopo `p_aupec`. Il parametro è
       presente in ogni chiamata, come gli altri `p_*`: vuoto in estrazione
       (`p_tipo=E`) e in aggiornamento senza firma, valorizzato in aggiornamento
       (`p_tipo=U`) quando una spunta è stata modificata. Il contenuto è il PNG
       della firma in base64, senza prefisso `data:`, con sfondo trasparente e
       tratto nero. Lato Wigest il parametro è di tipo **memo**; va decodificato
       da base64 in byte per ottenere l'immagine da inserire nel PDF.
     - **PDF di ritorno**: Wigest crea il PDF con la firma. Se la risposta di
       `bapp_cli_ws` (U) contiene il PDF in base64 in `dati` (stringa, oppure
       `dati.pdf`) viene rilevato dal contenuto (un PDF in base64 inizia con
       `JVBER`) e reso disponibile. Se non c'è, non cambia nulla: resta il
       bottone "Anagrafica correttamente aggiornata". **Da confermare** con
       Wigest il punto esatto della risposta in cui arriva il PDF.
     - **Dopo l'aggiornamento**, se il PDF è arrivato, la schermata di conferma
       offre: **Apri mail con il PDF** (scarica il PDF e apre `mailto:` con
       destinatario = campo *Mail* dell'anagrafica; l'allegato lo aggiunge
       l'utente, come "Apri mail" di RISCEXCEL), **Condividi PDF** (Web Share API
       con il file allegato, mostrato solo se il dispositivo lo supporta) e
       **Scarica PDF**. Nome file: `consenso_<Cli-For>_<data-ora>.pdf`.

Gli importi di RISCEXCEL e RISCTABELLE sono formattati con separatore delle
migliaia (`.`) e decimali (`,`), indipendentemente dal locale del dispositivo.

Nota: le query (`SQLDataProviderServer/...`) portano l'istanza nel namespace e
nel percorso; i web service (`bgla_chkpwd_ai_ws`, `bapp_cassa_ws`,
`bapp_risc_ws`, `bapp_cli_ws`) usano il namespace generico e instradano
tramite `m_Instance`. Gli `url` nel `config.json` contengono solo il percorso del
servlet: il nome del web service (o `SQLDataProviderServer/<query>`) viene
aggiunto dall'app.

## Pubblicazione su GitHub Pages

1. Carica questi file nella root del repository (`gruppolucchi.github.io/Contenitore_app/`).
2. Impostazioni repo → **Pages** → Source: branch `main`, cartella `/ (root)` → Save.
3. Dopo un paio di minuti l'app è online in HTTPS (requisito per service worker e installazione).
4. Da telefono usa "Aggiungi a schermata Home" / "Installa app".

## Installazione su telefono e diagnostica

Su Android, Chrome propone "Installa app" solo se il sito è installabile:
HTTPS, `manifest.json` valido, service worker attivo e **icone PNG di almeno 192
e 512 px** dichiarate nel manifest, con la **dimensione reale uguale a quella
dichiarata** (un'icona dichiarata 192×192 ma di altre dimensioni viene rifiutata).
I quattro file `icon-*.png` vanno caricati nel repository nella root, insieme agli
altri file.

Per capire perché un telefono non installa l'app, aprire il sito da Chrome o Edge
sul computer: F12 → scheda **Application** → **Manifest**; in fondo la sezione
**Installability** elenca gli eventuali errori. Sul telefono, `chrome://webapks`
elenca le app installate da Chrome.

Il nome dell'app sul telefono è **APP Gruppo Lucchi**. Su Android viene da `name` e
`short_name` del `manifest.json`; su iPhone da `apple-mobile-web-app-title` in
`index.html` (con `<title>` come ripiego). Per cambiarlo vanno modificati tutti e
tre i punti. Un'app già installata non si rinomina da sola: su Android il nome si
aggiorna con l'aggiornamento periodico dell'app installata, su iPhone va rimossa e
aggiunta di nuovo alla Home.

## Aggiornamenti e cache (importante)

Il service worker mette in cache la shell (`index.html`, `config.json`, ecc.)
con strategia **network-first** per pagina e config, così le modifiche si vedono
alla riapertura. A ogni modifica dei file va **incrementata la `CACHE_VERSION`**
in `sw.js` (`primanota-cassa-vNN`): il cambio del nome cache attiva la nuova
versione, pulisce la vecchia e ricarica l'app da sola, senza reinstallare.

## Nota su CORS

Le chiamate a `www.lucchi.com:448` partono dal browser verso un altro dominio.
Il servlet deve rispondere con gli header CORS (`Access-Control-Allow-Origin`)
per l'origine di GitHub Pages, per i metodi `POST`/`OPTIONS`. La via più
semplice è mappare il `CorsFilter` su tutto il servlet
(`<url-pattern>/servlet/*</url-pattern>`), così copre login, cassa, le query e
`bapp_risc_ws`. Un errore "Failed to fetch" indica un problema di CORS o di
certificato/rete sulla porta 448; un errore HTTP 500 è invece un fault lato
server (servizio/istanza non pubblicati, o parametro non valido).
