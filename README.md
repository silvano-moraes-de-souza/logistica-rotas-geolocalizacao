# Sistema de Logística: Otimização de Rotas + Monitoramento de Entregas

Plataforma completa de roteirização e rastreamento de entregas: extrai pedidos de PDFs, geocodifica endereços, calcula a rota ótima considerando janelas de entrega e dias úteis, e acompanha a execução em campo por um app mobile offline-first com leitura de QR Code.

> Versão de demonstração/estudo. Endereços, dados e identificadores reais foram substituídos por valores fictícios.

## Arquitetura

O projeto tem dois módulos independentes que se complementam:

```
[1] ROTEIRIZAÇÃO (web)
PDF de pedidos → extração (Python) → geocodificação → matriz de distâncias
→ otimização de rota (OpenRouteService) → mapa interativo + custo de combustível

[2] MONITORAMENTO (mobile + API)
App do motorista (React Native/Expo, offline-first, SQLite local)
→ sincronização com API Express → QR Code por pacote → status em tempo quase real
```

## Stack

| Camada | Tecnologia |
|---|---|
| Extração de dados | Python (parser de PDFs de pedidos) |
| Geocodificação | Python + APIs de geocoding, normalização de coordenadas |
| Otimização de rotas | OpenRouteService (matriz de distâncias + otimização), fallback Haversine, cálculo de dias úteis com feriados nacionais (`holidays`) |
| Backend web | Node.js + Express (`/api/process`, `/api/optimize`, `/api/fuel-price`) |
| Backend monitoramento | Node.js + Express, autenticação JWT, rotas de viagens, pacotes, QR Code e sincronização |
| App do motorista | React Native (Expo) + SQLite local com sincronização incremental (funciona sem sinal) |
| Deploy | Vercel (módulo web) |

## Destaques técnicos

- **Otimização real de rotas**: integração com a API de otimização do OpenRouteService a partir de uma matriz de distâncias, com estimativa de tempo de viagem e agendamento respeitando fins de semana e feriados.
- **Offline-first de verdade**: o app do motorista grava tudo em SQLite local e sincroniza quando há conexão — desenhado para áreas de cobertura ruim.
- **Rastreabilidade por pacote**: cada volume recebe QR Code; a leitura atualiza o status da entrega na API.
- **Custo operacional**: endpoint de preço de combustível para estimar custo da rota planejada.

## Como rodar (módulo web)

```bash
npm install
node server.js            # http://localhost:3000
# POST /api/process   → recebe pedidos (ver exemplo_entrada.json)
# POST /api/optimize  → retorna rota otimizada
```

## Como rodar (monitoramento)

```bash
cd monitoramento-entrega/server && npm install && npm start
cd ../app && npm install && npx expo start
```

## Estrutura

```
services/               Extração de PDF, geocodificação e otimização (Python)
api/                    Endpoints do módulo web (Node)
monitoramento-entrega/
  server/               API Express (JWT, viagens, pacotes, QR, sync)
  app/                  App React Native/Expo do motorista (offline-first)
```

## Autor

Silvano Moraes de Souza — Analista de Dados | Python, SQL, ETL, automação de processos
[LinkedIn](https://linkedin.com/in/silvano-moraes) · [Portfólio](https://silvanomsouza.vercel.app/)
