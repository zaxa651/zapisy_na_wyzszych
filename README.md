# Struktura README.md rojektu

1. System zarządzania kursami  
2. Opis projektu  
3. Sprint plan  
4. Autorzy  
5. Technologie  
6. Funkcjonalności  
7. Architektura projektu  
8. Instalacja  
9. Uruchomienie aplikacji  
10. Instrukcja użytkownika  
11. Struktura repozytorium  
12. API  
13. Zrzuty ekranu  
14. Status projektu  
15. Licencja  

---

## 1. System zarządzania kursami

Aplikacja mobilna do zarządzania ofertą edukacyjną, zapisami na kursy oraz administracją systemu.

---

## 2. Opis projektu

Aplikacja mobilna stworzona w Expo (React Native), której celem jest obsługa systemu edukacyjnego.

System umożliwia:
- przeglądanie i zarządzanie kursami
- zapis na zajęcia
- wybór prowadzących
- zarządzanie ofertą edukacyjną
- obsługę panelu administratora
- wyszukiwanie kursów z podpowiedziami

Aplikacja jest przeznaczona dla:
- studentów / użytkowników kursów
- wykładowców
- administratorów systemu

---

## 3. Sprint plan

| № Sprintu | Zadanie | Data |
|----------|--------|------|
| 1 | Architektura projektu + UI autoryzacji | 01.03.2026 |
| 2 | Baza danych + Supabase Auth | 15.03.2026 |
| 3 | Logika autoryzacji i rejestracji | 22.03.2026 |
| 4 | System kursów i zapisów | 31.03.2026 |
| 5 | Panel administratora + zarządzanie ofertą | 12.04.2026 |
| 6 | Wyszukiwarka + system sugestii | 14.04.2026 |
| 7 | Testowanie, refactoring i optymalizacja | 05.05.2026 |

---

## 4. Autorzy

Nikita Mut – backend developer  
Artem Plakhtiuk – frontend developer  
Oleksandr Pryt – fullstack support  

---

## 5. Technologie

Frontend:
- React Native
- Expo
- TypeScript / JavaScript

Backend / Baza danych:
- Supabase
- PostgreSQL

Inne:
- Expo Router
- REST API (Supabase)

---

## 6. Funkcjonalności

- logowanie i rejestracja (Supabase Auth)
- zarządzanie użytkownikami
- przegląd kursów
- zapisy na kursy (enrollment system)
- wybór wykładowcy i profil wykładowcy
- system wyboru dat i zajęć
- zarządzanie ofertą kursów (dodawanie/usuwanie)
- panel administratora (dashboard)
- wyszukiwarka z podpowiedziami (mechanizm autocomplete)
- testowanie i optymalizacja aplikacji

Checklist:
[+] autoryzacja
[+] baza danych
[+] system kursów
[+] panel admina
[+] wyszukiwarka
[-] finalne testy i optymalizacja

---

## 7. Architektura projektu

Aplikacja została zaprojektowana w architekturze klient–serwer. Klientem jest aplikacja mobilna (frontend), natomiast backend jest realizowany z wykorzystaniem platformy Supabase, która udostępnia gotowe API do komunikacji z bazą danych oraz obsługi autoryzacji.

Frontend komunikuje się z backendem za pomocą klienta Supabase, który korzysta z API (REST oraz mechanizmy wbudowane w SDK). Dzięki temu aplikacja może pobierać i zapisywać dane bez konieczności implementowania własnego backendu.

Struktura projektu odzwierciedla podział odpowiedzialności na warstwy:

- Warstwa prezentacji (UI i routing) znajduje się w folderach `app/` oraz `components/`  
Folder `app/` odpowiada za routing i ekrany aplikacji (np. logowanie, rejestracja, kursy, profil wykładowcy, panel administratora), natomiast `components/` zawiera komponenty wielokrotnego użytku.

- Warstwa dostępu do danych (services) została wydzielona w folderze `services/`  
Zawiera konfigurację klienta Supabase oraz funkcje odpowiedzialne za komunikację z backendem (np. pobieranie kursów, wykładowców, zapisy na kursy).

- Warstwa logiki biznesowej znajduje się w folderze `hooks/`  
Custom hooki zarządzają pobieraniem danych oraz logiką aplikacji (np. rejestracja użytkownika, dane wykładowców, panel administratora).

- Warstwa stanu aplikacji znajduje się w folderze `store/`  
Stan użytkownika jest zarządzany częściowo przez Supabase (autoryzacja) oraz przez hooki aplikacji.

Taka architektura pozwala na oddzielenie logiki aplikacji od warstwy prezentacji oraz ułatwia rozwój i utrzymanie projektu.

---

## 8. Instalacja

Pobrać Node.js ze strony internetowej - https://nodejs.org/en/download  

Utwórz folder na pulpicie lub w dowolnym wygodnym miejscu.  

W tym folderze, w pasku z jego ścieżką, wpisz CMD.  

W oknie CMD wpisz:

1. git clone -b refactor/global-ui-optimization --single-branch https://github.com/zaxa651/zapisy_na_wyzszych.git  
2. cd projekt  
3. npm install  

---

## 9. Uruchomienie aplikacji

Po tym, jak npm install zainstaluje wszystko, należy w tym samym oknie CMD wpisać:

npx expo start  

Następnie:
- skanuj QR kod w Expo Go  
- lub uruchom emulator Android/iOS  
- lub uruchom przeglądarkę i w pasku wyszukiwania wpisz  
  localhost:8081  

---

## 10. Instrukcja użytkownika

1. Uruchom aplikację  
2. Zaloguj się lub zarejestruj  
3. Przeglądaj dostępne kursy  
4. Zapisz się na kurs  
5. (admin) zarządzaj ofertą i użytkownikami  

---

## 11. Struktura repozytorium

Struktura aplikacji:

- folder `app/` – routing i ekrany  
app/_layout.tsx – główny layout aplikacji, kontrola autoryzacji i przekierowań  
app/(auth)/login.tsx – ekran logowania  
app/(auth)/register.tsx – ekran rejestracji  
app/(tabs)/_layout.tsx – nawigacja dolna (Tabs)  
app/(tabs)/index.tsx – ekran kursów  
app/(tabs)/lecturers/index.tsx – lista wykładowców  
app/(tabs)/lecturer/[id].tsx – profil wykładowcy (dynamiczny routing)  
app/courses/[id]/slots.tsx – ekran wyboru terminów kursu i zapisu  
app/admin/index.tsx – panel administratora  
app/pages/upload-avatar.tsx – ekran uploadu avatara użytkownika (placeholder, docelowo wybór i zapis zdjęcia)

- `components/` – komponenty UI  
components/LecturerCard.tsx – karta wykładowcy używana w wielu ekranach  

- `services/` – logika API i komunikacja z backendem  
src/supabase/supabaseClient.js – konfiguracja klienta Supabase  
src/supabase/services/courses.ts – operacje na kursach  
src/supabase/services/lecturers.ts – operacje na wykładowcach  

- `hooks/` – logika biznesowa aplikacji  
useCoursesData.ts  
useLecturersList.ts  
useLecturerProfile.ts  
useRegister.ts  
useAdminData.ts  

- `store/` – stan aplikacji  
globalny stan użytkownika – Supabase + hooki  

---

## 12. API

Aplikacja korzysta z API dostarczanego przez Supabase.

Wykorzystywane są:
- autoryzacja użytkownika (Supabase Auth)
- pobieranie wykładowców
- pobieranie kursów
- zapisy na kursy
- zarządzanie danymi (admin)

---

## 13. Zrzuty ekranu

- login
![Login](https://raw.githubusercontent.com/zaxa651/zapisy_na_wyzszych/refactor/global-ui-optimization/screenshots/login.png)
- register
![Register](https://raw.githubusercontent.com/zaxa651/zapisy_na_wyzszych/refactor/global-ui-optimization/screenshots/register.png)
- courses
![Courses](https://raw.githubusercontent.com/zaxa651/zapisy_na_wyzszych/refactor/global-ui-optimization/screenshots/courses.png)
- courses-proposals
![Proposals](https://raw.githubusercontent.com/zaxa651/zapisy_na_wyzszych/refactor/global-ui-optimization/screenshots/proposals.png)
- courses-chosetime
![Choose time](https://raw.githubusercontent.com/zaxa651/zapisy_na_wyzszych/refactor/global-ui-optimization/screenshots/chosetime.png)
- lecturers/index
![Lecturers](https://raw.githubusercontent.com/zaxa651/zapisy_na_wyzszych/refactor/global-ui-optimization/screenshots/lecturersindex.png)
- profile
![Profile](https://raw.githubusercontent.com/zaxa651/zapisy_na_wyzszych/refactor/global-ui-optimization/screenshots/profile.png)
- admin
![Admin](https://raw.githubusercontent.com/zaxa651/zapisy_na_wyzszych/refactor/global-ui-optimization/screenshots/admin.png)
- admin-manage
![Manage](https://raw.githubusercontent.com/zaxa651/zapisy_na_wyzszych/refactor/global-ui-optimization/screenshots/managecourses.png)

---

## 14. Status projektu

Projekt w trakcie rozwoju.

---

## 15. Licencja

Projekt edukacyjny wykonany w ramach zajęć.
