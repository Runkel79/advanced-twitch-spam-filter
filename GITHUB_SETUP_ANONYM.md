# GitHub Repository Setup (Anonym)

## ✅ Anonymisierung abgeschlossen

Alle persönlichen Daten wurden entfernt:
- ✅ Git-Historie komplett neu erstellt (nur 1 anonymen Commit)
- ✅ Git-Konfiguration auf "Anonymous" gesetzt
- ✅ Keine persönlichen Daten in Dateien gefunden
- ✅ Remote-Verbindung entfernt

## Schritt 1: Altes Repository auf GitHub löschen

1. Gehe zu https://github.com/Runkel79/Twitch-Spam-Filter
2. Gehe zu **Settings** (Einstellungen)
3. Scrolle ganz nach unten zu **"Danger Zone"**
4. Klicke auf **"Delete this repository"**
5. Gib den Repository-Namen zur Bestätigung ein
6. Klicke auf **"I understand the consequences, delete this repository"**

## Schritt 2: Neues Repository auf GitHub erstellen

1. Gehe zu [GitHub.com](https://github.com) und melde dich an
2. Klicke auf das **"+"** Symbol oben rechts → **"New repository"**
3. **Repository-Name**: z.B. `twitch-spam-filter` (oder einen anderen Namen)
4. **Beschreibung** (optional): "Advanced spam filter for Twitch chats"
5. Wähle **Public** oder **Private**
6. **WICHTIG**: Lass alle Optionen deaktiviert:
   - ❌ Add a README file
   - ❌ Add .gitignore
   - ❌ Choose a license
7. Klicke auf **"Create repository"**

## Schritt 3: Neues Repository mit GitHub verbinden

Nachdem du das neue Repository erstellt hast, führe diese Befehle aus:

```powershell
# Ersetze USERNAME mit deinem GitHub-Benutzernamen
# Ersetze REPOSITORY-NAME mit dem Namen deines neuen Repositories
git remote add origin https://github.com/USERNAME/REPOSITORY-NAME.git
git push -u origin main
```

**Beispiel:**
```powershell
git remote add origin https://github.com/DEIN-USERNAME/twitch-spam-filter.git
git push -u origin main
```

## Schritt 4: Authentifizierung

Beim ersten `git push` wirst du nach deinen GitHub-Anmeldedaten gefragt:
- **Benutzername**: Dein GitHub-Benutzername
- **Passwort**: Verwende ein **Personal Access Token** (nicht dein GitHub-Passwort!)

### Personal Access Token erstellen:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token (classic)"
3. Name: z.B. "Twitch Spam Filter"
4. Berechtigungen: Mindestens `repo` aktivieren
5. Token generieren und **sofort kopieren** (wird nur einmal angezeigt!)
6. Verwende diesen Token als Passwort beim `git push`

## ✅ Fertig!

Dein Repository ist jetzt komplett anonym auf GitHub:
- Alle Commits zeigen "Anonymous" als Autor
- Keine persönlichen Daten in der Historie
- Saubere, anonyme Git-Historie

## Für zukünftige Updates

```powershell
git add .
git commit -m "Beschreibung der Änderungen"
git push
```

**Wichtig**: Die Git-Konfiguration ist bereits auf anonym gesetzt, alle zukünftigen Commits werden automatisch anonym sein.

