# Poker Bank

Mała, responsywna aplikacja do prowadzenia wpłat i rozliczenia domowej gry w pokera. Wszystkie dane bieżącej sesji są przechowywane lokalnie w przeglądarce — aplikacja nie używa kont, serwera ani synchronizacji między urządzeniami.

## Uruchomienie lokalne

Wymagany Node.js 22.12 lub nowszy (zalecany Node.js 24 LTS).

```bash
npm install
npm run dev
npm run test
npm run build
```

## Profile graczy i zdjęcia

Profile stałych graczy są utrzymywane w `src/data/players.ts`. Można też wpisać imię osoby spoza tej listy zarówno przy wyborze uczestników, jak i w trakcie gry. Profile dodatkowe są zapisane wyłącznie w bieżącej sesji i mają avatar z inicjałem. Zdjęcia stałych graczy WebP umieszczaj w `public/avatars/`; brakujący plik automatycznie wyświetli avatar zastępczy. Statyczna lista może być dłuższa niż 10 osób, ale w grze może uczestniczyć maksymalnie 10.

Wartość wkupienia, limit uczestników i krok zwrotu edytuje się w `src/config/game.ts`. Stawka jest kopiowana do nowej sesji i nie zmienia się w trwającej grze.

## Publikacja na GitHub Pages

### Pierwsza publikacja

1. Zaloguj się na GitHub i wybierz **New repository**. Wpisz nazwę, np. `pokerwymiatacze`, wybierz **Public** i utwórz puste repozytorium, bez README, licencji i `.gitignore`.
2. Otwórz terminal w katalogu projektu. Zainicjalizuj Git i podłącz repozytorium, zastępując `TWOJ_LOGIN` swoim loginem:

   ```bash
   git init -b main
   git remote add origin https://github.com/TWOJ_LOGIN/pokerwymiatacze.git
   ```

   Jeśli Git poprosi o dane autora, ustaw je lokalnie poleceniami `git config user.name "Twoja nazwa"` i `git config user.email "Twoj adres lub adres noreply z GitHub"`. Podczas wysyłania zmian zaakceptuj logowanie do GitHuba w przeglądarce; nie wpisuj tokenów do plików projektu.

3. Zainstaluj zależności i wyślij projekt:

   ```bash
   npm install
   npm run deploy -- "Pierwsza publikacja Poker Bank"
   ```

   W PowerShell, jeśli polityka blokuje `npm.ps1`, używaj `npm.cmd` zamiast `npm`.

4. W repozytorium na GitHub otwórz **Settings → Pages → Build and deployment → Source** i wybierz **GitHub Actions**.
5. Otwórz **Actions → Deploy to GitHub Pages → Run workflow**, wybierz `main` i uruchom workflow. Pierwsze automatyczne uruchomienie mogło zakończyć się błędem przed włączeniem Pages — uruchomienie ręczne po kroku 4 rozwiązuje ten przypadek.
6. Poczekaj na zielony status zadań `build` i `deploy`. Adres strony będzie w **Settings → Pages** i przy zadaniu publikacji; standardowo jest to `https://TWOJ_LOGIN.github.io/pokerwymiatacze/`.

Repozytorium i pliki w `public/avatars/` będą publiczne. Wysyłaj wyłącznie zdjęcia, które możesz publicznie udostępnić. Sesje z `localStorage` nie są przesyłane do repozytorium.

### Kolejne publikacje jedną komendą

```bash
npm run deploy -- "Opis zmian"
```

Można pominąć opis: `npm run deploy`. Skrypt `scripts/deploy.mjs` wymaga podłączonego `origin` i gałęzi `main`, uruchamia testy oraz build, dodaje pliki projektu, tworzy commit i wykonuje push. Workflow `.github/workflows/deploy.yml` ponownie sprawdza projekt i publikuje go automatycznie po nowym pushu na `main`. Skrypt nie czeka na zakończenie publikacji — jej wynik sprawdź w zakładce **Actions**.

Skrypt pomija katalogi IDE, `node_modules` i `dist`. Odmawia działania, jeśli przed uruchomieniem są już przygotowane pliki w staging area. Nie wykonuje force-pusha i nie cofa zmian przy błędzie; jeśli push zostanie odrzucony, sprawdź komunikat Gita i uzgodnij lokalną gałąź ze zdalną przed ponownym uruchomieniem. Bez nowego commita push nie uruchamia kolejnego deploymentu; wtedy użyj **Run workflow**.

Vite automatycznie pobiera nazwę repozytorium ze zmiennej `GITHUB_REPOSITORY` w Actions i dobiera ścieżkę bazową. Repozytorium `TWOJ_LOGIN.github.io` jest obsługiwane ze ścieżką `/`. Własna domena wymaga osobnego dostosowania konfiguracji.

## Dane i bezpieczeństwo zapisu

Sesja jest zapisywana pod kluczem `poker-bank-session-v1` w `localStorage` przeglądarki. Pozostaje dostępna po odświeżeniu na tym samym urządzeniu i w tej samej przeglądarce. Uszkodzony zapis nie jest automatycznie kasowany; aplikacja zgłasza problem i wymaga potwierdzenia przed jego zastąpieniem. Na ekranie końcowym można pobrać kopię sesji jako JSON.
