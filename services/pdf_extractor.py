#=============================================
# PLANEJAMENTO DE ROTA
# NOME: pdf_extractor.py
# DESCRIÇÃO: Módulo para extração de dados de documentos PDF, focado em identificar endereços e informações de cargas
# AUTOR: SILVANO MORAES DE SOUZA
# VERSÃO: 1.0
#=============================================
import fitz  # PyMuPDF
import re
from typing import List, Dict

def extrair_enderecos_pdf(pdf_content: bytes) -> List[Dict[str, str]]:
    """
    Extrai endereços de entrega/remetente de PDFs de Notas Fiscais
    
    Args:
        pdf_content: Conteúdo binário do PDF
        
    Returns:
        Lista de dicionários com endereços extraídos
    """
    enderecos = []
    
    # Abre o PDF a partir do conteúdo em memória
    doc = fitz.open(stream=pdf_content, filetype="pdf")
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text()
        
        # Padrões comuns para identificar campos de destinatário/remetente em NFs
        patterns = [
            r"DESTINATÁRI[O|A][:\s]*([^\n]+)",
            r"REMETENTE[:\s]*([^\n]+)",
            r"DEST[:\s]*([^\n]+)",
            r"REM[:\s]*([^\n]+)",
            r"NOME/RAZÃO SOCIAL[:\s]*([^\n]+)",
            r"CLIENTE[:\s]*([^\n]+)"
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            for match in matches:
                # Limpa e normaliza o endereço
                endereco_limpo = match.strip()
                if endereco_limpo and len(endereco_limpo) > 10:  # Filtra ruídos
                    # Remove quebras de linha e espaços extras
                    endereco_limpo = re.sub(r'\s+', ' ', endereco_limpo)
                    
                    # Verifica se parece um endereço (contém número, rua, etc.)
                    if re.search(r'\d+', endereco_limpo) and len(endereco_limpo) > 15:
                        enderecos.append({
                            "endereco": endereco_limpo,
                            "pagina": page_num + 1,
                            "fonte": "nota_fiscal"
                        })
    
    doc.close()
    
    # Remove duplicados mantendo ordem
    enderecos_unicos = []
    vistos = set()
    for end in enderecos:
        if end["endereco"] not in vistos:
            vistos.add(end["endereco"])
            enderecos_unicos.append(end)
    
    return enderecos_unicos

def processar_lote_pdfs(pdf_files: List[Dict[str, bytes]]) -> List[Dict[str, str]]:
    """
    Processa um lote de PDFs e extrai todos os endereços
    
    Args:
        pdf_files: Lista de dicionários com {'nome': str, 'conteudo': bytes}
        
    Returns:
        Lista consolidada de endereços únicos
    """
    todos_enderecos = []
    
    for pdf_file in pdf_files:
        try:
            enderecos = extrair_enderecos_pdf(pdf_file['conteudo'])
            for end in enderecos:
                end['arquivo_origem'] = pdf_file['nome']
            todos_enderecos.extend(enderecos)
        except Exception as e:
            # Log do erro mas continua processando outros PDFs
            print(f"Erro ao processar {pdf_file['nome']}: {str(e)}")
            continue
    
    return todos_enderecos