# Language Trainer

Веб-тренажер для вправ з мовних курсів (`english`, `spanish`, `russian`) з покроковими етапами, збереженням прогресу та темами оформлення.

## Швидкий старт

1. Відкрийте проєкт через локальний веб-сервер (наприклад Live Server у VS Code).
2. Запускайте через:
   - `root/index.html` — єдиний повнофункціональний вхід (список вправ, налаштування, вкладки).
   - `english/index.html`, `spanish/index.html`, `russian/index.html` — входи за курсом: редірект на `root` з `?course=english|spanish|russian`.
   - `index.html` у корені репо — редірект на `root/index.html` (збереження параметрів у рядку запиту).
3. Оберіть курс/тему і проходьте вправи.

## Структура

- `root/` — основний UI (сторінки home/main/settings/exercises).
- `shared/js/app.js` — спільний рушій: завантаження вправ, стани етапів, прогрес, модалки.
- `english/`, `spanish/`, `russian/`:
  - `js/course_config.js` — тексти UI, TTS, підписи кнопок.
  - `exercises/exN.js` + `manifest.json` — контент вправ.
- `backups/` — бекапи за політикою проєкту.

## Як додаються вправи

1. Додайте новий файл `exN.js` у потрібний курс.
2. Оновіть `manifest.json` цього курсу.
3. Файл вправи має виставляти `window.exerciseData` (title, explanation, vocab, sentences).

## Примітки

- Прогрес зберігається в `localStorage` окремо по курсу.
- Для деяких дій потрібен саме запуск через сервер, не `file://`.

Детальний технічний опис: `TECHNICAL_REPORT.md`.