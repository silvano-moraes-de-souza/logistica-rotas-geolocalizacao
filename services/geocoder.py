#=============================================
# PLANEJAMENTO DE ROTA
# NOME: geocoder.py
# DESCRIÇÃO: Serviço de geocodificação usando OpenRouteService API para converter endereços em coordenadas
# AUTOR: SILVANO MORAES DE SOUZA
# VERSÃO: 1.0
#=============================================
import requests
import time
from typing import List, Dict, Optional, Tuple
from config import Config

class OpenRouteServiceGeocoder:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or Config.OPENROUTESERVICE_API_KEY
        self.base_url = "https://api.openrouteservice.org/geocode/search"
        self.headers = {
            "Accept": "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
            "Authorization": self.api_key
        }
    
    def geocodificar_endereco(self, endereco: str) -> Optional[Dict]:
        """
        Converte um endereço em coordenadas lat/lon usando OpenRouteService
        
        Args:
            endereco: String do endereço completo
            
        Returns:
            Dicionário com lat, lon e outros dados ou None se falhar
        """
        if not self.api_key:
            raise ValueError("API key do OpenRouteService não configurada")
        
        params = {
            "text": endereco,
            "size": 1,
            "sources": ["openstreetmap"]
        }
        
        try:
            response = requests.get(self.base_url, params=params, headers=self.headers, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get("features") and len(data["features"]) > 0:
                feature = data["features"][0]
                props = feature.get("properties", {})
                geometry = feature.get("geometry", {})
                
                if geometry.get("type") == "Point":
                    coords = geometry["coordinates"]  # [lon, lat]
                    return {
                        "endereco_original": endereco,
                        "endereco_formatado": props.get("label", endereco),
                        "latitude": coords[1],
                        "longitude": coords[0],
                        "confianca": props.get("confidence", 0),
                        "tipo": props.get("type", "")
                    }
            
            return None
            
        except requests.exceptions.RequestException as e:
            print(f"Erro ao geocodificar '{endereco}': {str(e)}")
            return None
        except Exception as e:
            print(f"Erro inesperado ao geocodificar '{endereco}': {str(e)}")
            return None
    
    def geocodificar_lote(self, enderecos: List[str]) -> List[Dict]:
        """
        Geocodifica uma lista de endereços com controle de rate limiting
        
        Args:
            enderecos: Lista de strings de endereços
            
        Returns:
            Lista de dicionários com coordenadas (None para falhas)
        """
        resultados = []
        
        for i, endereco in enumerate(enderecos):
            # Rate limiting suave para a API gratuita (≈40 requisições/min)
            if i > 0 and i % 10 == 0:
                time.sleep(1)  # Pausa a cada 10 requisições
            
            resultado = self.geocodificar_endereco(endereco)
            resultados.append(resultado)
        
        return resultados

def filtrar_enderecos_validos(geocodificados: List[Optional[Dict]]) -> Tuple[List[Dict], List[Dict]]:
    """
    Separa endereços geocodificados com sucesso dos que falharam
    
    Args:
        geocodificados: Lista de resultados da geocodificação (pode conter None)
        
    Returns:
        Tupla (enderecos_validos, enderecos_falhos)
    """
    validos = []
    falhos = []
    
    for i, geo in enumerate(geocodificados):
        if geo is not None:
            validos.append(geo)
        else:
            # Tentamos obter o endereço original de algum lugar?
            # Como não temos o original aqui, vamos apenas marcar como falho sem detalhes
            falhos.append({"indice": i, "erro": "Geocodificação falhou"})
    
    return validos, falhos

# Instância global para reutilização (em serverless, pode ser recriada a cada chamada)
geocoder_service = OpenRouteServiceGeocoder()