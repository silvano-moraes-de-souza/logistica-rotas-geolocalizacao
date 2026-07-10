#=============================================
# PLANEJAMENTO DE ROTA
# NOME: route_optimizer.py
# DESCRIÇÃO: Algoritmos de otimização de rotas usando TSP e APIs externas como OpenRouteService
# AUTOR: SILVANO MORAES DE SOUZA
# VERSÃO: 1.0
#=============================================
import math
import requests
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta
import holidays
from config import Config

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    return R * c

def _normalizar_coords(loc: Dict) -> Dict:
    """Normaliza coordenadas para formato {latitude, longitude}"""
    return {
        "latitude": loc.get("latitude") or loc.get("lat"),
        "longitude": loc.get("longitude") or loc.get("lon")
    }

def obter_matriz_ors(locais: List[Dict]) -> Optional[List[List[float]]]:
    """
    Obtém matriz de distâncias via OpenRouteService Matrix API
    Retorna matriz NxN em km ou None se falhar
    Limite: 500/dia, 40/min
    """
    api_key = Config.OPENROUTESERVICE_API_KEY
    if not api_key or len(locais) < 2:
        return None
    
    locais_norm = [_normalizar_coords(loc) for loc in locais]
    
    url = "https://api.openrouteservice.org/v2/matrix/driving-car"
    headers = {
        "Authorization": api_key,
        "Content-Type": "application/json"
    }
    body = {
        "locations": [[loc["longitude"], loc["latitude"]] for loc in locais_norm],
        "metrics": ["distance"],
        "units": "km"
    }
    
    try:
        resp = requests.post(url, json=body, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data["distances"]
    except Exception as e:
        print(f"Erro ORS Matrix: {e}")
        return None

def obter_optimization_ors(base: Dict, entregas: List[Dict]) -> Optional[Dict]:
    """
    Usa ORS Optimization API para roteirização completa com restrições
    Limite: 500/dia, 40/min
    """
    api_key = Config.OPENROUTESERVICE_API_KEY
    if not api_key or not entregas:
        return None
    
    base_n = _normalizar_coords(base)
    entregas_n = [_normalizar_coords(e) for e in entregas]
    
    # Converte horários para segundos desde meia-noite
    h_inicio = datetime.strptime(Config.WORKING_HOURS['inicio'], "%H:%M")
    h_fim = datetime.strptime(Config.WORKING_HOURS['fim'], "%H:%M")
    inicio_sec = h_inicio.hour * 3600 + h_inicio.minute * 60
    fim_sec = h_fim.hour * 3600 + h_fim.minute * 60
    service_sec = Config.TEMPO_DESCARGA_MIN * 60
    
    url = "https://api.openrouteservice.org/optimization"
    headers = {
        "Authorization": api_key,
        "Content-Type": "application/json"
    }
    
    jobs = []
    for i, entrega in enumerate(entregas_n):
        jobs.append({
            "id": i + 1,
            "location": [entrega["longitude"], entrega["latitude"]],
            "service": service_sec,
            "time_windows": [[inicio_sec, fim_sec]]
        })
    
    vehicles = [{
        "id": 1,
        "profile": "driving-car",
        "start": [base_n["longitude"], base_n["latitude"]],
        "end": [base_n["longitude"], base_n["latitude"]],
        "time_window": [inicio_sec, fim_sec]
    }]
    
    body = {"jobs": jobs, "vehicles": vehicles}
    
    try:
        resp = requests.post(url, json=body, headers=headers, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"Erro ORS Optimization: {e}")
        return None

def calcular_tempo_viagem(distancia_km: float) -> float:
    return distancia_km / Config.VELOCIDADE_MEDIA_KMH

def proximo_dia_util(data: datetime.date) -> datetime.date:
    br_holidays = holidays.Brazil(state='SP')
    proximo = data + timedelta(days=1)
    while proximo.weekday() >= 5 or proximo in br_holidays:
        proximo += timedelta(days=1)
    return proximo

def construir_matriz_distancias(locais: List[Dict]) -> List[List[float]]:
    n = len(locais)
    
    # Tenta usar ORS Matrix API primeiro
    if Config.OPENROUTESERVICE_API_KEY and n >= 2:
        matriz_ors = obter_matriz_ors(locais)
        if matriz_ors:
            return matriz_ors
    
    # Fallback: Haversine
    matriz = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                matriz[i][j] = haversine_distance(
                    locais[i]['latitude'], locais[i]['longitude'],
                    locais[j]['latitude'], locais[j]['longitude']
                )
    return matriz

def resolver_tsp_vizinho_mais_proximo(matriz_distancias: List[List[float]], inicio_idx: int = 0) -> List[int]:
    n = len(matriz_distancias)
    nao_visitados = set(range(n))
    nao_visitados.remove(inicio_idx)
    caminho = [inicio_idx]
    atual = inicio_idx
    while nao_visitados:
        proximo = min(nao_visitados, key=lambda idx: matriz_distancias[atual][idx])
        caminho.append(proximo)
        nao_visitados.remove(proximo)
        atual = proximo
    caminho.append(inicio_idx)
    return caminho

def simular_rota_com_tempo(
    locais: List[Dict],
    ordem_indices: List[int],
    data_base: datetime.date
) -> Tuple[List[Dict], List[Dict]]:
    hora_inicio_dt = datetime.combine(data_base, datetime.strptime(Config.WORKING_HOURS['inicio'], "%H:%M").time())
    hora_limite = datetime.combine(data_base, datetime.strptime(Config.WORKING_HOURS['fim'], "%H:%M").time())

    tempo_atual = hora_inicio_dt
    paradas_com_tempo = []
    excedentes = []

    base_idx = 0

    for i, idx in enumerate(ordem_indices):
        if idx == base_idx:
            continue

        local_anterior = locais[ordem_indices[i-1]] if i > 0 else locais[base_idx]
        dist_ate_n = haversine_distance(
            local_anterior['latitude'], local_anterior['longitude'],
            locais[idx]['latitude'], locais[idx]['longitude']
        )
        tempo_viagem_ate_n = calcular_tempo_viagem(dist_ate_n)

        dist_n_base = haversine_distance(
            locais[idx]['latitude'], locais[idx]['longitude'],
            locais[base_idx]['latitude'], locais[base_idx]['longitude']
        )
        tempo_viagem_n_base = calcular_tempo_viagem(dist_n_base)

        tempo_acumulado = (tempo_atual - hora_inicio_dt).total_seconds() / 3600
        tempo_total_n = tempo_acumulado + tempo_viagem_ate_n + (Config.TEMPO_DESCARGA_MIN / 60) + tempo_viagem_n_base
        hora_fim_com_n = hora_inicio_dt + timedelta(hours=tempo_total_n)

        if hora_fim_com_n > hora_limite:
            excedentes.append(locais[idx])
            continue

        chegada = tempo_atual + timedelta(hours=tempo_viagem_ate_n)
        saida = chegada + timedelta(minutes=Config.TEMPO_DESCARGA_MIN)
        tempo_atual = saida

        paradas_com_tempo.append({
            "local": locais[idx],
            "indice_original": idx,
            "tipo": "entrega",
            "chegada": chegada,
            "saida": saida,
            "tempo_viagem_desde_anterior": tempo_viagem_ate_n,
            "tempo_descarga": Config.TEMPO_DESCARGA_MIN
        })

    if paradas_com_tempo:
        ultima_parada = paradas_com_tempo[-1]["local"]
        dist_ultima_base = haversine_distance(
            ultima_parada['latitude'], ultima_parada['longitude'],
            locais[base_idx]['latitude'], locais[base_idx]['longitude']
        )
        tempo_viagem_ultima_base = calcular_tempo_viagem(dist_ultima_base)
        chegada_base = tempo_atual + timedelta(hours=tempo_viagem_ultima_base)
    else:
        chegada_base = hora_inicio_dt

    fim_conferencia = chegada_base + timedelta(minutes=Config.TEMPO_RETORNO_BASE_MIN)

    paradas_com_tempo.append({
        "local": locais[base_idx],
        "indice_original": base_idx,
        "tipo": "retorno_base",
        "chegada": chegada_base,
        "fim_conferencia": fim_conferencia,
        "saida": fim_conferencia,
        "tempo_viagem_desde_anterior": calcular_tempo_viagem(haversine_distance(
            paradas_com_tempo[-1]["local"]['latitude'], paradas_com_tempo[-1]["local"]['longitude'],
            locais[base_idx]['latitude'], locais[base_idx]['longitude']
        )) if paradas_com_tempo else 0,
        "tempo_servico": Config.TEMPO_RETORNO_BASE_MIN
    })

    return paradas_com_tempo, excedentes

def dividir_rota_por_dia(
    enderecos_geocodificados: List[Dict],
    base_info: Dict,
    data_inicial: datetime.date = None
) -> List[Dict]:
    if not enderecos_geocodificados:
        return []

    if data_inicial is None:
        data_inicial = datetime.now().date()

    data_atual = data_inicial
    if data_atual.weekday() >= 5 or data_atual in holidays.Brazil(state='SP'):
        data_atual = proximo_dia_util(data_atual)

    resultado_dias = []
    enderecos_restantes = enderecos_geocodificados[:]

    while enderecos_restantes:
        # Tenta usar ORS Optimization API primeiro (mais preciso)
        if Config.OPENROUTESERVICE_API_KEY and len(enderecos_restantes) <= 100:
            resultado_ors = obter_optimization_ors(base_info, enderecos_restantes)
            if resultado_ors and "routes" in resultado_ors:
                rota = resultado_ors["routes"][0]
                paradas = []
                tempo_atual = datetime.combine(data_atual, datetime.strptime(Config.WORKING_HOURS['inicio'], "%H:%M").time())
                
                for step in rota.get("steps", []):
                    if step["type"] == "job":
                        job_idx = step["job"] - 1
                        entrega = enderecos_restantes[job_idx]
                        chegada = tempo_atual + timedelta(seconds=step.get("arrival", 0))
                        saida = chegada + timedelta(minutes=Config.TEMPO_DESCARGA_MIN)
                        tempo_atual = saida
                        paradas.append({
                            "local": entrega,
                            "indice_original": job_idx,
                            "tipo": "entrega",
                            "chegada": chegada,
                            "saida": saida,
                            "tempo_viagem_desde_anterior": step.get("distance", 0) / 1000 / Config.VELOCIDADE_MEDIA_KMH,
                            "tempo_descarga": Config.TEMPO_DESCARGA_MIN
                        })
                
                # Retorno à base
                fim_conferencia = tempo_atual + timedelta(minutes=Config.TEMPO_RETORNO_BASE_MIN)
                paradas.append({
                    "local": base_info,
                    "indice_original": -1,
                    "tipo": "retorno_base",
                    "chegada": tempo_atual,
                    "fim_conferencia": fim_conferencia,
                    "saida": fim_conferencia,
                    "tempo_viagem_desde_anterior": 0,
                    "tempo_servico": Config.TEMPO_RETORNO_BASE_MIN
                })
                
                entregas_hoje = [p["local"] for p in paradas if p["tipo"] == "entrega"]
                resultado_dias.append({
                    "data": data_atual,
                    "enderecos_originais": entregas_hoje,
                    "rota_otimizada": paradas,
                    "dentro_limite": True,
                    "total_paradas": len(entregas_hoje)
                })
                break
        
        # Fallback: TSP com matriz Haversine/ORS Matrix
        locais = [base_info] + enderecos_restantes
        matriz_dist = construir_matriz_distancias(locais)
        ordem_tsp = resolver_tsp_vizinho_mais_proximo(matriz_dist, inicio_idx=0)

        paradas, excedentes = simular_rota_com_tempo(locais, ordem_tsp, data_atual)

        entregas_hoje = [p["local"] for p in paradas if p["tipo"] == "entrega"]

        resultado_dias.append({
            "data": data_atual,
            "enderecos_originais": entregas_hoje,
            "rota_otimizada": paradas,
            "dentro_limite": len(excedentes) == 0,
            "total_paradas": len(entregas_hoje)
        })

        if not excedentes:
            break

        enderecos_restantes = excedentes
        data_atual = proximo_dia_util(data_atual)

    return resultado_dias

def processar_rotas(
    enderecos_extraidos: List[Dict],
    geocodificados: List[Dict]
) -> Dict:
    locais_validos = [g for g in geocodificados if g is not None]

    if not locais_validos:
        return {
            "sucesso": False,
            "mensagem": "Nenhum endereço válido para roteirização",
            "rotas": [],
            "estatisticas": {
                "total_enderecos": len(enderecos_extraidos),
                "enderecos_geocodificados": 0,
                "dias_necessarios": 0
            }
        }

    rotas_dias = dividir_rota_por_dia(locais_validos, Config.BASE_LOCATION)

    total_enderecos = len(enderecos_extraidos)
    total_geocodificados = len(locais_validos)
    total_dias = len(rotas_dias)
    total_entregas = sum(dia["total_paradas"] for dia in rotas_dias)

    return {
        "sucesso": True,
        "mensagem": f"Roteirização concluída em {total_dias} dia(s)",
        "rotas": rotas_dias,
        "estatisticas": {
            "total_enderecos": total_enderecos,
            "enderecos_geocodificados": total_geocodificados,
            "taxa_sucesso_geocodificacao": round(total_geocodificados / total_enderecos * 100, 2) if total_enderecos > 0 else 0,
            "dias_necessarios": total_dias,
            "total_entregas_agendadas": total_entregas
        }
    }
