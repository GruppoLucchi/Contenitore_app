# Primanota Cassa

PWA installabile e multi-cliente. Dopo il login mostra un menu con le
applicazioni disponibili per l'utente (Scontrini, Riscossione con file Excel,
Riscossione con estrazione dati). Tutte le chiamate ai dati passano dai web
service Wigest su `www.lucchi.com:448`.

## File

- `index.html` — tutta l'applicazione: login, menu e le tre app.
- `config.json` — configurazione multi-cliente (clienti, url dei web service, istanze).
- `manifest.json` — manifest PWA.
- `sw.js` — service worker (cache della sola shell statica; le chiamate ai web service vanno sempre in rete).
- `gla_logo_color.jpg` — logo usato come icona della schermata Home.

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
  (Conto/Cliente/Ragione sociale) con ricerca testuale e vocale. Scelto un
  cliente, **`bapp_risc_ws`** (`…/servlet/bapp_risc_ws`) restituisce un JSON:
  se `okexp` = `N` mostra `messaggio`; se `okexp` = `Y` trasforma `dati` (array
  o Excel base64) e prosegue nello stesso flusso di RISCEXCEL. La "Partita" è
  data da `Anno\Prefisso\No`.

Nota: le query (`SQLDataProviderServer/...`) portano l'istanza nel namespace e
nel percorso; i web service (`bgla_chkpwd_ai_ws`, `bapp_cassa_ws`,
`bapp_risc_ws`) usano il namespace generico e instradano tramite `m_Instance`.
Gli `url` nel `config.json` contengono solo il percorso del servlet: il nome del
web service viene aggiunto dall'app.

## Pubblicazione su GitHub Pages

1. Carica questi file nella root del repository (`gruppolucchi.github.io/Contenitore_app/`).
2. Impostazioni repo → **Pages** → Source: branch `main`, cartella `/ (root)` → Save.
3. Dopo un paio di minuti l'app è online in HTTPS (requisito per service worker e installazione).
4. Da telefono usa "Aggiungi a schermata Home" / "Installa app".

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
