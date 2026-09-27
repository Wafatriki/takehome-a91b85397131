# AGENTS.md: el sincronizador de reservas

Este archivo es para ti y para tu agente de código (Claude Code, Codex, Cursor, Copilot o el que uses). Está pensado para que puedas dárselo tal cual y trabajar en equipo con él. **Usar IA y agentes es lo esperado en esta prueba**, no una trampa.

## Qué hay que construir

Un microservicio que consulta las reservas de dos canales de venta (`booking` y `airbnb`), las normaliza a una estructura única y las envía a un PMS lento y poco fiable, sin perder ninguna y sin enviar ninguna dos veces. Además, una pantalla sencilla de control.

El enunciado completo está en `BRIEF.md`, si lo tienes; si no, esto es lo esencial:

1. **Normalizar.** `booking` manda fechas `YYYY-MM-DD` y `guest_name`. `airbnb` manda fechas Unix (segundos, en UTC) y `guest.first_name` y `guest.last_name`. Tu servicio las convierte a `{ bookingId, channel, guestName, checkIn, checkOut, totalPrice, currency }` con fechas `YYYY-MM-DD`.
2. **Confirmar rápido.** Cada evento que entrega un canal se confirma en **menos de 500 ms**, antes de tocar el PMS. Si no, el canal lo vuelve a entregar. El PMS tarda de 3 a 5 segundos.
3. **No duplicar.** La misma reserva (mismo `booking_id`) puede llegar varias veces. Nunca debe llegar dos veces al PMS.
4. **Reintentar, pero no para siempre.** El PMS falla al azar. Reintenta con espera entre intentos y, si sigue fallando, marca la reserva como `failed`.
5. **Pantalla.** Lista de reservas con su estado y un botón para forzar la sincronización de las fallidas.

## El tiempo

Tienes **48 horas como máximo** desde que empiezas. Si la das por buena antes, **entrégala antes**: valoramos la calidad de la solución en relación con el tiempo que has invertido, no que agotes el plazo.

## Con qué habla tu servicio

Tu servicio **consulta**: nadie le llama, no expone webhooks ni nada a internet. La dirección y el token salen de las variables de entorno `API_BASE` y `API_TOKEN` (por defecto, el simulador local: `http://localhost:4000` y `wf_local`).

| Llamada | Para qué |
|---|---|
| `GET {API_BASE}/channels/events?limit=1` | Pide lo que ha vencido. Cada evento entregado abre un plazo de 500 ms para confirmarlo |
| `POST {API_BASE}/channels/events/{eventId}/ack` | Lo confirma. Tarde, responde 409 y el evento vuelve a llegar |
| `POST {API_BASE}/pms/reservations` | Envía una reserva normalizada al PMS |
| `GET {API_BASE}/pms/reservations` | Lo que el PMS tiene guardado de ti |

Todas van con `Authorization: Bearer {API_TOKEN}`. **La API se documenta sola**: `GET {API_BASE}/` (con el token) te enseña todo lo que hay, y en `{API_BASE}/swagger` tienes la especificación completa para leerla y probarla desde el navegador. Hay un límite de peticiones por minuto: espera entre consultas (unos 400 ms va bien) y respeta `Retry-After` si te lo piden. Qué formato tiene cada respuesta y qué significa cada error lo descubres llamando.

## El contrato de tu servicio

Esto es lo que esperamos de tu API, **con el lenguaje y el framework que quieras**. El comprobador (`check/check.mjs`) lo verifica.

| Ruta | Respuesta |
|---|---|
| `GET /health` | `200` cuando está listo |
| `GET /` | `200` con la pantalla (HTML) |
| `GET /api/bookings` | `200` con `{ "items": [ ... ] }`, la más recientemente actualizada primero |
| `GET /api/bookings/{id}` | `200` con la reserva, o `404` si no existe |
| `POST /api/bookings/{id}/retry` | `202` si la reserva estaba `failed`; `409` si no lo estaba; `404` si no existe |

Cada reserva lleva: `id` (el `booking_id` del canal), `channel`, `guestName`, `checkIn`, `checkOut`, `totalPrice`, `currency`, `status`, `attempts`, `lastError` (o `null`), `pmsReference` (o `null`) y `updatedAt`. El `status` es uno de `pending`, `syncing`, `synced`, `retrying` o `failed`.

Escucha en el puerto que diga la variable `PORT` (por defecto `3000`).

## Cómo trabajar

- **Usa el lenguaje y el framework que quieras**, tanto en el back como en el front. Puedes cambiar, borrar o reescribir todo lo que hay en esta carpeta menos `mock/` y `check/`. Lo que evaluamos es que funcione y cómo está construido, no que respetes un esqueleto.
- **Arranca el simulador** en una terminal: `cd mock && node --experimental-strip-types src/application/local-main.ts` (Node 22.6 o más, no hay nada que instalar). Es el mismo servicio que ejecutamos nosotros y con las mismas reglas.
- **Comprueba tu trabajo** con `node check/check.mjs`. Arranca el simulador y tu servicio por su cuenta. Antes de la primera ejecución, dile cómo arrancar el tuyo en `check/config.json` (`cwd` y `start`), o pásalo con `--start "tu comando"`. Puedes lanzar solo una parte con `--only 1`, `--only 2` o `--only 3`.
- **No toques `mock/` ni `check/`**: son el banco de pruebas. Lo que hagas contra el servicio de verdad (con el token que te mandamos) queda registrado.
- **Un `Dockerfile` en la raíz** que levante tu servicio con un solo comando.
- **En el `README.md` cuéntanos**: cómo arrancarlo en local, por qué elegiste esa tecnología, **cómo usaste la IA o el agente y con qué estrategia** (qué le pediste, qué aceptaste, qué tiraste y por qué), qué te encontraste por el camino, qué decidiste y qué dejaste fuera a propósito. Esa parte la leemos con atención.

## Consejos para el agente

- Empieza por el contrato y por el `check`: que falle primero y ve haciéndolo pasar escenario a escenario.
- El orden de las cosas importa más que el código: confirmar al canal, después normalizar y encolar, y solo entonces hablar con el PMS.
- Piensa en la concurrencia antes de escribir: dos eventos con el mismo `booking_id` pueden llegar casi a la vez.
- Escribe pruebas de lo que decidas. Preferimos algo pequeño, explicado y que funcione a algo grande y a medias.
