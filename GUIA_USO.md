#=============================================
# PLANEJAMENTO DE ROTA
# NOME: GUIA_USO.md
# DESCRIÇÃO: Guia detalhado de uso do sistema com instruções passo a passo para operadores
# AUTOR: SILVANO MORAES DE SOUZA
# VERSÃO: 1.0
#=============================================
# Guia Prático de Uso - Sistema de Logística Efêmero

## Pré-requisitos

1. **Python 3.8+** instalado
2. **Chave da API OpenRouteService** (gratuita): https://openrouteservice.org/dev/#/signup
3. **Conta na Vercel** (para deploy serverless) - opcional

## Instalação Local

```bash
# Clone ou baixe os arquivos para uma pasta
cd "C:\Users\LENOVO\Documents\PROJETO Dashboard\LOGISTICA - ROTA"

# Instale as dependências
pip install -r requirements.txt
```

## Configuração

Crie um arquivo `.env` na raiz do projeto:

```env
OPENROUTESERVICE_API_KEY=sua_chave_aqui
SUPABASE_URL=https://seu-projeto.supabase.co  # opcional
SUPABASE_KEY=sua_chave_supabase  # opcional
```

Ou defina como variáveis de ambiente no sistema.

## Modo 1: Execução Local (CLI)

### Preparando os PDFs

1. Crie um arquivo JSON de entrada com seus PDFs convertidos em base64:

```bash
# Exemplo para converter um PDF para base64 no PowerShell:
$base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes("c:\caminho\nota.pdf"))
Write-Output $base64 > nota_base64.txt
```

2. Monte o arquivo `entrada.json`:

```json
{
  "pdfs": [
    {
      "nome": "nota_fiscal_001.pdf",
      "dados_base64": "JVBERi0xLjQK..."
    },
    {
      "nome": "nota_fiscal_002.pdf",
      "dados_base64": "JVBERi0xLjQK..."
    }
  ]
}
```

3. Execute o processamento:

```bash
python main.py entrada.json saida.json
```

### Resultado

O arquivo `saida.json` conterá:

```json
{
  "sucesso": true,
  "timestamp": "2026-04-28T16:30:00",
  "estatisticas": {
    "processamento": {
      "total_pdfs_recebidos": 2,
      "total_enderecos_extraidos": 15,
      "enderecos_geocodificados_sucesso": 14,
      "enderecos_falha_geocodificacao": 1,
      "taxa_sucesso_geocodificacao": 93.33
    },
    "roteirizacao": {
      "dias_necessarios": 1,
      "total_entregas_agendadas": 14,
      "dentro_horario_trabalho": true
    },
    "falhas": {
      "enderecos_nao_encontrados": [...]
    }
  },
  "rotas": [
    {
      "data": "2026-04-28",
      "dentro_limite": true,
      "total_paradas": 14,
      "rota_otimizada": [
        {
          "local": {"endereco_formatado": "Rua XV de Novembro, 350..."},
          "tipo": "entrega",
          "chegada": "2026-04-28T08:15:00",
          "saida": "2026-04-28T08:25:00"
        }
      ]
    }
  ]
}
```

## Modo 2: Deploy na Vercel (Serverless)

### 1. Instale a CLI da Vercel

```bash
npm i -g vercel
```

### 2. Configure a variável de ambiente

```bash
vercel secrets add openrouteservice_api_key "sua_chave_aqui"
```

### 3. Faça o deploy

```bash
vercel --prod
```

### 4. Use o endpoint

```bash
curl -X POST https://seu-projeto.vercel.app/api/rotas \
  -H "Content-Type: application/json" \
  -d @entrada.json
```

## Modo 3: Supabase (Opcional)

Se quiser persistir os dados no Supabase:

1. **Crie o projeto no Supabase**
2. **Execute o SQL** em `supabase_schema.sql` no SQL Editor
3. **Configure as variáveis** no `.env` ou Vercel:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
4. **Use o módulo** `supabase_integration.py` para salvar/carregar dados

## Testando o Sistema

Execute os testes básicos:

```bash
python test_system.py
```

Esperado:
```
============================================================
TESTES DO SISTEMA DE LOGÍSTICA EFÊMERO
============================================================

Testando importações...
  ✅ config.py
  ✅ services/pdf_extractor.py
  ✅ services/geocoder.py
  ✅ services/route_optimizer.py
  ✅ main.py
  ✅ supabase_integration.py
Todas as importações OK!

...
🎉 Todos os testes passaram! Sistema pronto para uso.
```

## Fluxo Completo de Processamento

```
┌─────────────────┐
│  Lote de PDFs   │
│  (até 50 NFs)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PDF Extractor   │ ← Extrai endereços (sem salvar PDFs)
│ (PyMuPDF)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Geocodificação  │ ← OpenRouteService API
│ (lat/lon)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Route Optimizer │ ← TSP (Vizinho Mais Próximo)
│ + Restrição     │ ← Verifica horário 08:00-16:30
│   de Horário    │ ← Dilui para próximo dia útil se exceder
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Resultado     │ ← JSON com rotas por dia
│   (rotas/dia)   │ ← Estatísticas + Endereços falhos
└─────────────────┘
```

## Regras de Negócio Implementadas

✅ **Limite de 50 PDFs** por lote  
✅ **Sem armazenamento** de PDFs (processamento efêmero)  
✅ **Horário de trabalho**: Seg-Sex, 08:00-16:30  
✅ **Tempo de retorno**: 30 min para conferência na base (Sorocaba)  
✅ **Tempo de entrega**: 10 min por parada  
✅ **Diluição automática**: Excesso vai para próximo dia útil  
✅ **Feriados brasileiros**: Considerados na diluição  
✅ **Fins de semana**: Pulados automaticamente  
✅ **Tratamento de erros**: Endereços não encontrados reportados separadamente  

## Troubleshooting

### Erro: "OPENROUTESERVICE_API_KEY não configurada"
- Verifique se a variável de ambiente está definida
- Para teste local, crie um arquivo `.env` ou defina no sistema

### Erro: "Nenhum endereço encontrado nos PDFs"
- Verifique se os PDFs são Notas Fiscais reais
- O extrator busca padrões "DESTINATÁRIO", "REMETENTE", etc.
- PDFs escaneados (imagens) não terão texto extraído

### Erro de geocodificação
- Verifique sua conexão com internet
- A API gratuita tem limite de requisições
- O sistema pausa 1 segundo a cada 10 requisições

### Erro no deploy Vercel
- Verifique se o `vercel.json` está correto
- Confirme que a chave API está configurada nos secrets da Vercel
- Verifique os logs: `vercel logs`

## Próximos Passos

1. ✅ Testar com PDFs reais de Notas Fiscais
2. ✅ Validar precisão da extração de endereços
3. ✅ Ajustar velocidade média (`Config.VELOCIDADE_MEDIA_KMH`) conforme região
4. ✅ Monitorar limites da API gratuita do OpenRouteService
5. ✅ Implementar cache de endereços (se necessário)

---

**Suporte**: Consulte o arquivo `CIADOS.MD` para histórico detalhado de desenvolvimento.
