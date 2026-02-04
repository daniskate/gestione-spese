# 🔔 NOTIFICHE PUSH - Guida Rapida

## 📬 Cosa Fa

Quando una persona aggiunge una spesa, l'altra riceve una **notifica push** sul telefono!

```
TELEFONO 1                         TELEFONO 2
Aggiunge €50 spesa    ──────────>  🔔 VIBRA!
                                   💰 Nuova Spesa
                                   Persona 1: €50.00
                                   Spesa supermercato
```

## 🚀 Setup (3 Minuti!)

### 1. Avvia l'App
- Windows: doppio click su `AVVIA.bat`
- Mac/Linux: `./avvia.sh`

### 2. Crea/Unisciti Gruppo
1. Passa a modalità **"👥 Condivisa"**
2. **Crea gruppo** o **unisciti con link**
3. Dopo 2 secondi apparirà: "Vuoi ricevere notifiche?"
4. Clicca **OK** / **Consenti**

### 3. FATTO! ✅
Le notifiche sono attive!

## 📱 Test Veloce

### Su 2 Telefoni:
1. **Telefono 1**: Crea gruppo
2. **Telefono 2**: Apri link condiviso
3. **Entrambi**: Accetta notifiche
4. **Telefono 1**: Aggiungi una spesa
5. **Telefono 2**: Ricevi notifica! 🎉

### Su 1 Computer (2 tab):
1. **Tab 1**: Crea gruppo
2. **Tab 2**: Apri link in nuova tab
3. **Entrambe**: Accetta notifiche
4. **Tab 1**: Aggiungi spesa
5. **Tab 2**: Vedi notifica desktop!

## ⚙️ Personalizzazioni

### Cambia Vibrazione
In `app.js`, cerca:
```javascript
vibrate: [200, 100, 200]
```
Cambia i numeri (millisecondi): vibra-pausa-vibra

### Disabilita Notifiche
Tab **"⚙️ Altro"** → Impostazioni Browser → Blocca notifiche

## 🐛 Problemi?

### "Non ricevo notifiche"
✅ Hai cliccato "Consenti" quando richiesto?
✅ Entrambi i dispositivi sono nello stesso gruppo?
✅ Firebase è configurato? (dovrebbe funzionare già)

### "Permesso negato"
1. Vai nelle impostazioni del browser
2. Cerca il sito dell'app
3. Permessi → Notifiche → **Consenti**
4. Ricarica l'app

### "Notifiche solo quando app aperta"
- **iOS**: Normale (limitazione Apple)
- **Android**: Funzionano anche in background

## 💡 Tips

✅ **Installa come PWA** per notifiche migliori
✅ **Mantieni app in background** (Android)
✅ Le notifiche hanno **vibrazione** integrata

## ✨ Come Funziona

1. Persona A aggiunge spesa
2. App invia dati a Firebase
3. Firebase notifica altri dispositivi del gruppo
4. Persona B riceve notifica + vibrazione

**Tutto automatico e in tempo reale!** ⚡

---

**Durata setup**: ~3 minuti  
**Difficoltà**: ⭐☆☆☆☆ (Facilissimo)
